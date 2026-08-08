from flask import Blueprint, request, jsonify, session
from werkzeug.security import check_password_hash
import jwt
import datetime
import os
import logging
from extensions import db


# Import from parent directory
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from models import db, User, Courier, Customer
from utils.decorators import token_required
from utils.validation_helpers import is_valid_email, is_strong_password
from extensions import limiter
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

auth_bp = Blueprint('auth', __name__)

SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')

@auth_bp.route('/login', methods=['POST'])
@limiter.limit("50 per minute; 200 per hour")
def login():
    """התחברות למערכת"""
    try:
        data = request.json
        if not data:
            return jsonify({'success': False, 'error': 'No data provided', 'message': 'לא התקבלו נתונים'}), 400
        # תמיכה בהתחברות עם אימייל או שם משתמש
        identifier = data.get('email') or data.get('username')
        password = data.get('password')

        if '@' in identifier and not is_valid_email(identifier):
             return jsonify({'success': False, 'error': 'Invalid email format', 'message': 'פורמט אימייל לא תקין'}), 400
        
        if not identifier or not password:
            return jsonify({'success': False, 'error': 'Email/Username and password required', 'message': 'יש להזין אימייל וסיסמה'}), 400
        
        # מצא משתמש לפי שם משתמש או אימייל
        from sqlalchemy import or_
        user = User.query.filter(or_(User.username == identifier, User.email == identifier)).first()

        if not user:
            return jsonify({'success': False, 'error': 'Invalid username or password', 'message': 'שם משתמש או סיסמה שגויים'}), 401
            
        # Check Account Lockout
        if user.locked_until and user.locked_until > datetime.datetime.utcnow():
            wait_time = (user.locked_until - datetime.datetime.utcnow()).seconds // 60
            return jsonify({
                'error': f'Account locked. Try again in {wait_time + 1} minutes.',
                'message': f'החשבון נעול. נסה שוב בעוד {wait_time + 1} דקות.'
            }), 403
        
        # בדוק סיסמה
        if not user.check_password(password):
            # Increment failed attempts
            user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
            
            # Lock if > 10 attempts
            if user.failed_login_attempts >= 10:
                user.locked_until = datetime.datetime.utcnow() + datetime.timedelta(minutes=15)
                # Audit log for lockout
                from utils.audit import log_audit
                log_audit(
                    action='ACCOUNT_LOCKED',
                    user_id=user.id,
                    details=f"Account locked after {user.failed_login_attempts} failed attempts",
                    status='FAILURE'
                )
            
            db.session.commit()
            
            from utils.audit import log_audit
            log_audit(
                action='LOGIN_FAILED',
                user_id=user.id,
                details=f"Failed login attempt {user.failed_login_attempts}/10",
                status='FAILURE'
            )
            
            remaining = 10 - user.failed_login_attempts
            msg_en = 'Invalid username or password'
            msg_he = 'שם משתמש או סיסמה שגויים'
            if remaining <= 3 and remaining > 0:
                 msg_en += f'. Warning: {remaining} attempts remaining before lockout.'
                 msg_he += f'. אזהרה: נותרו עוד {remaining} ניסיונות לפני נעילת החשבון.'
            
            return jsonify({'success': False, 'error': msg_en, 'message': msg_he}), 401
        
        # בדוק אם המשתמש פעיל
        if not user.is_active:
            return jsonify({'error': 'Account is disabled', 'message': 'החשבון מושבת'}), 403

        # Login Successful - Reset counters
        if user.failed_login_attempts > 0 or user.locked_until is not None:
            user.failed_login_attempts = 0
            user.locked_until = None
            db.session.commit()
        
        # בדיקה האם 2FA מופעל למשתמש זה
        mfa_active = (
            getattr(user, 'mfa_enabled', False)
            or getattr(user, 'is_two_factor_enabled', False)
            or getattr(user, 'two_factor_enforced_by_admin', False)
        )
        if mfa_active:
            # במקום להחזיר טוקן מלא, אנחנו מסמנים שהמשתמש עבר סיסמה וצריך קוד OTP
            import time
            mfa_token = jwt.encode({
                'user_id': user.id,
                'mfa_pending': True,
                'exp': int(time.time()) + 300
            }, SECRET_KEY, algorithm="HS256")
            
            return jsonify({
                'requires_2fa': True,
                'mfa_token': mfa_token,
                'message': 'Please enter your verification code from Authenticator app'
            }), 200

        # צור JWT token (רגיל למשתמש ללא 2FA)
        from flask_jwt_extended import create_access_token, create_refresh_token, set_access_cookies
        
        token = create_access_token(
            identity=str(user.id),
            additional_claims={
                'username': user.username,
                'user_type': user.user_type
            },
            expires_delta=datetime.timedelta(minutes=60)
        )
        
        refresh_token = create_refresh_token(identity=str(user.id))
        
        # שמור בסשן (אופציונלי)
        session['user_id'] = user.id
        session['user_type'] = user.user_type
        
        # קבל פרטים נוספים לפי סוג משתמש
        user_data = {
            'id': str(user.id),
            'username': user.username,
            'email': user.email,
            'phone': user.phone,
            'user_type': user.user_type
        }
        
        if user.user_type == 'courier':
            courier = Courier.query.filter_by(user_id=user.id).first()
            if courier:
                user_data['courier_id'] = str(courier.id)
                user_data['full_name'] = courier.full_name
                user_data['vehicle_type'] = courier.vehicle_type
                user_data['is_available'] = courier.is_available
        
        elif user.user_type == 'customer':
            customer = Customer.query.filter_by(user_id=user.id).first()
            if customer:
                user_data['customer_id'] = str(customer.id)
                user_data['full_name'] = customer.full_name
                user_data['company_name'] = customer.company_name
        
        elif user.user_type == 'admin':
            user_data['full_name'] = user.username  # Admin doesn't have a separate profile
            user_data['admin_role'] = getattr(user, 'admin_role', None)
        
        # AUDIT LOG
        from utils.audit import log_audit
        log_audit(
            action='LOGIN',
            user_id=user.id,
            details=f"User {user.username} logged in successfully"
        )
        
        return jsonify({
            'success': True,
            'message': 'Login successful',
            'access_token': token,  #  Mobile app expects this field
            'refresh_token': refresh_token,
            'token': token,  # Keep for backward compatibility
            'user': user_data
        }), 200
        
    except Exception as e:
        import logging
        logging.error(f"Login error: {str(e)}", exc_info=True)
        return jsonify({'error': 'שגיאה פנימית, נסה שוב מאוחר יותר'}), 500


