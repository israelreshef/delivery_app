from gevent import monkey
monkey.patch_all()

import sys
try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from flask_talisman import Talisman
from extensions import socketio, db, migrate, jwt, limiter
from datetime import timedelta
import click
import os
# Ensure models are imported for SQLAlchemy migrations
from models import * 
from dotenv import load_dotenv
load_dotenv()
from sockets import init_sockets

def create_demo_users_logic():
    from werkzeug.security import generate_password_hash
    from models import User, Courier, Customer
    
    print("Creating Secure Demo Accounts...")
    demos = [
        ('super_admin', 'admin@tzir.com', 'super_admin2026!', 'admin', 'super_admin', '0501111111'),
        ('finance_admin', 'finance@tzir.com', 'TzirFinance$$99', 'admin', 'finance_admin', '0504444444'),
        ('demo_client', 'client@tzir.com', 'demo_client2026!', 'customer', None, '0503333333'),
        ('demo_courier', 'courier@tzir.com', 'demo_courier2026!', 'courier', None, '0502222222')
    ]
    
    for username, email, pwd, role, adm_role, phone in demos:
        try:
            u = User.query.filter_by(email=email).first()
            if not u:
                u = User.query.filter_by(username=username).first()
            
            if not u:
                print(f"   Creating {username} ({email})")
                u = User(username=username, email=email, phone=phone, user_type=role)
                u.password_hash = generate_password_hash(pwd)
                db.session.add(u)
            else:
                u.password_hash = generate_password_hash(pwd)
            
            u.user_type = role
            u.admin_role = adm_role if role == 'admin' else None
            db.session.flush()
            
            if role == 'courier':
                    if not Courier.query.filter_by(user_id=u.id).first():
                        db.session.add(Courier(user_id=u.id, full_name=f"Demo {username}", vehicle_type='scooter', is_available=True))
            elif role == 'customer':
                    if not Customer.query.filter_by(user_id=u.id).first():
                        db.session.add(Customer(user_id=u.id, full_name=f"Demo {username}", company_name=f"{username} Ltd"))
        except Exception as e:
            print(f"Error handling {username}: {e}")
    
    db.session.commit()
    print("Service Accounts Secured.")

from routes.zones import zones_bp
from routes.protocols import protocols_bp
from routes.customer_orders import customer_orders_bp
from routes.wallet import wallet_bp
from routes.academy_protocols import academy_protocols_bp

