import unittest
import time
import redis
import os
from backend.services.anomaly_detection import anomaly_detector

class TestAnomalyRules(unittest.TestCase):
    def setUp(self):
        self.redis = redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379/0"))
        self.redis.flushall()

    def test_rule_1_high_export_volume(self):
        user_id = "test_user_export"
        for _ in range(11):
            anomaly_detector.check_request(user_id, "/api/privacy/export", "127.0.0.1")
        
        # In a real test, we would check if user status in DB is 'suspended'
        # Here we check the Redis flag or audit event (check audit_queue)
        self.assertTrue(self.redis.exists(f"anomaly:export:{user_id}"))

    def test_rule_4_bot_pattern(self):
        ip = "1.2.3.4"
        for i in range(51):
            anomaly_detector.check_request(None, f"/api/endpoint_{i}", ip)
        
        # Check if audit event was triggered
        entries = self.redis.lrange("audit_queue", 0, -1)
        found = any(b"BOT_DETECTED" in e for e in entries)
        self.assertTrue(found)

    def test_rule_5_credential_stuffing(self):
        ip = "9.9.9.9"
        for i in range(21):
            anomaly_detector._check_credential_stuffing(ip, f"user_{i}")
        
        entries = self.redis.lrange("audit_queue", 0, -1)
        found = any(b"CREDENTIAL_STUFFING_DETECTED" in e for e in entries)
        self.assertTrue(found)

if __name__ == "__main__":
    unittest.main()
