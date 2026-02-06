from app import create_app, db
from models import WebAuthnCredential

app = create_app()

with app.app_context():
    print("Creating webauthn_credentials table...")
    WebAuthnCredential.__table__.create(db.engine)
    print("Done!")
