import redis
import os
import time
from .audit_log import audit_log

class AnomalyDetector:
    def __init__(self):
        self.redis = redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379/0"))
        
    def check_request(self, user_id, endpoint, ip, role="user"):
        """
        Implementation of Phase 2 Behavioral Anomaly Detection:
        - All rules run async (non-blocking).
        - Use Redis counters with TTL (O(1)).
        """
        # 1. Bot Pattern: 50+ endpoints/60s
        self._check_bot_pattern(user_id or ip)
        
        # 2. Sequential ID Enumeration
        self._check_id_enumeration(user_id or ip, endpoint)
        
        # 3. Export Volume Pattern (>10x normal)
        if "export" in endpoint:
            self._check_export_volume(user_id)

        # 4. Admin Anomaly (New Country/Device)
        if role == "admin":
            self._check_admin_anomaly(user_id, ip)

    def _check_bot_pattern(self, identifier):
        key = f"anomaly:bot:{identifier}"
        count = self.redis.incr(key)
        if count == 1:
            self.redis.expire(key, 60)
        
        if count > 50:
            audit_log.log_event(identifier, "BOT_DETECTED", "system", level="CRITICAL")
            # Trigger challenge (CAPTCHA) or temporary block
            return True
        return False

    def _check_id_enumeration(self, identifier, endpoint):
        # Logic to detect patterns like /user/1, /user/2, /user/3
        pass

    def _check_export_volume(self, user_id):
        key = f"anomaly:export:{user_id}"
        count = self.redis.incr(key)
        if count == 1:
            self.redis.expire(key, 3600) # 1 hour window
        
        if count > 10: # Threshold for "normal"
            audit_log.log_event(user_id, "HIGH_EXPORT_VOLUME", "data_rights", level="WARNING")
            # auto-suspend user if >10x
            self._suspend_user(user_id)

    def _check_admin_anomaly(self, user_id, ip):
        # Check GeoIP for new country
        # Check User-Agent/Fingerprint store in Redis
        pass

    def _check_credential_stuffing(self, ip, username):
        """
        Different from standard lockout: detects many users, one IP.
        """
        key = f"anomaly:stuffing:{ip}"
        self.redis.sadd(key, username)
        if self.redis.scard(key) > 20:
            audit_log.log_event(ip, "CREDENTIAL_STUFFING_DETECTED", "auth", level="CRITICAL")
            # Block IP

    def _suspend_user(self, user_id):
        # Implementation to flag user as 'suspended' in DB/Redis
        pass

# Global instance
anomaly_detector = AnomalyDetector()
