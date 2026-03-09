import os
import json
import time
from datetime import datetime
from backend.services.audit_log import audit_log

class OffboardingManager:
    def __init__(self):
        self.systems = ["SSO", "VPN", "PAW", "Vault", "GitHub", "AWS", "Stripe"]

    def trigger_offboarding(self, user_id, trigger_reason="Departure"):
        """
        Phase 3: Automated employee revocation.
        Target: < 1 hour.
        """
        start_time = time.time()
        report = {
            "user_id": user_id,
            "triggered_at": datetime.utcnow().isoformat(),
            "trigger_reason": trigger_reason,
            "revocations": []
        }

        audit_log.log_event("HR_SYSTEM", "OFFBOARDING_START", f"user:{user_id}")

        for system in self.systems:
            success = self._revoke_system(system, user_id)
            report["revocations"].append({
                "system": system,
                "status": "REVOKED" if success else "FAILED",
                "timestamp": datetime.utcnow().isoformat()
            })

        end_time = time.time()
        report["total_duration_seconds"] = end_time - start_time
        
        with open(f"logs/offboarding_{user_id}.json", "w") as f:
            json.dump(report, f, indent=4)
            
        audit_log.log_event("system", "OFFBOARDING_COMPLETE", f"user:{user_id}", 
                           metadata={"duration": report["total_duration_seconds"]})
        
        return report

    def _revoke_system(self, system, user_id):
        # Simulation of API calls to 3rd party systems
        time.sleep(1) # Simulate network I/O
        return True

# Prototype usage
manager = OffboardingManager()