def create_app():
    app = Flask(__name__)
    
    # Configuration
    is_production = os.environ.get('FLASK_ENV') == 'production'
    secret_key = os.environ.get('SECRET_KEY')
    jwt_secret_key = os.environ.get('JWT_SECRET_KEY') or secret_key

    if is_production and (not secret_key or not jwt_secret_key):
        raise RuntimeError(
            "SECRET_KEY and JWT_SECRET_KEY must be set in the environment for production."
        )

    app.config['SECRET_KEY'] = secret_key or 'dev-secret-key-change-in-production'
    app.config['JWT_SECRET_KEY'] = jwt_secret_key or app.config['SECRET_KEY']
    
    # Use PostgreSQL if available, otherwise fallback to local sqlite (though we prefer postgres now)
    basedir = os.path.abspath(os.path.dirname(__file__))
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///' + os.path.join(basedir, 'delivery.db'))
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SQLALCHEMY_ECHO'] = False  # Disable echo for production performance
    
    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    
    # Security Configuration
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(minutes=60)
    app.config['JWT_REFRESH_TOKEN_EXPIRES'] = timedelta(days=180)
    
    # JWT Algorithm Confusion Protection:
    # Strictly enforce HS256. Reject alg=none and any RS256/ES256 etc.
    app.config['JWT_ALGORITHM'] = 'HS256'
    app.config['JWT_DECODE_ALGORITHMS'] = ['HS256']
    
    force_https = os.environ.get('FLASK_ENV') == 'production'
    app.config['JWT_TOKEN_LOCATION'] = ['headers', 'cookies']
    app.config['JWT_COOKIE_SECURE'] = force_https
    app.config['JWT_COOKIE_SAMESITE'] = 'None' if force_https else 'Lax'
    app.config['JWT_SESSION_COOKIE'] = False
    app.config['JWT_COOKIE_CSRF_PROTECT'] = False # Doing basic API protection without CSRF double submit for mobile compat

    # Security Middleware Configuration (middleware/api_security.py)
    app.config['SECURITY_HMAC_SECRET'] = os.environ.get('SECURITY_HMAC_SECRET', 'dev-device-hmac-key')
    app.config['SECURITY_HMAC_ENFORCED'] = os.environ.get('SECURITY_HMAC_ENFORCED', 'false').lower() == 'true'
    app.config['SECURITY_ANOMALY_ENABLED'] = os.environ.get('SECURITY_ANOMALY_ENABLED', 'false').lower() == 'true'
    # In-process WAF layer (S3): on by default in production, opt-in elsewhere.
    _waf_default = 'true' if os.environ.get('FLASK_ENV') == 'production' else 'false'
    app.config['SECURITY_WAF_ENABLED'] = os.environ.get('SECURITY_WAF_ENABLED', _waf_default).lower() == 'true'
    
    # Logging Configuration
    import logging
    logging.basicConfig(level=logging.INFO)
    
    jwt.init_app(app)
    limiter.init_app(app)

    # ─── Initialize WebSocket event handlers ─────────────────────────────────
    init_sockets(socketio)

    # ─── JWT blocklist — check TokenBlacklist on every @jwt_required() ────────
    @jwt.token_in_blocklist_loader
    def check_if_token_revoked(jwt_header, jwt_payload):
        from models import TokenBlacklist
        jti = jwt_payload.get("jti")
        return TokenBlacklist.query.filter_by(jti=jti).first() is not None

    # ─── JWT error handlers — always return JSON, never HTML ─────────────────
    from flask_jwt_extended import JWTManager
    from flask_jwt_extended.exceptions import NoAuthorizationError, InvalidHeaderError

    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({
            'error': 'TOKEN_EXPIRED',
            'message': 'הסשן פג, יש להתחבר מחדש'
        }), 401

    @jwt.invalid_token_loader
    def invalid_token_callback(reason):
        return jsonify({
            'error': 'INVALID_TOKEN',
            'message': 'טוקן לא תקין'
        }), 401

    @jwt.unauthorized_loader
    def missing_token_callback(reason):
        return jsonify({
            'error': 'UNAUTHORIZED',
            'message': 'נדרשת התחברות'
        }), 401

    @jwt.revoked_token_loader
    def revoked_token_callback(jwt_header, jwt_payload):
        return jsonify({
            'error': 'TOKEN_REVOKED',
            'message': 'הסשן בוטל, יש להתחבר מחדש'
        }), 401

    # ─── Global error handlers ────────────────────────────────────────────────
    @app.errorhandler(500)
    def internal_server_error(e):
        import logging as _logging
        _logging.error(f"Unhandled 500: {e}", exc_info=True)
        return jsonify({'error': 'שגיאת שרת פנימית'}), 500

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({'error': 'הדף לא נמצא'}), 404

    @app.errorhandler(403)
    def forbidden(e):
        # Consistent JSON for security denials (WAF block, role checks, etc.)
        description = getattr(e, 'description', None) or 'Forbidden'
        return jsonify({
            'error': 'FORBIDDEN',
            'message': description,
            'description': description,
        }), 403

    @app.errorhandler(413)
    def payload_too_large(e):
        return jsonify({'error': 'BODY_TOO_LARGE', 'message': 'Request body too large'}), 413

    @app.errorhandler(429)
    def rate_limit_exceeded(e):
        from flask_limiter import RateLimitExceeded
        response = jsonify({'error': 'RATE_LIMIT', 'message': 'יותר מדי בקשות, נסה שוב מאוחר יותר'})
        response.status_code = 429
        # Set Retry-After and inform the client of the active/reset window.
        limit_info = getattr(e, 'limit', None)
        if hasattr(e, 'reset_at') and getattr(e, 'reset_at'):
            import time
            wait = max(1, int(e.reset_at - time.time()))
            response.headers['Retry-After'] = str(wait)
        elif limit_info is not None:
            response.headers['Retry-After'] = '60'
        try:
            from extensions import limiter as _limiter
            window = _limiter._get_window_stats(request.endpoint, request.environ.get('REMOTE_ADDR'))
            if window:
                remaining = window[0] or 0
                response.headers['X-RateLimit-Remaining'] = str(max(0, remaining))
        except Exception:
            pass
        return response

    @app.errorhandler(Exception)
    def handle_unexpected_exception(e):
        # Let Werkzeug HTTP errors (404, 405, etc.) use their own handlers/status.
        from werkzeug.exceptions import HTTPException
        if isinstance(e, HTTPException):
            return e
        import logging as _logging
        import uuid as _uuid
        error_id = _uuid.uuid4().hex[:12]
        _logging.error(f"Unhandled exception [{error_id}]: {e}", exc_info=True)
        # Never leak internal exception details to the client.
        return jsonify({
            'error': 'שגיאת שרת פנימית',
            'error_id': error_id
        }), 500


    
    flask_env = os.environ.get('FLASK_ENV', 'production')

    # CORS Configuration - Allow frontend to communicate with backend
    CORS(app, resources={
        r"/api/*": {
            "origins": [
                "http://localhost:3000",
                "http://127.0.0.1:3000"
            ],
            "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization", "X-Requested-With"],
            "supports_credentials": True,
            "max_age": 600
        },
        r"/socket.io/*": {
            "origins": [
                "http://localhost:3000",
                "http://127.0.0.1:3000"
            ],
            "supports_credentials": True
        }
    })
    
    # Security Headers with Talisman
    csp = {
        'default-src': ["'self'"],
        'script-src': ["'self'", "'strict-dynamic'", "https://accounts.google.com"],
        'style-src': ["'self'", "'unsafe-inline'", "https://accounts.google.com"],
        'img-src': ["'self'", "data:", "blob:", "https://*.googleusercontent.com"],
        'connect-src': ["'self'", "ws://localhost:3000", "http://localhost:3000", "https://accounts.google.com"],
        'font-src': ["'self'", "https://fonts.gstatic.com"],
        'frame-src': ["'self'", "https://accounts.google.com"],
        'object-src': ["'none'"],
        'report-uri': ["/api/security/csp-report"]
    }

    if flask_env == 'development':
        csp['script-src'].append("'unsafe-eval'")
    
    Talisman(app, 
             content_security_policy=csp, 
             content_security_policy_nonce_in=['script-src'],
             force_https=False,
             strict_transport_security=True,
             session_cookie_secure=force_https,
             session_cookie_samesite='None' if force_https else 'Lax',
             session_cookie_http_only=True)

    @app.after_request
    def add_security_headers(response):
        """Enforce strict security headers for all API requests"""
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        response.headers['Permissions-Policy'] = 'geolocation=(self), microphone=(), camera=()'
        
        # Prevent caching of sensitive API requests
        if request.path.startswith('/api/'):
            response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
            response.headers['Pragma'] = 'no-cache'
            
        return response

    ALLOWED_ORIGINS = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        os.environ.get('FRONTEND_URL', ''),
    ]
    ALLOWED_ORIGINS = [o for o in ALLOWED_ORIGINS if o]  # remove empty strings

    # Initialize SocketIO with Redis message queue; Fix 10: no wildcard CORS
    socketio.init_app(app,
                       cors_allowed_origins=ALLOWED_ORIGINS,
                       message_queue=os.environ.get('REDIS_URL'),
                       async_mode='gevent',
                       manage_session=False,
                       logger=True, 
                       engineio_logger=True)
    
    # Initialize all socket event handlers
    init_sockets(socketio)
    
    # Register blueprints
    from routes.orders import orders_bp
    from routes.couriers import couriers_bp
    from routes.admin import admin_bp
    from routes.auth import auth_bp
    from routes.stats import stats_bp
    from routes.courier_onboarding import courier_onboarding_bp
    from routes.customers import customers_bp
    from routes.external_api import external_api_bp
    from routes.addresses import addresses_bp
    from routes.ratings import ratings_bp
    from routes.earnings_reports import earnings_reports_bp
    from routes.payments import payments_bp
    from routes.customer import customer_bp
    from routes.pricing import pricing_bp
    
    app.register_blueprint(orders_bp, url_prefix='/api/orders')
    app.register_blueprint(pricing_bp, url_prefix='/api/pricing')
    app.register_blueprint(couriers_bp, url_prefix='/api/couriers')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(stats_bp, url_prefix='/api/stats')
    app.register_blueprint(courier_onboarding_bp, url_prefix='/api/courier-onboarding')
    app.register_blueprint(customers_bp, url_prefix='/api/customers')
    app.register_blueprint(external_api_bp, url_prefix='/api/external')
    app.register_blueprint(addresses_bp, url_prefix='/api/addresses')
    app.register_blueprint(ratings_bp, url_prefix='/api/ratings')
    app.register_blueprint(earnings_reports_bp, url_prefix='/api/couriers/earnings')
    app.register_blueprint(payments_bp, url_prefix='/api/payments')
    app.register_blueprint(customer_bp, url_prefix='/api')
    
    from routes.invoices import invoices_bp
    app.register_blueprint(invoices_bp, url_prefix='/api/invoices')
    from routes.hr_compliance import hr_compliance_bp
    app.register_blueprint(hr_compliance_bp, url_prefix='/api/hr')
    from routes.legal import legal_bp
    app.register_blueprint(legal_bp, url_prefix='/api/legal')
    from routes.optimization import optimization_bp
    app.register_blueprint(optimization_bp, url_prefix='/api/optimization')
    from routes.crm import crm_bp
    app.register_blueprint(crm_bp, url_prefix='/api/crm')
    from routes.reports import reports_bp
    app.register_blueprint(reports_bp, url_prefix='/api/reports')
    from routes.support import support_bp
    app.register_blueprint(support_bp, url_prefix='/api/support')
    from routes.freelance import freelance_bp
    app.register_blueprint(freelance_bp, url_prefix='/api/freelance')
    from routes.privacy import privacy_bp
    app.register_blueprint(privacy_bp, url_prefix='/api/privacy')
    # WMS Blueprint
    from routes.wms import wms_bp
    app.register_blueprint(wms_bp, url_prefix='/api/wms')

    from routes.finances import finances_bp
    app.register_blueprint(finances_bp, url_prefix='/api/finances')

    from routes.webauthn import webauthn_bp
    app.register_blueprint(webauthn_bp, url_prefix='/api/webauthn')
    
    from routes.academy import academy_bp
    app.register_blueprint(academy_bp, url_prefix='/api/academy')
    
    from routes.expenses import expenses_bp
    app.register_blueprint(expenses_bp, url_prefix='/api/expenses')
    
    from routes.archive import archive_bp
    app.register_blueprint(archive_bp, url_prefix='/api/archive')

    from routes.tasks import tasks_bp
    app.register_blueprint(tasks_bp, url_prefix='/api/tasks')

    from routes.courier_clients import courier_clients_bp
    app.register_blueprint(courier_clients_bp, url_prefix='/api/courier')

    from routes.courier_vehicles import courier_vehicles_bp
    app.register_blueprint(courier_vehicles_bp, url_prefix='/api/courier')

    from routes.courier_ratings import courier_ratings_bp
    app.register_blueprint(courier_ratings_bp, url_prefix='/api/courier')

    from routes.courier_wallet import courier_wallet_bp
    app.register_blueprint(courier_wallet_bp, url_prefix='/api/courier')

    from routes.courier_notifications import courier_notifications_bp
    app.register_blueprint(courier_notifications_bp, url_prefix='/api/courier')

    from routes.courier_business import courier_business_bp
    app.register_blueprint(courier_business_bp, url_prefix='/api/courier')

    from routes.courier_forms import courier_forms_bp
    app.register_blueprint(courier_forms_bp, url_prefix='/api/courier/forms')

    from routes.google_auth import google_bp
    app.register_blueprint(google_bp, url_prefix='/api')

    from routes.chat import chat_bp
    app.register_blueprint(chat_bp, url_prefix='/api/chat')
    
    # Missing blueprints
    try:
        from routes.settings import settings_bp
        app.register_blueprint(settings_bp, url_prefix='/api/settings')
    except ImportError as e:
        print(f"Warning: Failed to import settings_bp: {e}")
        
    try:
        from routes.zones import zones_bp
        app.register_blueprint(zones_bp, url_prefix='/api/zones')
        app.register_blueprint(protocols_bp, url_prefix='/api/protocols')
        app.register_blueprint(customer_orders_bp, url_prefix='/api/orders/customer')
        app.register_blueprint(wallet_bp, url_prefix='/api/payments/wallet')
        app.register_blueprint(academy_protocols_bp, url_prefix='/api/academy/protocols')
    except ImportError as e:
        print(f"Warning: Failed to import zones_bp: {e}")
    
    # Create database tables if they don't exist
    with app.app_context():
        # Import ObjectHistory so its table gets created
        from utils.audit_trail import ObjectHistory, register_audit_listeners
        db.create_all()
        print("Database tables initialized!")
        
        # Auto-migrate: add missing columns for existing tables
        try:
            from sqlalchemy import inspect, text as sa_text
            inspector = inspect(db.engine)
            
            # Add ticket_number to support_tickets if missing
            st_cols = {c['name'] for c in inspector.get_columns('support_tickets')}
            if 'ticket_number' not in st_cols:
                with db.engine.connect() as conn:
                    conn.execute(sa_text("ALTER TABLE support_tickets ADD COLUMN ticket_number VARCHAR(10)"))
                    conn.commit()
                print("Auto-migrated: added ticket_number to support_tickets")
            
            # Add attachments to ticket_messages if missing
            tm_cols = {c['name'] for c in inspector.get_columns('ticket_messages')}
            if 'attachments' not in tm_cols:
                with db.engine.connect() as conn:
                    dialect = db.engine.dialect.name
                    if dialect == 'sqlite':
                        conn.execute(sa_text("ALTER TABLE ticket_messages ADD COLUMN attachments TEXT DEFAULT '[]'"))
                    else:
                        conn.execute(sa_text("ALTER TABLE ticket_messages ADD COLUMN attachments JSONB DEFAULT '[]'::jsonb"))
                    conn.commit()
                print("Auto-migrated: added attachments to ticket_messages")
            
            # Add read_at to ticket_messages if missing
            tm_cols2 = {c['name'] for c in inspector.get_columns('ticket_messages')}
            if 'read_at' not in tm_cols2:
                with db.engine.connect() as conn:
                    conn.execute(sa_text("ALTER TABLE ticket_messages ADD COLUMN read_at DATETIME"))
                    conn.commit()
                print("Auto-migrated: added read_at to ticket_messages")
        except Exception as auto_mig_err:
            print(f"Auto-migration note (non-fatal): {auto_mig_err}")
        
        # Register the global audit trail event listeners
        register_audit_listeners(db)
        print("Database tables checked/created.")
    
    # HTML Templates routes
    @app.route('/')
    def index():
        return render_template('orders.html')
    
    @app.route('/orders.html')
    def orders_page():
        return render_template('orders.html')
    
    @app.route('/admin.html')
    def admin_page():
        return render_template('admin.html')

    # Health check endpoint for Docker and load balancers
    @app.route('/api/health')
    @limiter.exempt
    def health_check():
        return {'status': 'healthy', 'service': 'tzir-backend'}, 200

    @app.route('/api/security/csp-report', methods=['POST'])
    @limiter.exempt
    def csp_report():
        # ORB (Opaque Response Blocking) requires a valid content-type for non-opaque responses
        return jsonify({'status': 'received'}), 204
    
    # Row-Level Security: Inject User ID into DB Session
    from flask import request
    from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
    from sqlalchemy import text
    
    @app.before_request
    def set_db_context():
        # Only inject context for API routes requiring DB access
        if request.path.startswith('/api/'):
            try:
                # IMPORTANT: We are temporarily catching all errors here because
                # flask_jwt_extended might raise errors if not fully configured 
                # (e.g. missing JWTManager(app))
                try:
                    verify_jwt_in_request(optional=True)
                    identity = get_jwt_identity()
                except Exception as e:
                    # If JWT verification fails (e.g. not configured), treat as anonymous
                    identity = None
                    # print(f"DEBUG: JWT Verification Warning: {e}")

                if identity and 'postgresql' in str(db.engine.url):
                    # Fetch user to check role (adds 1 query overhead but ensures security)
                    from models import User
                    # Coerce identity to int; invalid values fall through to anonymous.
                    user_id = int(identity)
                    user = User.query.get(user_id)

                    is_admin = 'true' if (user and user.user_type == 'admin') else 'false'
                    # Use set_config() with bound parameters to prevent SQL injection
                    # via the JWT identity claim (SET LOCAL cannot take bind params).
                    db.session.execute(
                        text("SELECT set_config('app.is_admin', :is_admin, true)"),
                        {"is_admin": is_admin},
                    )
                    db.session.execute(
                        text("SELECT set_config('app.current_user_id', :uid, true)"),
                        {"uid": str(user_id)},
                    )
                elif 'postgresql' in str(db.engine.url):
                    # Anonymous
                    db.session.execute(
                        text("SELECT set_config('app.current_user_id', '-1', true)")
                    )
                    db.session.execute(
                        text("SELECT set_config('app.is_admin', 'false', true)")
                    )
                    
            except Exception as e:
                db.session.rollback()
                # print(f"DEBUG: DB Context Error: {e}")
                pass

    from utils.ip_blocker import check_ip_block
    app.before_request(check_ip_block)

    # Consolidated API security guard (threat-intel + anomaly + optional HMAC).
    # Non-breaking in local dev: HMAC is only enforced when SECURITY_HMAC_ENFORCED
    # is set or when a client actually sends signature headers.
    from middleware.api_security import security_guard
    app.before_request(security_guard)

    # OpenAPI 3.0 spec (/api/openapi.json), API reference page (/api/docs) and
    # runtime JSON schema validation (S3). Registered last so every blueprint's
    # routes are included in the URL map.
    from utils.openapi import register_openapi
    register_openapi(app)
    
    # Create database tables & Auto-Seed
    with app.app_context():
        try:
            db.create_all()
            print("Database tables checked/created.")
            
            # Check if seeding is needed
            from sqlalchemy import inspect
            inspector = inspect(db.engine)
            if inspector.has_table("users"):
                from models import User
                if User.query.first() is None:
                     print("Database empty. Auto-seeding demo users...")
                     try:
                         # Run the seeding logic directly
                         create_demo_users_logic()
                     except Exception as s_err:
                         print(f"ג ן¸ Auto-seeding failed: {s_err}")
                         import traceback
                         traceback.print_exc()
        except Exception as e:
            print(f"ג ן¸ Database setup warning: {e}")
            print("Continuing application startup...")


    
    # Note: socket events are initialized via init_sockets(socketio) earlier in have 
    # create_app to ensures all blueprints can use it.
    
    @app.cli.command("create-demo-users")
    def create_demo_users():
        """Create secure demo users for Admin, Finance, Courier, and Customer."""
        create_demo_users_logic()

    @app.cli.command("create-api-key")
    @click.argument("name")
    def create_api_key(name):
        """Create a new API Key for a merchant."""
        import secrets
        from models import ApiKey
        
        # Generate prefix and secret
        prefix = secrets.token_hex(4) # 8 chars
        secret = secrets.token_urlsafe(32)
        full_key = f"{prefix}.{secret}"
        
        # Hash the secret (werkzeug)
        from werkzeug.security import generate_password_hash
        key_hash = generate_password_hash(secret)
        
        new_key = ApiKey(
            prefix=prefix,
            key_hash=key_hash,
            merchant_name=name
        )
        db.session.add(new_key)
        db.session.commit()
        
        print(f"API Key Created for '{name}'")
        print(f"נ”‘ Key: {full_key}")
        print("ג ן¸  SAVE THIS KEY! It cannot be retrieved later.")

    @app.cli.command("seed-perf")
    def seed_performance():
        """Generates 10k users and orders for stress testing."""
        from models import User, Courier, Customer
        import random
        
        print("Starting High-Performance Seeding (10k Couriers)...")
        if User.query.count() > 5000:
            print("ג ן¸ Database already has significant data. Aborting.")
            return

        users = []
        couriers = []
        base_lat, base_lng = 32.0853, 34.7818
        
        for i in range(10000):
            u = User(username=f'perf_c_{i}', email=f'perf_c_{i}@test.com', phone=f'059{i:07d}', user_type='courier')
            u.set_password('123456')
            users.append(u)
            
            is_active = i < 1000 # 10% active
            c = Courier(user=u, full_name=f"Courier {i}", vehicle_type=random.choice(['scooter', 'car', 'bicycle']), is_available=is_active, current_location_lat=base_lat + random.uniform(-0.1, 0.1) if is_active else None, current_location_lng=base_lng + random.uniform(-0.1, 0.1) if is_active else None, rating=round(random.uniform(3.5, 5.0), 2), total_deliveries=random.randint(0, 1000))
            couriers.append(c)
            
            if len(users) >= 1000:
                db.session.add_all(users)
                db.session.flush()
                for idx, usr in enumerate(users): couriers[idx].user_id = usr.id 
                db.session.add_all(couriers)
                db.session.commit()
                users = []; couriers = []
                print(f"   ... Committed batch {i}")
        
        if users: db.session.add_all(users); db.session.add_all(couriers); db.session.commit()
        print("Data Generation Complete!")

    # Start APScheduler for DB backups (skipped in tests or when disabled).
    disable_scheduler = os.environ.get('DISABLE_SCHEDULER', '').lower() in ('1', 'true', 'yes')
    if not disable_scheduler:
        try:
            from utils.backup import init_scheduler
            init_scheduler()
        except Exception as scheduler_error:
            print(f"Warning: backup scheduler disabled due to error: {scheduler_error}")

    return app

def _tls_context():
    """Env-driven TLS for the dev server: an ssl.SSLContext if TZIR_TLS_CERT/KEY
    are set, else None (plain HTTP). gevent's WSGIServer requires a context
    object, not a (cert, key) tuple.

    Cert swap (self-signed -> real CA) is a config change only: replace the files
    these env vars point at (see docs/TLS_CERT_SWAP_PLAN.md).
    """
    cert = os.environ.get('TZIR_TLS_CERT')
    key = os.environ.get('TZIR_TLS_KEY')
    if not cert or not key:
        return None
    import ssl
    ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    ctx.load_cert_chain(certfile=cert, keyfile=key)
    return ctx

if __name__ == '__main__':
    app = create_app()
    port = int(os.environ.get('PORT', '5000'))
    debug = os.environ.get('FLASK_DEBUG', 'false').lower() == 'true'
    # gevent's WSGIServer crashes when ssl_context is passed as None (it uses
    # the key directly), so only include the kwarg when TLS is actually enabled.
    tls = _tls_context()
    run_kwargs = {}
    if tls is not None:
        run_kwargs['ssl_context'] = tls
    socketio.run(app, debug=debug, use_reloader=debug, host='0.0.0.0', port=port, **run_kwargs)

