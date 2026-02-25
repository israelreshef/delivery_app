"""
Archive API Blueprint — Object History Timeline
================================================
Exposes the audit trail data for any database object so the Admin UI
can render a visual timeline of who changed what, and when.
"""

from flask import Blueprint, request, jsonify
from utils.decorators import token_required, role_required
from utils.audit_trail import ObjectHistory
import json

archive_bp = Blueprint('archive', __name__)


@archive_bp.route('/<table_name>/<record_id>', methods=['GET'])
@token_required
@role_required(['admin', 'finance_admin', 'operations_manager'])
def get_object_history(current_user, table_name, record_id):
    """
    Retrieve the full change history for a specific database object.
    Returns a chronological timeline of all INSERT, UPDATE, DELETE events.
    
    Query params:
    - limit: Number of records (default: 50)
    - offset: Pagination offset (default: 0)
    """
    try:
        limit = request.args.get('limit', 50, type=int)
        offset = request.args.get('offset', 0, type=int)
        
        history = ObjectHistory.query.filter_by(
            table_name=table_name,
            record_id=str(record_id)
        ).order_by(ObjectHistory.timestamp.desc()).offset(offset).limit(limit).all()
        
        total = ObjectHistory.query.filter_by(
            table_name=table_name,
            record_id=str(record_id)
        ).count()
        
        return jsonify({
            'table': table_name,
            'record_id': record_id,
            'total': total,
            'history': [{
                'id': h.id,
                'action': h.action,
                'changed_by': h.changed_by_user_id,
                'changes': json.loads(h.changes) if h.changes else {},
                'ip_address': h.ip_address,
                'timestamp': h.timestamp.isoformat()
            } for h in history]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@archive_bp.route('/recent', methods=['GET'])
@token_required
@role_required(['admin', 'finance_admin'])
def get_recent_changes(current_user):
    """
    Retrieve the most recent system-wide changes (activity feed).
    Useful for the admin dashboard overview.
    """
    try:
        limit = request.args.get('limit', 30, type=int)
        
        recent = ObjectHistory.query.order_by(
            ObjectHistory.timestamp.desc()
        ).limit(limit).all()
        
        return jsonify([{
            'id': h.id,
            'table': h.table_name,
            'record_id': h.record_id,
            'action': h.action,
            'changed_by': h.changed_by_user_id,
            'changes': json.loads(h.changes) if h.changes else {},
            'timestamp': h.timestamp.isoformat()
        } for h in recent]), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
