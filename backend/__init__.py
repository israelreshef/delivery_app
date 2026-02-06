from flask import Flask, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_socketio import SocketIO
from flask_jwt_extended import JWTManager
from .config import Config

db = SQLAlchemy()
socketio = SocketIO(cors_allowed_origins="*")  # להתחלה - מאפשר מכל מקור
jwt = JWTManager()

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # אתחול הרחבות
    db.init_app(app)
    socketio.init_app(app)
    jwt.init_app(app)
    
    # רישום routes
    from .routes import orders_bp, auth_bp, payments_bp, chat_bp, stats_bp, couriers_bp, zones_bp, settings_bp, reports_bp
    app.register_blueprint(auth_bp, url_prefix='/auth')  # ✅ Fixed: Added /auth prefix
    app.register_blueprint(orders_bp, url_prefix='/api/orders')
    app.register_blueprint(payments_bp, url_prefix='/api/payments')
    app.register_blueprint(chat_bp, url_prefix='/api/chat')
    app.register_blueprint(stats_bp, url_prefix='/api/stats')
    app.register_blueprint(couriers_bp, url_prefix='/api/couriers')
    app.register_blueprint(zones_bp, url_prefix='/api/zones')
    app.register_blueprint(settings_bp, url_prefix='/api/settings')
    app.register_blueprint(reports_bp, url_prefix='/api/reports')
    
    # רישום sockets
    from .sockets import init_sockets
    init_sockets(socketio)
    
    # === חלק חדש: הגשת קבצי HTML מתיקיית templates ===
    @app.route('/<filename>.html')
    def serve_html(filename):
        """מגיש קבצי HTML כמו orders.html, admin.html, courier.html"""
        return send_from_directory(app.template_folder, f"{filename}.html")
    
    @app.route('/')
    def index():
        """דף הבית – פותח אוטומטית את orders.html"""
        return send_from_directory(app.template_folder, 'orders.html')
    
    # === סוף החלק החדש ===
    
    # יצירת טבלאות אם לא קיימות (לפיתוח בלבד!)
    with app.app_context():
        db.create_all()
    
    return app, socketio