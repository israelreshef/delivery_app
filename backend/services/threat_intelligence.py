import redis
import os
import requests
import time
from .audit_log import audit_log

class ThreatIntelFeed:
    def __init__(self):
        self.redis = redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379/0"))
        self.blocklist_key = "security:blocklist:ips"
        # In a real setup, we'd use pybloom_live or similar for the secondary layer
        # For now, we utilize Redis SET for O(1) lookup.

    def is_blocked(self, ip):
        """
        Implementation of Phase 2 Threat Intelligence:
        - Redis SET lookup only (O(1), <0.1ms).
        - Zero HTTP I/O in hot path.
        """
        if self.redis.sismember(self.blocklist_key, ip):
            audit_log.log_event(ip, "THREAT_IP_DETECTED", "WAF", level="WARNING")
            return True
        return False

    def refresh_feed(self):
        """
        Background worker (e.g., Celery) updates IP blocklist (AbuseIPDB/Cloudflare) every 6 hours.
        """
        api_key = os.getenv("ABUSEIPDB_API_KEY")
        if not api_key:
            return

        try:
            # Simulated API call to fetch malicious IPs
            response = requests.get(
                "https://api.abuseipdb.com/api/v2/blacklist",
                params={"confidenceMinimum": 90},
                headers={"Key": api_key, "Accept": "application/json"},
                timeout=10
            )
            data = response.json()
            ips = [entry['ipAddress'] for entry in data.get('data', [])]
            
            # Atomic update in Redis
            # 1. Store in tmp set
            tmp_key = "security:blocklist:tmp"
            self.redis.delete(tmp_key)
            if ips:
                self.redis.sadd(tmp_key, *ips)
                # 2. Swap names (Atomic)
                self.redis.rename(tmp_key, self.blocklist_key)
            
            audit_log.log_event("system", "THREAT_FEED_REFRESHED", "threat_intel", 
                              metadata={"count": len(ips)})
        except Exception as e:
            audit_log.log_event("system", "THREAT_FEED_REFRESH_FAILED", "threat_intel", 
                              level="CRITICAL", metadata={"error": str(e)})

# Global instance
threat_intel = ThreatIntelFeed()
