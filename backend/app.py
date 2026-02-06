from gevent import monkey
monkey.patch_all()

from flask import Flask, render_template
from flask_cors import CORS
from extensions import socketio, db, migrate, jwt, limiter
from datetime import timedelta
import click
import os
# Ensure models are imported for SQLAlchemy migrations
from models import * 

def create_demo_users_logic():
    from werkzeug.security import generate_password_hash
    from models import User, Courier, Customer
    
    print("🔐 Creating Secure Demo Accounts...")
    demos = [
        ('super_admin', 'admin@tzir.com', 'TzirSuper2026!$!', 'admin', 'super_admin', '0501111111'),
        ('finance_admin', 'finance@tzir.com', 'TzirFinance$$99', 'admin', 'finance_admin', '0504444444'),
        ('demo_client', 'client@tzir.com', 'TzirClient2026!', 'customer', None, '0503333333'),
        ('demo_courier', 'courier@tzir.com', 'TzirRiderSpeed!77', 'courier', None, '0502222222')
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
    print("✅ Service Accounts Secured.")

def create_app():
    app = Flask(__name__)
    
    # Configuration
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
    # Use PostgreSQL if available, otherwise fallback to local sqlite (though we prefer postgres now)
    # Use PostgreSQL if available, otherwise fallback to local sqlite (though we prefer postgres now)
    # Default to SQLite for local development ease if no Env Var is set
    basedir = os.path.abspath(os.path.dirname(__file__))
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///' + os.path.join(basedir, 'delivery.db'))
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SQLALCHEMY_ECHO'] = False  # Disable echo for production performance
    
    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    
    # Security Configuration
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(minutes=30)
    
    # Logging Configuration
    import logging
    logging.basicConfig(level=logging.INFO)
    
    jwt.init_app(app)
    limiter.init_app(app)
    
    # CORS Configuration - Allow frontend to communicate with backend
    cors_origins = os.environ.get('CORS_ORIGINS', 'http://localhost:3000').split(',')
    CORS(app, 
         resources={r"/*": {  # Changed from /api/* to /* to cover all routes
             "origins": cors_origins,
             "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
             "allow_headers": ["Content-Type", "Authorization", "X-API-Key"],
             "expose_headers": ["Content-Type", "Authorization"],
             "supports_credentials": True,
             "max_age": 3600
         }},
         supports_credentials=True)
    
    # Initialize SocketIO with Redis message queue
    socketio.init_app(app, 
                       cors_allowed_origins="*", 
                       message_queue=os.environ.get('REDIS_URL'),
                       async_mode='gevent')
    
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
    
    app.register_blueprint(orders_bp, url_prefix='/api/orders')
    app.register_blueprint(couriers_bp, url_prefix='/api/couriers')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(stats_bp, url_prefix='/api/stats')
    app.register_blueprint(courier_onboarding_bp, url_prefix='/api/courier-onboarding')
    app.register_blueprint(customers_bp, url_prefix='/api/customers')
    app.register_blueprint(external_api_bp, url_prefix='/api/external')
    app.register_blueprint(addresses_bp, url_prefix='/api/addresses')
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

    from routes.webauthn import webauthn_bp
    app.register_blueprint(webauthn_bp, url_prefix='/api/webauthn')
    
    # Create database tables if they don't exist
    with app.app_context():
        db.create_all()
        print("✅ Database tables initialized!")
    
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
    def health_check():
        return {'status': 'healthy', 'service': 'tzir-backend'}, 200
    
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

                if identity:
                    # Fetch user to check role (adds 1 query overhead but ensures security)
                    from models import User 
                    user = User.query.get(int(identity))
                    
                    if user and user.user_type == 'admin':
                        db.session.execute(text("SET LOCAL app.is_admin = 'true'"))
                    else:
                        db.session.execute(text("SET LOCAL app.is_admin = 'false'"))

                    db.session.execute(text(f"SET LOCAL app.current_user_id = '{identity}'"))
                else:
                    # Anonymous
                    db.session.execute(text("SET LOCAL app.current_user_id = '-1'"))
                    db.session.execute(text("SET LOCAL app.is_admin = 'false'"))
                    
            except Exception as e:
                # Fallback implementation if anything goes wrong with DB context
                # print(f"DEBUG: DB Context Error: {e}")
                pass
    
    # Create database tables & Auto-Seed
    with app.app_context():
        try:
            db.create_all()
            print("✅ Database tables checked/created.")
            
            # Check if seeding is needed
            from sqlalchemy import inspect
            inspector = inspect(db.engine)
            if inspector.has_table("users"):
                from models import User
                if User.query.first() is None:
                     print("🌱 Database empty. Auto-seeding demo users...")
                     try:
                         # Run the seeding logic directly
                         create_demo_users_logic()
                     except Exception as s_err:
                         print(f"⚠️ Auto-seeding failed: {s_err}")
                         import traceback
                         traceback.print_exc()
        except Exception as e:
            print(f"⚠️ Database setup warning: {e}")
            print("Continuing application startup...")


    
    # Socket.IO events
    from sockets.delivery_events import register_socket_events
    register_socket_events(socketio)
    
    from sockets.chat_events import register_chat_events
    register_chat_events(socketio)
    
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
        
        print(f"✅ API Key Created for '{name}'")
        print(f"🔑 Key: {full_key}")
        print("⚠️  SAVE THIS KEY! It cannot be retrieved later.")

    @app.cli.command("seed-perf")
    def seed_performance():
        """Generates 10k users and orders for stress testing."""
        from models import User, Courier, Customer
        import random
        
        print("🚀 Starting High-Performance Seeding (10k Couriers)...")
        if User.query.count() > 5000:
            print("⚠️ Database already has significant data. Aborting.")
            return

        users = []
        couriers = []
        base_lat, base_lng = 32.0853, 34.7818
        
        for i in range(10000):
            u = User(username=f'perf_c_{i}', email=f'perf_c_{i}@test.com', phone=f'059{i:07d}', user_type='courier')
            u.set_password('123456')
            users.append(u)
            
            is_active = i < 1000 # 10% active
            c = Courier(user=u, full_name=f"Courier {i}", vehicle_type=random.choice(['scooter', 'car', 'bike']), is_available=is_active, current_location_lat=base_lat + random.uniform(-0.1, 0.1) if is_active else None, current_location_lng=base_lng + random.uniform(-0.1, 0.1) if is_active else None, rating=round(random.uniform(3.5, 5.0), 2), total_deliveries=random.randint(0, 1000))
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
        print("✅ Data Generation Complete!")

    return app

if __name__ == '__main__':
    app = create_app()
    socketio.run(app, debug=True, use_reloader=False, host='0.0.0.0', port=5000)
