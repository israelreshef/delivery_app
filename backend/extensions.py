from flask_sqlalchemy import SQLAlchemy
from flask_socketio import SocketIO
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import os

from utils.rate_limits import rate_limit_key

# Initialize extensions generically
# They will be bound to the app in create_app()

db = SQLAlchemy()
socketio = SocketIO()
migrate = Migrate()
jwt = JWTManager()
# Security: global default rate limits so un-decorated endpoints are still
# protected. Keying is composite (per-user for authenticated traffic,
# per-IP for anonymous) via utils.rate_limits.rate_limit_key.
_redis_url = os.environ.get('REDIS_URL')
limiter = Limiter(
    key_func=rate_limit_key,
    default_limits=["50000 per day", "10000 per hour"],
    storage_uri=_redis_url or "memory://",
)
