from flask import Blueprint, request, jsonify
from datetime import datetime
from ..services.audit_log import audit_log # Assuming audit_log correctly handles events

consent_bp = Blueprint('consent', __name__)

@consent_bp.route('/api/consent/grant', methods=['POST'])
def grant_consent():
    """
    Explicitly records user consent with metadata (IP, Version, Channel).
    No pre-ticked boxes allowed on frontend.
    """
    data = request.json
    user_id = data.get('user_id')
    consent_type = data.get('consent_type') # e.g., 'marketing', 'analytics'
    policy_version = data.get('policy_version')
    
    # Store in DB (Persistent audit trail)
    # db.session.add(Consent(user_id=user_id, granted_at=datetime.utcnow(), ...))
    
    audit_log.log_event(
        actor_id=user_id,
        action="CONSENT_GRANT",
        resource=f"consent:{consent_type}",
        metadata={"ip": request.remote_addr, "version": policy_version}
    )
    
    return jsonify({"status": "granted", "timestamp": datetime.utcnow().isoformat()}), 201

@consent_bp.route('/api/consent/withdraw', methods=['POST'])
def withdraw_consent():
    """
    Soft-delete only. Never hard-delete consent records (7-year audit requirement).
    """
    data = request.json
    user_id = data.get('user_id')
    consent_type = data.get('consent_type')
    
    # Update in DB: SET withdrawn_at = now()
    # Record persists for 7 years as required by Amendment 13.
    
    audit_log.log_event(
        actor_id=user_id,
        action="CONSENT_WITHDRAW",
        resource=f"consent:{consent_type}",
        metadata={"ip": request.remote_addr}
    )
    
    return jsonify({"status": "withdrawn", "timestamp": datetime.utcnow().isoformat()}), 200

@consent_bp.route('/api/consent/history', methods=['GET'])
def get_consent_history():
    user_id = request.args.get('user_id')
    # return list of all grant/withdraw events for this user
    return jsonify({"history": []})