# ─── Fix 8: Refresh token rotation ────────────────────────────────────────────

@auth_bp.route('/refresh', methods=['POST'])
@limiter.limit("20 per minute; 100 per hour")
def refresh_token():
    """Issue a new access + refresh token pair; blacklist the old refresh token."""
    from flask_jwt_extended import (
        verify_jwt_in_request, get_jwt_identity, get_jwt,
        create_access_token, create_refresh_token
    )
    try:
        verify_jwt_in_request(refresh=True)
        jti = get_jwt().get("jti")
        exp_ts = get_jwt().get("exp")
        user_id = get_jwt_identity()

        # Blacklist the old refresh token
        if jti and exp_ts:
            import datetime as _dt
            from models import TokenBlacklist
            expires_at = _dt.datetime.utcfromtimestamp(exp_ts)
            if not TokenBlacklist.query.filter_by(jti=jti).first():
                db.session.add(TokenBlacklist(jti=jti, expires_at=expires_at))
                db.session.commit()

        new_access = create_access_token(identity=user_id,
                                         expires_delta=datetime.timedelta(minutes=60))
        new_refresh = create_refresh_token(identity=user_id)

        return jsonify({
            'access_token': new_access,
            'refresh_token': new_refresh
        }), 200

    except Exception as e:
        logging.warning("Refresh token failed: %s", str(e))
        return jsonify({'error': 'טוקן רענון לא תקין, יש להתחבר מחדש'}), 401


@auth_bp.route('/logout', methods=['POST'])
@token_required
def logout(current_user):
    """Blacklist the current access token so it can no longer be used."""
    from flask_jwt_extended import get_jwt
    import datetime as _dt
    from models import TokenBlacklist
    try:
        claims = get_jwt()
        jti = claims.get("jti")
        exp_ts = claims.get("exp")
        if jti and exp_ts:
            expires_at = _dt.datetime.utcfromtimestamp(exp_ts)
            if not TokenBlacklist.query.filter_by(jti=jti).first():
                db.session.add(TokenBlacklist(jti=jti, expires_at=expires_at))
                db.session.commit()
        return jsonify({'success': True, 'message': 'התנתקת בהצלחה'}), 200
    except Exception as e:
        logging.error("Logout error: %s", str(e), exc_info=True)
        return jsonify({'error': 'שגיאה בהתנתקות'}), 500


