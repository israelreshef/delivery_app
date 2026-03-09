import os
import uuid
import time
from datetime import datetime
from backend.services.audit_log import audit_log

class JITWorkflow:
    def __init__(self):
        self.active_sessions = {}

    def request_access(self, requester_id, reason, duration_hours=4):
        """
        Phase 3: Request JIT access.
        """
        if duration_hours > 4:
            return {"error": "Maximum JIT duration is 4 hours."}
        
        request_id = str(uuid.uuid4())
        self.active_sessions[request_id] = {
            "requester": requester_id,
            "reason": reason,
            "duration": duration_hours,
            "approved": False,
            "requested_at": time.time()
        }
        
        audit_log.log_event(requester_id, "JIT_REQUEST", "infrastructure", 
                           metadata={"request_id": request_id, "reason": reason})
        return {"request_id": request_id, "status": "PENDING_APPROVAL"}

    def approve_access(self, approver_id, request_id):
        """
        Phase 3: Approve JIT access. Hard blocker: Self-approval.
        """
        session = self.active_sessions.get(request_id)
        if not session:
            return {"error": "Request not found."}
        
        if session["requester"] == approver_id:
            audit_log.log_event(approver_id, "JIT_SELF_APPROVAL_ATTEMPT", "infrastructure", level="CRITICAL")
            return {"error": "Self-approval is strictly prohibited."}
        
        session["approved"] = True
        session["approver"] = approver_id
        session["expires_at"] = time.time() + (session["duration"] * 3600)
        
        audit_log.log_event(approver_id, "JIT_APPROVED", "infrastructure", 
                           metadata={"request_id": request_id, "for": session["requester"]})
        
        # Trigger IAM/Bastion access provision (Simulation)
        return {"status": "ACTIVE", "expires_at": session["expires_at"]}

    def auto_expire_check(self):
        """
        Background worker logic for hard 4h kill.
        """
        now = time.time()
        expired = [rid for rid, s in self.active_sessions.items() if s["approved"] and now > s["expires_at"]]
        
        for rid in expired:
            session = self.active_sessions.pop(rid)
            audit_log.log_event("system", "JIT_EXPIRED", "infrastructure", 
                               metadata={"request_id": rid, "user": session["requester"]})
            # Trigger IAM revocation

# Prototype logic for CLI/API
jit = JITWorkflow()
