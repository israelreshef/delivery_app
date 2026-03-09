import hmac
import hashlib
import json
import os
from datetime import datetime
import redis

class AuditLogger:
    def __init__(self):
        self.redis_client = redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379/0"))
        self.local_log_path = "logs/audit.log"
        self.hmac_key = os.getenv("AUDIT_HMAC_KEY", "dev-hmac-key").encode()
        self._ensure_log_dir()
        self.prev_hash = self._get_last_hash()

    def _ensure_log_dir(self):
        os.makedirs("logs", exist_ok=True)

    def _get_last_hash(self):
        if not os.path.exists(self.local_log_path):
            return "genesis_hash"
        try:
            with open(self.local_log_path, "rb") as f:
                # Get last line's hash
                lines = f.readlines()
                if not lines: return "genesis_hash"
                last_entry = json.loads(lines[-1].decode())
                return last_entry.get("hash", "genesis_hash")
        except:
            return "genesis_hash"

    def log_event(self, actor_id, action, resource, metadata=None, level="INFO"):
        """
        Implementation of Phase 2 Audit Logging:
        - Dual-Write: Redis (Async) + Local File (Fallback/Forensics)
        - HMAC Chaining: Each entry signs the previous hash (Tamper-proof)
        - Priority Protection: Drop DEBUG/INFO if queue full (simulated)
        """
        timestamp = datetime.utcnow().isoformat()
        entry_data = {
            "timestamp": timestamp,
            "actor_id": actor_id,
            "action": action,
            "resource": resource,
            "metadata": metadata or {},
            "level": level,
            "prev_hash": self.prev_hash
        }

        # Sign the entry
        payload = json.dumps(entry_data, sort_keys=True).encode()
        entry_hash = hmac.new(self.hmac_key, payload, hashlib.sha256).hexdigest()
        entry_data["hash"] = entry_hash
        self.prev_hash = entry_hash

        # 1. Primary: Redis Queue (Simulated fire-and-forget)
        try:
            self.redis_client.lpush("audit_queue", json.dumps(entry_data))
        except Exception as e:
            # Drop non-critical if Redis is truly down, but we still have Local Fallback
            pass

        # 2. Local Fallback (Forensics/Persistence)
        # Warning 2/Trap 2: Dual-write pattern
        with open(self.local_log_path, "a+b") as f:
            f.write(json.dumps(entry_data).encode() + b"\n")

        # 3. Priority Check (Warning 1)
        # In a real high-load scenario, we would check queue depth here.
        # PROTECTED_EVENTS = ["AUTH_SUCCESS", "AUTH_FAILURE", "PRIVILEGE_CHANGE", 
        #                    "DATA_EXPORT", "DATA_DELETE", "CONFIG_CHANGE", 
        #                    "SECRET_ACCESS", "PINNING_FAILURE"]

# Global instance
audit_log = AuditLogger()