@auth_bp.route('/register', methods=['POST'])
@limiter.limit("10 per hour")
def register():

    """רישום משתמש חדש"""
    try:
        from utils.sanitization import sanitize_input
        # Sanitize incoming payload
        data = sanitize_input(request.json)
        
        # וולידציה
        required_fields = ['email', 'password', 'user_type']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400
        
        # Validate Email
        if not is_valid_email(data['email']):
            return jsonify({'error': 'Invalid email format', 'message': 'פורמט אימייל לא תקין'}), 400
            
        # Validate Password Strength
        is_strong, error_msg = is_strong_password(data['password'])
        if not is_strong:
            return jsonify({'error': 'Weak password', 'message': error_msg}), 400
        
        # Auto-generate username if not provided
        if 'username' not in data and 'email' in data:
            base_username = data['email'].split('@')[0]
            username = base_username
            counter = 1
            while User.query.filter_by(username=username).first():
                username = f"{base_username}{counter}"
                counter += 1
            data['username'] = username
            
        # Optional fields defaults
        if 'phone' not in data:
            data['phone'] = ''
        
        # בדוק אם שם המשתמש כבר קיים
        if User.query.filter_by(username=data['username']).first():
            return jsonify({'error': 'Username already exists'}), 400
        
        # בדוק אם האימייל כבר קיים
        if User.query.filter_by(email=data['email']).first():
            return jsonify({'error': 'Email already exists'}), 400
        
        # בדוק אם הטלפון כבר קיים (אם הוזן)
        if data['phone'] and User.query.filter_by(phone=data['phone']).first():
            return jsonify({'error': 'Phone number already exists'}), 400
        
        # Mass Assignment Fix: Whitelist allowed fields only
        # user_type can ONLY be 'customer' or 'courier' via registration — never 'admin'
        ALLOWED_USER_TYPES = ['customer', 'courier']
        if data.get('user_type') not in ALLOWED_USER_TYPES:
            return jsonify({'error': 'Invalid user type. Allowed: customer, courier'}), 400
        
        # Mass Assignment Fix: Only extract whitelisted fields
        user = User(
            username=data['username'],
            email=data['email'],
            phone=data.get('phone', ''),
            user_type=data['user_type']  # Whitelisted above
            # Sensitive fields NOT set: is_admin, wallet_balance, is_verified, role, mfa_enabled, etc.
        )
        user.set_password(data['password'])
        
        db.session.add(user)
        db.session.flush()
        
        # צור רשומה נוספת לפי סוג המשתמש
        if data['user_type'] == 'customer':
            customer = Customer(
                user_id=user.id,
                full_name=data.get('full_name', data['username']),
                company_name=data.get('company_name'),
                customer_type=data.get('customer_type', 'private')
            )
            db.session.add(customer)
        
        elif data['user_type'] == 'courier':
            courier = Courier(
                user_id=user.id,
                full_name=data.get('full_name', data['username']),
                vehicle_type=data.get('vehicle_type', 'scooter'),
                license_plate=data.get('license_plate'),
                is_available=True
            )
            db.session.add(courier)
        
        db.session.commit()
        
        # AUDIT LOG
        from utils.audit import log_audit
        log_audit(
            action='REGISTER_NEW_USER',
            user_id=user.id,
            resource_type='User',
            resource_id=user.id,
            details=f"New user registration: {user.username} ({user.user_type})",
            status='SUCCESS'
        )
        
        return jsonify({
            'success': True,
            'message': 'Registration successful',
            'user_id': user.id
        }), 201
        
    except Exception as e:
        db.session.rollback()
        import logging
        logging.error(f"Registration error: {str(e)}", exc_info=True)
        return jsonify({'error': 'Internal server error'}), 500




