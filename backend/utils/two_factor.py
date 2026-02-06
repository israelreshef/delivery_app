import pyotp
import qrcode
import io
import base64

def generate_totp_secret():
    """ייצור סיקרט חדש למשתמש"""
    return pyotp.random_base32()

def get_totp_uri(username, secret, issuer_name="TZIR Delivery"):
    """יצירת URI לסריקה באפליקציות Authenticator"""
    return pyotp.totp.TOTP(secret).provisioning_uri(name=username, issuer_name=issuer_name)

def generate_qr_base64(uri):
    """יצירת תמונת QR בפורמט Base64"""
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(uri)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    return base64.b64encode(buffered.getvalue()).decode('utf-8')

def verify_totp_code(secret, code):
    """אימות הקוד שהמשתמש הזין"""
    totp = pyotp.totp.TOTP(secret)
    return totp.verify(code, valid_window=1)
