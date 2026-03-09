import unittest
import os
import json
import time
import subprocess
from backend.services.audit_log import audit_log

class TestAuditLogFailover(unittest.TestCase):
    def setUp(self):
        self.log_path = "logs/audit.log"
        if os.path.exists(self.log_path):
            os.remove(self.log_path)

    def test_redis_failover(self):
        """
        Simulate Redis unavailability and verify local fallback.
        """
        # 1. Simulate Redis Down (by using a wrong URL or stopping service in staging)
        # For the script test, we simulate by patching or temporary environment change
        original_url = os.environ.get("REDIS_URL")
        os.environ["REDIS_URL"] = "redis://localhost:9999/0" # Non-existent port
        
        from backend.services.audit_log import AuditLogger
        failing_logger = AuditLogger()
        
        # 2. Log a critical event
        failing_logger.log_event("admin_1", "SECRET_ACCESS", "vault:key_1", level="CRITICAL")
        
        # 3. Assert: Written to local file
        self.assertTrue(os.path.exists(self.log_path))
        with open(self.log_path, "r") as f:
            last_line = f.readlines()[-1]
            entry = json.loads(last_line)
            self.assertEqual(entry["action"], "SECRET_ACCESS")
            self.assertIn("hash", entry)
            self.assertIn("prev_hash", entry)

        # 4. Cleanup/Restore
        if original_url:
            os.environ["REDIS_URL"] = original_url

    def test_hmac_chain_integrity(self):
        """
        Verify that the HMAC chain is intact.
        """
        audit_log.log_event("user_1", "TEST_1", "res_1")
        audit_log.log_event("user_1", "TEST_2", "res_2")
        
        with open(self.log_path, "r") as f:
            lines = f.readlines()
            entry1 = json.loads(lines[-2])
            entry2 = json.loads(lines[-1])
            
            self.assertEqual(entry2["prev_hash"], entry1["hash"])

if __name__ == "__main__":
    unittest.main()