@auth_bp.route('/me', methods=['GET'])
@auth_bp.route('/profile', methods=['GET'])
def get_current_user():
    """קבלת פרטי המשתמש המחובר"""
    try:
        # קבל טוקן מהכותרת
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'No authorization token provided'}), 401
        
        try:
            from flask_jwt_extended import decode_token
            # Remove Bearer if present
            if auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]
            else:
                token = auth_header
                
            payload = decode_token(token)
            # identity (sub) is the user ID in string format
            user_id = payload['sub']
        except Exception as e:
            return jsonify({'error': f'Invalid token: {str(e)}'}), 401
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        user_data = {
            'id': str(user.id),
            'username': user.username,
            'email': user.email,
            'phone': user.phone,
            'user_type': user.user_type,
            'is_active': user.is_active,
            'is_two_factor_enabled': user.is_two_factor_enabled,
            'terms_accepted_at': user.terms_accepted_at.isoformat() if user.terms_accepted_at else None,
            'privacy_policy_accepted_at': user.privacy_policy_accepted_at.isoformat() if user.privacy_policy_accepted_at else None
        }
        
        if user.user_type == 'courier':
            courier = Courier.query.filter_by(user_id=user.id).first()
            if courier:
                user_data['courier_id'] = str(courier.id)
                user_data['full_name'] = courier.full_name
                user_data['vehicle_type'] = courier.vehicle_type
                user_data['is_available'] = courier.is_available
                user_data['rating'] = float(courier.rating)
                user_data['total_deliveries'] = courier.total_deliveries
        
        elif user.user_type == 'customer':
            customer = Customer.query.filter_by(user_id=user.id).first()
            if customer:
                user_data['customer_id'] = str(customer.id)
                user_data['full_name'] = customer.full_name
                user_data['company_name'] = customer.company_name
                user_data['balance'] = float(customer.balance)
        
        elif user.user_type == 'admin':
            user_data['full_name'] = user.username
            user_data['admin_role'] = getattr(user, 'admin_role', None)
        
        return jsonify(user_data), 200
        
    except Exception as e:
        import logging
        logging.error(f"Get user error: {str(e)}", exc_info=True)
        return jsonify({'error': 'Internal server error'}), 500


@auth_bp.route('/verify-token', methods=['POST'])
def verify_token():
    """אימות טוקן"""
    try:
        data = request.json
        token = data.get('token')
        
        if not token:
            return jsonify({'valid': False, 'error': 'No token provided'}), 400
        
        try:
            from flask_jwt_extended import decode_token
            payload = decode_token(token)
            return jsonify({'valid': True, 'payload': payload}), 200
        except Exception as e:
            return jsonify({'valid': False, 'error': str(e)}), 401
            
    except Exception as e:
        return jsonify({'valid': False, 'error': str(e)}), 500

