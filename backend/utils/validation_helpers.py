import re

def is_valid_email(email):
    """Simple regex for email validation."""
    if not email: return False
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def is_strong_password(password):
    """
    Check if password meets complexity requirements:
    - Min 8 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one digit
    - At least one special character
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters long."
    if not any(c.isupper() for c in password):
        return False, "Password must contain at least one uppercase letter."
    if not any(c.islower() for c in password):
        return False, "Password must contain at least one lowercase letter."
    if not any(c.isdigit() for c in password):
        return False, "Password must contain at least one digit."
    if not any(c in "!@#$%^&*()-_=+[]{}|;:,.<>?/" for c in password):
        return False, "Password must contain at least one special character."
    return True, ""

def is_valid_gps(lat, lon):
    """Validate latitude (-90 to 90) and longitude (-180 to 180)."""
    try:
        lat_f = float(lat)
        lon_f = float(lon)
        return -90 <= lat_f <= 90 and -180 <= lon_f <= 180
    except (ValueError, TypeError):
        return False

def is_valid_amount(amount):
    """Ensure amount is a positive number."""
    try:
        val = float(amount)
        return val >= 0
    except (ValueError, TypeError):
        return False

def is_valid_card_format(card_number):
    """
    Basic Luhn algorithm or regex check for card format.
    Here we just check for 13-19 digits.
    """
    if not card_number: return False
    # Remove whitespace/dashes
    clean_num = re.sub(r'\s+|-', '', str(card_number))
    return clean_num.isdigit() and 13 <= len(clean_num) <= 19
