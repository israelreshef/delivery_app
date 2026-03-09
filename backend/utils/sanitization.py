import html

def sanitize_input(data):
    """
    Recursively sanitize JSON data structures to prevent XSS (Cross-Site Scripting) attacks.
    It escapes HTML characters like <, >, &, ", and ' in string values.
    """
    if isinstance(data, str):
        # Escape HTML characters safely
        return html.escape(data)
    elif isinstance(data, dict):
        return {key: sanitize_input(value) for key, value in data.items()}
    elif isinstance(data, list):
        return [sanitize_input(item) for item in data]
    else:
        # Return integers, floats, booleans, and None as-is
        return data
