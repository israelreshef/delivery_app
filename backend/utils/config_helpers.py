import json
import os

BRANDING_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'branding.json')

def get_protocol_setting(key, default=False):
    """
    Reads a setting from branding.json.
    """
    try:
        if os.path.exists(BRANDING_FILE):
            with open(BRANDING_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return data.get(key, default)
    except Exception:
        pass
    return default

def save_protocol_setting(key, value):
    """
    Updates a setting in branding.json.
    """
    try:
        data = {}
        if os.path.exists(BRANDING_FILE):
            with open(BRANDING_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
        
        data[key] = value
        
        with open(BRANDING_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return True
    except Exception:
        return False
