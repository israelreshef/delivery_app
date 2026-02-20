from google.oauth2 import id_token
from google.auth.transport import requests
from app.core.config import settings

class GoogleAuth:
    @staticmethod
    def verify_id_token(token: str) -> dict:
        """
        Verifies the Google ID token and returns the user info.
        In dev mode (GOOGLE_CLIENT_ID='dev-mode'), accepts any token and creates a dev user.
        """
        # Dev mode bypass - for local development without Google Cloud credentials
        if settings.GOOGLE_CLIENT_ID == "dev-mode":
            print("⚠️  DEV MODE: Bypassing Google token verification")
            # Parse the token as a simple JSON or just return dev user info
            return {
                'email': 'dev-courier@tzir.com',
                'name': 'Dev Courier',
                'iss': 'accounts.google.com',
                'sub': 'dev-user-123',
            }

        try:
            # Specify the CLIENT_ID of the app that accesses the backend:
            id_info = id_token.verify_oauth2_token(
                token, requests.Request(), settings.GOOGLE_CLIENT_ID
            )

            if id_info['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
                raise ValueError('Wrong issuer.')

            return id_info
        except ValueError as e:
            # Invalid token
            print(f"Error verifying Google token: {e}")
            return None
