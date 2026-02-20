from flask import Blueprint, request, jsonify, session
from werkzeug.security import check_password_hash
import jwt
import datetime
import os

# Import from parent directory
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from models import db, User, Courier, Customer
from utils.decorators import token_required
from extensions import limiter
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

auth_bp = Blueprint('auth', __name__)

SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')

@auth_bp.route('/login', methods=['POST'])
@limiter.limit("60 per minute")
def login():
    """התחברות למערכת"""
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        # תמיכה בהתחברות עם אימייל או שם משתמש
        identifier = data.get('email') or data.get('username')
        password = data.get('password')
        
        if not identifier or not password:
            return jsonify({'error': 'Email/Username and password required'}), 400
        
        # מצא משתמש לפי שם משתמש או אימייל
        from sqlalchemy import or_
        user = User.query.filter(or_(User.username == identifier, User.email == identifier)).first()
        
        if not user:
            # Fake hash check to prevent timing attacks
            # check_password_hash('pbkdf2:sha256:600000$dummy$dummy', 'dummy') 
            return jsonify({'error': 'Invalid username or password'}), 401
            
        # Check Account Lockout
        if user.locked_until and user.locked_until > datetime.datetime.utcnow():
            wait_time = (user.locked_until - datetime.datetime.utcnow()).seconds // 60
            return jsonify({'error': f'Account locked due to too many failed attempts. Try again in {wait_time + 1} minutes.'}), 403
        
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
            msg = 'Invalid username or password'
            if remaining <= 3 and remaining > 0:
                 msg += f'. Warning: {remaining} attempts remaining before lockout.'
            
            return jsonify({'error': msg}), 401
        
        # בדוק אם המשתמש פעיל
        if not user.is_active:
            return jsonify({'error': 'Account is disabled'}), 403

        # Login Successful - Reset counters
        if user.failed_login_attempts > 0 or user.locked_until is not None:
            user.failed_login_attempts = 0
            user.locked_until = None
            db.session.commit()
        
        # בדיקה האם 2FA מופעל למשתמש זה
        if user.is_two_factor_enabled or user.two_factor_enforced_by_admin:
            # במקום להחזיר טוקן מלא, אנחנו מסמנים שהמשתמש עבר סיסמה וצריך קוד OTP
            mfa_token = jwt.encode({
                'user_id': user.id,
                'mfa_pending': True,
                'exp': datetime.datetime.utcnow() + datetime.timedelta(minutes=5)
            }, SECRET_KEY)
            
            return jsonify({
                'requires_2fa': True,
                'mfa_token': mfa_token,
                'message': 'Please enter your verification code from Authenticator app'
            }), 200

        # צור JWT token (רגיל למשתמש ללא 2FA)
        from flask_jwt_extended import create_access_token
        
        token = create_access_token(
            identity=str(user.id),
            additional_claims={
                'username': user.username,
                'user_type': user.user_type
            },
            expires_delta=datetime.timedelta(days=7)
        )
        
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
            'access_token': token,  # ✅ Mobile app expects this field
            'token': token,  # Keep for backward compatibility
            'user': user_data
        }), 200
        
    except Exception as e:
        import logging
        logging.error(f"Login error: {str(e)}", exc_info=True)
        return jsonify({'error': 'Internal server error'}), 500


@auth_bp.route('/register', methods=['POST'])
@limiter.limit("3 per hour")
def register():
    """רישום משתמש חדש"""
    try:
        data = request.json
        
        # וולידציה
        required_fields = ['username', 'email', 'password', 'phone', 'user_type']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400
        
        # בדוק אם שם המשתמש כבר קיים
        if User.query.filter_by(username=data['username']).first():
            return jsonify({'error': 'Username already exists'}), 400
        
        # בדוק אם האימייל כבר קיים
        if User.query.filter_by(email=data['email']).first():
            return jsonify({'error': 'Email already exists'}), 400
        
        # בדוק אם הטלפון כבר קיים
        if User.query.filter_by(phone=data['phone']).first():
            return jsonify({'error': 'Phone number already exists'}), 400
        
        # צור משתמש חדש
        user = User(
            username=data['username'],
            email=data['email'],
            phone=data['phone'],
            user_type=data['user_type']
        )
        user.set_password(data['password'])
        
        db.session.add(user)
        db.session.flush()
        
        # צור רשומה נוספת לפי סוג המשתמש
        if data['user_type'] == 'customer':
            customer = Customer(
                user_id=user.id,
                full_name=data.get('full_name', data['username']),
                company_name=data.get('company_name')
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


@auth_bp.route('/logout', methods=['POST'])
def logout():
    """יציאה מהמערכת"""
    user_id = session.get('user_id')
    
    # AUDIT LOG
    if user_id:
        from utils.audit import log_audit
        log_audit(
            action='LOGOUT',
            user_id=user_id,
            status='SUCCESS'
        )
        
    session.clear()
    return jsonify({
        'success': True,
        'message': 'Logout successful'
    }), 200


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
@auth_bp.route('/setup-dev', methods=['GET'])
def setup_dev():
    """Temporary route to setup admin user for development"""
    try:
        from models import User
        
        if User.query.filter_by(username='admin').first():
            user = User.query.filter_by(username='admin').first()
            user.set_password('admin123')
            db.session.commit()
            return jsonify({'message': 'Admin user updated. Login with: admin / admin123'}), 200
            
        user = User(
            username='admin',
            email='admin@example.com',
            phone='0500000000',
            user_type='admin',
            admin_role='super_admin'
        )
        user.set_password('admin123')
        db.session.add(user)
        db.session.commit()
        return jsonify({'message': 'Admin user created. Login with: admin / admin123'}), 201
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
# ============================================================================
# Two-Factor Authentication (2FA) Routes
# ============================================================================

@auth_bp.route('/2fa/setup', methods=['POST'])
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
def login_verify_2fa():
    """אימות קוד OTP במהלך ההתחברות"""
    from utils.two_factor import verify_totp_code
    from flask_jwt_extended import create_access_token
    
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
        
        if not user or not (user.is_two_factor_enabled or user.two_factor_enforced_by_admin):
            return jsonify({'error': 'User not found or 2FA not required'}), 401
        
        # אימות הקוד
        if verify_totp_code(user.two_factor_secret, code):
            # הכל תקין - שלח טוקן סופי
            token = create_access_token(
                identity=str(user.id),
                additional_claims={
                    'username': user.username,
                    'user_type': user.user_type
                },
                expires_delta=datetime.timedelta(days=7)
            )
            
            return jsonify({
                'access_token': token,
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'user_type': user.user_type
                }
            }), 200
        else:
            return jsonify({'error': 'Invalid verification code'}), 401
            
    except jwt.ExpiredSignatureError:
        return jsonify({'error': 'MFA session expired, please login again'}), 401
    except Exception as e:
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
        from flask_jwt_extended import create_access_token
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