@auth_bp.route('/public-key', methods=['GET'])
def get_public_key():
    """קבלת מפתח ציבורי להצפנת מידע רגיש (E2EE)"""
    try:
        from utils.rsa_handler import rsa_manager
        return jsonify({
            'public_key': rsa_manager.get_public_key_pem(),
            'algorithm': 'RSA-OAEP-256'
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
@auth_bp.route('/consent', methods=['POST'])
@token_required
def update_consent(current_user):
    """Update user consent for Terms and Privacy Policy"""
    try:
        data = request.json
        now = datetime.datetime.utcnow()
        
        if data.get('terms_accepted'):
            current_user.terms_accepted_at = now
        if data.get('privacy_policy_accepted'):
            current_user.privacy_policy_accepted_at = now
            
        db.session.commit()
        
        # AUDIT LOG
        from utils.audit import log_audit
        log_audit(
            action='CONSENT_UPDATE',
            user_id=current_user.id,
            details='User accepted Terms/Privacy Policy',
            status='SUCCESS'
        )
        
        return jsonify({'message': 'Consent updated successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/fcm-token', methods=['POST'])
@token_required
def update_fcm_token(current_user):
    """Update FCM token for push notifications"""
    try:
        data = request.json
        token = data.get('fcm_token')
        
        if not token:
            return jsonify({'error': 'FCM token is required'}), 400
            
        current_user.fcm_token = token
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'FCM token updated successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
@auth_bp.route('/admin/reset-password', methods=['POST'])
@token_required
def admin_reset_password(current_user):
    """
    קביעת סיסמה חדשה למשתמש ע"י אדמין בלבד.
    """
    from utils.decorators import role_required
    
    # Check admin role
    if current_user.user_type != 'admin' or current_user.admin_role != 'super_admin':
        return jsonify({'error': 'Unauthorized. Requires Super Admin role.'}), 403
        
    try:
        data = request.json
        target_user_id = data.get('user_id')
        new_password = data.get('password')
        
        if not target_user_id or not new_password:
            return jsonify({'error': 'User ID and Password are required'}), 400
            
        target_user = User.query.get(target_user_id)
        if not target_user:
            return jsonify({'error': 'User not found'}), 404
            
        # Update password
        target_user.set_password(new_password)
        target_user.failed_login_attempts = 0
        target_user.locked_until = None
        
        db.session.commit()
        
        # AUDIT LOG
        from utils.audit import log_audit
        log_audit(
            action='PASSWORD_RESET_BY_ADMIN',
            user_id=current_user.id,
            resource_type='User',
            resource_id=target_user.id,
            details=f"Admin {current_user.username} reset password for user {target_user.username}",
            status='SUCCESS'
        )
        
        return jsonify({'success': True, 'message': f'Password for {target_user.username} has been reset.'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# ============================================================================
# Two-Factor Authentication (2FA) Routes
# ============================================================================

@auth_bp.route('/2fa/setup', methods=['POST'])
@limiter.limit("10 per hour")
@token_required
def setup_2fa(current_user):
    """התחלת הגדרת 2FA - ייצור סיקרט ו-QR Code"""
    from utils.two_factor import generate_totp_secret, get_totp_uri, generate_qr_base64
    
    if current_user.is_two_factor_enabled:
        return jsonify({'error': '2FA is already enabled'}), 400
    
    # צור סיקרט אם אין כזה
    if not current_user.two_factor_secret:
        current_user.two_factor_secret = generate_totp_secret()
        db.session.commit()
    
    uri = get_totp_uri(current_user.username, current_user.two_factor_secret)
    qr_code_base64 = generate_qr_base64(uri)
    
    return jsonify({
        'secret': current_user.two_factor_secret,
        'qr_code': f"data:image/png;base64,{qr_code_base64}"
    })

@auth_bp.route('/2fa/verify-and-enable', methods=['POST'])
@limiter.limit("10 per minute; 30 per hour")
@token_required
def verify_and_enable_2fa(current_user):
    """אימות קוד ראשוני והפעלת ה-2FA סופית"""
    from utils.two_factor import verify_totp_code
    data = request.json
    code = data.get('code')
    
    if not code:
        return jsonify({'error': 'Verification code required'}), 400
    
    if verify_totp_code(current_user.two_factor_secret, code):
        current_user.is_two_factor_enabled = True
        db.session.commit()
        return jsonify({'message': '2FA enabled successfully'}), 200
    else:
        return jsonify({'error': 'Invalid verification code'}), 400

@auth_bp.route('/2fa/login-verify', methods=['POST'])
@limiter.limit("10 per minute; 50 per hour")
def login_verify_2fa():
    """אימות קוד OTP במהלך ההתחברות"""
    from utils.two_factor import verify_totp_code
    from flask_jwt_extended import create_access_token, create_refresh_token
    
    data = request.json
    mfa_token = data.get('mfa_token')
    code = data.get('code')
    
    if not mfa_token or not code:
        return jsonify({'error': 'MFA token and verification code required'}), 400
    
    try:
        # פתיחת הטוקן הזמני
        payload = jwt.decode(mfa_token, SECRET_KEY, algorithms=["HS256"])
        if not payload.get('mfa_pending'):
            return jsonify({'error': 'Invalid MFA session'}), 401
        
        user_id = payload.get('user_id')
        user = User.query.get(user_id)
        
        mfa_active = user and (
            getattr(user, 'mfa_enabled', False)
            or getattr(user, 'is_two_factor_enabled', False)
            or getattr(user, 'two_factor_enforced_by_admin', False)
        )
        if not mfa_active:
            return jsonify({'error': 'User not found or 2FA not required'}), 401
        
        # אימות הקוד - תומך בשני מנגנוני 2FA הקיימים + קוד התאוששות
        secret = getattr(user, 'two_factor_secret', None) or getattr(user, 'totp_secret', None)
        code_valid = (secret and verify_totp_code(secret, code)) or (
            getattr(user, 'mfa_recovery_code', None) and code == user.mfa_recovery_code
        )
        if not code_valid:
            return jsonify({'error': 'Invalid verification code'}), 401
        
        # הכל תקין - שלח טוקן סופי
        token = create_access_token(
            identity=str(user.id),
            additional_claims={
                'username': user.username,
                'user_type': user.user_type
            },
            expires_delta=datetime.timedelta(minutes=60)
        )
        refresh_token = create_refresh_token(identity=str(user.id))
        
        # AUDIT LOG
        from utils.audit import log_audit
        log_audit(
            action='LOGIN_2FA',
            user_id=user.id,
            details=f"User {user.username} completed 2FA verification"
        )
        
        # קבל פרטים נוספים לפי סוג משתמש (מראה לזרימת login הרגילה)
        user_data = {
            'id': str(user.id),
            'username': user.username,
            'email': user.email,
            'phone': user.phone,
            'user_type': user.user_type
        }
        
        if user.user_type == 'courier':
            courier = Courier.query.filter_by(user_id=user.id).first()
            if courier:
                user_data['courier_id'] = str(courier.id)
                user_data['full_name'] = courier.full_name
                user_data['vehicle_type'] = courier.vehicle_type
                user_data['is_available'] = courier.is_available
        
        elif user.user_type == 'customer':
            customer = Customer.query.filter_by(user_id=user.id).first()
            if customer:
                user_data['customer_id'] = str(customer.id)
                user_data['full_name'] = customer.full_name
                user_data['company_name'] = customer.company_name
        
        elif user.user_type == 'admin':
            user_data['full_name'] = user.username
            user_data['admin_role'] = getattr(user, 'admin_role', None)
        
        return jsonify({
            'success': True,
            'message': '2FA verification successful',
            'access_token': token,  #  Mobile app expects this field
            'refresh_token': refresh_token,
            'token': token,  # Keep for backward compatibility
            'user': user_data
        }), 200
            
    except jwt.ExpiredSignatureError:
        return jsonify({'error': 'MFA session expired, please login again'}), 401
    except Exception as e:
        logging.error("2FA login verify error: %s", str(e), exc_info=True)
        return jsonify({'error': f'Auth failed: {str(e)}'}), 401

@auth_bp.route('/google', methods=['POST'])
def google_login():
    """התחברות באמצעות גוגל"""
    try:
        data = request.json
        token = data.get('token')
        
        if not token:
            return jsonify({'error': 'Token is required'}), 400
            
        # וודא את הטוקן מול גוגל
        GOOGLE_CLIENT_ID = "348912700998-sud2nuq9om7jkdhht8biohof9c6llk4m.apps.googleusercontent.com"
        idinfo = id_token.verify_oauth2_token(token, google_requests.Request(), GOOGLE_CLIENT_ID)
        
        # בדוק את ה-Issuer
        if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
            return jsonify({'error': 'Invalid issuer'}), 401
            
        # פרטי المמשתמש מגוגל
        email = idinfo['email']
        name = idinfo.get('name', '')
        google_id = idinfo['sub']
        
        # חפש משתמש קיים לפי אימייל
        user = User.query.filter_by(email=email).first()
        
        if not user:
            # צור משתמש חדש אם לא קיים
            # הערה: כברירת מחדל נגדיר אותו כ-customer
            username = email.split('@')[0]
            # וודא ששם המשתמש ייחודי
            counter = 1
            original_username = username
            while User.query.filter_by(username=username).first():
                username = f"{original_username}{counter}"
                counter += 1
                
            user = User(
                username=username,
                email=email,
                phone='', # יצטרך לעדכן בהמשך
                user_type='customer'
            )
            # סיסמה אקראית חזקה למשתמש גוגל (לא באמת בשימוש)
            import secrets
            user.set_password(secrets.token_urlsafe(32))
            
            db.session.add(user)
            db.session.flush()
            
            # צור פרופיל לקוח
            customer = Customer(
                user_id=user.id,
                full_name=name,
                company_name=''
            )
            db.session.add(customer)
            db.session.commit()
            
            from utils.audit import log_audit
            log_audit(
                action='OAUTH_REGISTER',
                user_id=user.id,
                details=f"New user registered via Google: {email}"
            )
        
        # צור JWT טוקן
        from flask_jwt_extended import create_access_token, set_access_cookies
        access_token = create_access_token(
            identity=str(user.id),
            additional_claims={
                'username': user.username,
                'user_type': user.user_type
            },
            expires_delta=datetime.timedelta(days=7)
        )
        
        user_data = {
            'id': str(user.id),
            'username': user.username,
            'email': user.email,
            'user_type': user.user_type
        }
        
        if user.user_type == 'courier':
            courier = Courier.query.filter_by(user_id=user.id).first()
            if courier: user_data['courier_id'] = str(courier.id)
        elif user.user_type == 'customer':
            customer = Customer.query.filter_by(user_id=user.id).first()
            if customer: user_data['customer_id'] = str(customer.id)
            
        return jsonify({
            'success': True,
            'access_token': access_token,
            'token': access_token,
            'user': user_data
        }), 200
        
    except ValueError:
        return jsonify({'error': 'Invalid token'}), 401
    except Exception as e:
        import logging
        logging.error(f"Google Auth Error: {str(e)}", exc_info=True)
        return jsonify({'error': 'Authentication failed'}), 500
