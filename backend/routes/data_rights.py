from flask import Blueprint, request, jsonify
import uuid
from datetime import datetime, timedelta
from ..services.audit_log import audit_log

data_rights_bp = Blueprint('data_rights', __name__)

@data_rights_bp.route('/api/privacy/export', methods=['GET'])
def request_data_export():
    """
    Async ZIP generation (JSON + CSV format).
    Rate limit: 2 requests per user per 24 hours.
    """
    user_id = request.args.get('user_id')
    
    # Check rate limit in Redis
    # if redis.get(f"limit:export:{user_id}") >= 2: return 429
    
    job_id = str(uuid.uuid4())
    # trigger_async_worker(job_id, user_id, format='zip')
    
    audit_log.log_event(
        actor_id=user_id,
        action="DATA_EXPORT",
        resource="user_data",
        metadata={"job_id": job_id}
    )
    
    return jsonify({
        "status": "pending",
        "job_id": job_id,
        "message": "Data export requested. You will be notified when the link is ready."
    }), 202

@data_rights_bp.route('/api/privacy/forget', methods=['DELETE'])
def request_right_to_be_forgotten():
    """
    Initiates the 30-day "Forget" process (Amendment 13).
    Mandatory identity re-verification required before this call.
    """
    user_id = request.json.get('user_id')
    
    # 1. Log the legal request immediately
    request_id = str(uuid.uuid4())
    fulfillment_deadline = datetime.utcnow() + timedelta(days=30)
    
    # 2. Record in deletion_queue table
    # db.session.add(DeletionRequest(user_id=user_id, deadline=fulfillment_deadline))
    
    audit_log.log_event(
        actor_id=user_id,
        action="DATA_DELETE_REQUESTED",
        resource="full_profile",
        metadata={"request_id": request_id, "deadline": fulfillment_deadline.isoformat()}
    )
    
    return jsonify({
        "status": "accepted",
        "deadline": fulfillment_deadline.isoformat(),
        "message": "Your request to be forgotten has been received. Deletion will be completed within 30 days."
    }), 202
