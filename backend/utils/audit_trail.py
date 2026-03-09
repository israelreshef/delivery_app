"""
Global Object History Audit Trail — Regulatory Compliance Module
================================================================
Automatically tracks every INSERT, UPDATE, and DELETE operation across 
ALL database models using SQLAlchemy event listeners.

This is a legal requirement for financial systems in Israel (ניהול ספרים),
and aligns with GDPR Article 30 (Records of Processing Activities).

Usage:
    Call `register_audit_listeners(db)` once during app initialization.
"""

from extensions import db
from datetime import datetime
from flask import has_request_context, request
import json
import logging

logger = logging.getLogger(__name__)

# Tables to EXCLUDE from audit tracking (high-frequency / non-critical)
EXCLUDED_TABLES = {
    'audit_logs',        # Prevent recursive self-logging
    'object_history',    # Prevent recursive self-logging
    'sessions',          # Session tokens change too frequently
}


class ObjectHistory(db.Model):
    """
    Universal audit record for any database object change.
    Every row represents a single INSERT / UPDATE / DELETE event.
    """
    __tablename__ = 'object_history'
    __table_args__ = {'extend_existing': True}

    id = db.Column(db.Integer, primary_key=True)
    table_name = db.Column(db.String(100), nullable=False, index=True)
    record_id = db.Column(db.String(50), nullable=False, index=True)
    action = db.Column(db.Enum('INSERT', 'UPDATE', 'DELETE', name='audit_action_type'), nullable=False)
    
    # Who made the change (extracted from JWT if available)
    changed_by_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    
    # JSON blob: {"field": {"old": "...", "new": "..."}}
    changes = db.Column(db.Text, nullable=True)
    
    # Additional context
    ip_address = db.Column(db.String(45), nullable=True)
    user_agent = db.Column(db.String(255), nullable=True)
    
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    def __repr__(self):
        return f'<ObjectHistory {self.action} {self.table_name}:{self.record_id} by user {self.changed_by_user_id}>'


def _get_current_user_id():
    """Safely extract the current user ID from the JWT token in the request context."""
    try:
        if has_request_context():
            from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
            try:
                verify_jwt_in_request(optional=True)
                identity = get_jwt_identity()
                return identity
            except Exception:
                pass
    except Exception:
        pass
    return None


def _get_request_metadata():
    """Extract IP address and User-Agent from the current request."""
    ip = None
    ua = None
    try:
        if has_request_context():
            ip = request.remote_addr
            ua = str(request.user_agent)[:255] if request.user_agent else None
    except Exception:
        pass
    return ip, ua


def _serialize_value(val):
    """Convert a value to a JSON-serializable format."""
    if val is None:
        return None
    if isinstance(val, datetime):
        return val.isoformat()
    if isinstance(val, (int, float, bool, str)):
        return val
    try:
        return str(val)
    except Exception:
        return '<unserializable>'


def _record_history(session, action, target):
    """Create an ObjectHistory entry for a given target object."""
    try:
        table_name = target.__tablename__
        
        if table_name in EXCLUDED_TABLES:
            return
        
        # Get the primary key
        mapper = target.__class__.__mapper__
        pk_cols = mapper.primary_key
        record_id = str(getattr(target, pk_cols[0].name, '?'))
        
        changes = {}
        
        if action == 'UPDATE':
            # Track which fields actually changed
            from sqlalchemy import inspect as sa_inspect
            state = sa_inspect(target)
            for attr in state.attrs:
                hist = attr.history
                if hist.has_changes():
                    old_val = hist.deleted[0] if hist.deleted else None
                    new_val = hist.added[0] if hist.added else None
                    changes[attr.key] = {
                        'old': _serialize_value(old_val),
                        'new': _serialize_value(new_val)
                    }
            
            # Skip if nothing actually changed
            if not changes:
                return
                
        elif action == 'INSERT':
            # Record all initial values
            for col in mapper.column_attrs:
                val = getattr(target, col.key, None)
                if val is not None:
                    changes[col.key] = {'new': _serialize_value(val)}
                    
        elif action == 'DELETE':
            # Record final snapshot before deletion
            for col in mapper.column_attrs:
                val = getattr(target, col.key, None)
                if val is not None:
                    changes[col.key] = {'old': _serialize_value(val)}

        user_id = _get_current_user_id()
        ip, ua = _get_request_metadata()

        history_entry = ObjectHistory(
            table_name=table_name,
            record_id=record_id,
            action=action,
            changed_by_user_id=user_id,
            changes=json.dumps(changes, ensure_ascii=False, default=str),
            ip_address=ip,
            user_agent=ua
        )
        session.add(history_entry)
        
    except Exception as e:
        # Never let audit trail errors break the actual operation
        logger.warning(f"Audit trail error ({action} on {getattr(target, '__tablename__', '?')}): {e}")


def _after_insert(mapper, connection, target):
    session = db.session.object_session(target)
    if session:
        _record_history(session, 'INSERT', target)


def _after_update(mapper, connection, target):
    session = db.session.object_session(target)
    if session:
        _record_history(session, 'UPDATE', target)


def _after_delete(mapper, connection, target):
    session = db.session.object_session(target)
    if session:
        _record_history(session, 'DELETE', target)


def register_audit_listeners(app_db):
    """
    Register SQLAlchemy event listeners on ALL mapped models.
    Call this once during app initialization (after db.init_app).
    """
    from sqlalchemy import event
    
    # Listen on the Session level for all mappers
    event.listen(db.session.__class__, 'after_flush', _after_flush_handler)
    
    logger.info(" Global Audit Trail registered on all database models.")


def _after_flush_handler(session, flush_context):
    """
    After each flush, iterate over all new, dirty (updated), and deleted objects
    and record their changes in the ObjectHistory table.
    """
    try:
        for obj in list(session.new):
            if hasattr(obj, '__tablename__') and obj.__tablename__ not in EXCLUDED_TABLES:
                _record_history(session, 'INSERT', obj)
        
        for obj in list(session.dirty):
            if hasattr(obj, '__tablename__') and obj.__tablename__ not in EXCLUDED_TABLES:
                _record_history(session, 'UPDATE', obj)
        
        for obj in list(session.deleted):
            if hasattr(obj, '__tablename__') and obj.__tablename__ not in EXCLUDED_TABLES:
                _record_history(session, 'DELETE', obj)
    except Exception as e:
        logger.warning(f"Audit trail flush error: {e}")
