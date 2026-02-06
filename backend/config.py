import os
from datetime import timedelta

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production!'
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or 'jwt-secret-very-secure-2025'
    
    # Database Configuration
    # Prioritize environment variable, fallback to local Docker connection
    
    # Handle common cloud provider protocols
    uri = os.environ.get('DATABASE_URL', 'postgresql://delivery_user:delivery_pass@localhost:5432/delivery_db')
    if uri and uri.startswith('postgres://'):
        uri = uri.replace('postgres://', 'postgresql://', 1)
    
    SQLALCHEMY_DATABASE_URI = uri

    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # JWT הגדרות
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    
    # SocketIO (לעדכונים בזמן אמת)
    SOCKETIO_MESSAGE_QUEUE = None  # None = אין Redis, משתמש ב-polling פשוט להתחלה