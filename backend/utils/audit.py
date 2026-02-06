from flask import request
from models import db, AuditLog
import traceback
import json
import logging
import os
from datetime import datetime

# Setup JSON Logger (Simulating ELK/Splunk forwarder source)
LOG_DIR = os.path.join(os.getcwd(), 'logs')
os.makedirs(LOG_DIR, exist_ok=True)
json_logger = logging.getLogger('security_audit')
json_logger.setLevel(logging.INFO)
file_handler = logging.FileHandler(os.path.join(LOG_DIR, 'security.json'))
file_handler.setFormatter(logging.Formatter('%(message)s'))
json_logger.addHandler(file_handler)

def log_audit(action, user_id=None, resource_type=None, resource_id=None, status='SUCCESS', details=None):
    """
    Records an audit log entry for security and compliance.
    Writes to BOTH Database and JSON Log File.
    """
    try:
        # Attempt to get IP address
        if request:
            ip_address = request.headers.get('X-Forwarded-For', request.remote_addr)
        else:
            ip_address = 'SYSTEM'
            
        # 1. DB Log
        log_entry = AuditLog(
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=str(resource_id) if resource_id else None,
            ip_address=ip_address,
            status=status,
            details=str(details) if details else None
        )
        db.session.add(log_entry)
        db.session.commit()
        
        # 2. JSON Log (for Splunk/ELK)
        log_data = {
            'timestamp': datetime.utcnow().isoformat(),
            'action': action,
            'user_id': user_id,
            'ip_address': ip_address,
            'status': status,
            'resource': f"{resource_type}:{resource_id}" if resource_type else None,
            'details': details
        }
        json_logger.info(json.dumps(log_data))

    except Exception as e:
        print(f"⚠️ Failed to write audit log: {e}")
        traceback.print_exc()

def scan_file_virus(file_stream) -> bool:
    """
    Mock Virus Scanner.
    In real world, stream this to ClamAV service or use an API.
    Returns True if clean, False if infected.
    """
    # Simulate scanning (Magic bytes for EICAR test file could be checked here)
    # For now, assume always clean unless file name contains 'virus'
    return True
