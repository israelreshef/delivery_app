import time
from collections import defaultdict
from flask import request, jsonify
import logging

# In-memory stores
# ip_tracking: maps IP to a list of timestamps
ip_tracking = defaultdict(list)
# blocked_ips: maps IP to the timestamp when the block expires
blocked_ips = {}

def check_ip_block():
    ip = request.remote_addr
    now = time.time()
    
    # Check if currently blocked
    if ip in blocked_ips:
        if now < blocked_ips[ip]:
            return jsonify({'error': 'Too many requests', 'message': 'נחסמת זמנית עקב עומס בקשות. אנא נסה שוב בעוד שעה.'}), 429
        else:
            # Block expired, remove from blocked list and reset tracking
            del blocked_ips[ip]
            ip_tracking[ip] = []

    # Track requests
    ip_tracking[ip].append(now)
    
    # Keep only requests from the last minute (60 seconds)
    ip_tracking[ip] = [t for t in ip_tracking[ip] if now - t < 60]
    
    if len(ip_tracking[ip]) > 1000:
        blocked_ips[ip] = now + 60 # block for 60 seconds
        logging.warning(f"Blocked IP {ip} for exceeding 100 requests per minute.")
        return jsonify({'error': 'Too many requests', 'message': 'נחסמת זמנית עקב עומס בקשות. אנא נסה שוב בעוד שעה.'}), 429

def get_blocked_ips():
    now = time.time()
    # Clean up expired blocks first
    expired = [ip for ip, exp in blocked_ips.items() if exp <= now]
    for ip in expired:
        del blocked_ips[ip]
        if ip in ip_tracking:
            del ip_tracking[ip]
            
    return [{"ip": ip, "expires_in_seconds": int(exp - now)} for ip, exp in blocked_ips.items()]

def remove_blocked_ip(ip):
    if ip in blocked_ips:
        del blocked_ips[ip]
        if ip in ip_tracking:
            del ip_tracking[ip]
        return True
    return False
