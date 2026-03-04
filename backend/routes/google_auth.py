import os
import datetime
from flask import Blueprint, request, jsonify, redirect
from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from utils.decorators import token_required
from models import User
from extensions import db

google_bp = Blueprint('google_oauth', __name__)

SCOPES = [
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/calendar.calendarlist.readonly'
]

def get_google_auth_config():
    client_id = os.environ.get('GOOGLE_CLIENT_ID')
    client_secret = os.environ.get('GOOGLE_CLIENT_SECRET')
    
    if not client_id or not client_secret:
        return None
        
    return {
        "web": {
            "client_id": client_id,
            "project_id": "tzir-delivery",
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
            "client_secret": client_secret,
            "redirect_uris": [os.environ.get('GOOGLE_REDIRECT_URI', 'http://localhost:5000/api/auth/google/callback')]
        }
    }

@google_bp.route('/auth/google/sync', methods=['GET'])
@token_required
def google_sync_start(current_user):
    """
    Initiates the Google OAuth flow to grant offline calendar access.
    Passes the user ID in the state parameter to link the callback.
    """
    config = get_google_auth_config()
    if not config:
        return jsonify({'error': 'Google OAuth credentials not configured on server.'}), 500
        
    try:
        flow = Flow.from_client_config(
            config,
            scopes=SCOPES,
            redirect_uri=config['web']['redirect_uris'][0]
        )
        
        # We must request offline access to get a refresh token
        authorization_url, state = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true',
            prompt='consent',  # Force consent screen to guarantee refresh token
            state=str(current_user.id)
        )
        
        return jsonify({'auth_url': authorization_url})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@google_bp.route('/auth/google/callback', methods=['GET'])
def google_callback():
    """
    Handles the Google OAuth redirect.
    Exchanges the code for credentials and saves them to the User.
    """
    state_user_id = request.args.get('state')
    error = request.args.get('error')
    
    frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
    
    if error:
        return redirect(f"{frontend_url}/admin/crm?google_sync=error&reason={error}")
        
    if not state_user_id:
        return redirect(f"{frontend_url}/admin/crm?google_sync=error&reason=missing_state")
        
    config = get_google_auth_config()
    if not config:
        return redirect(f"{frontend_url}/admin/crm?google_sync=error&reason=server_misconfigured")
        
    try:
        flow = Flow.from_client_config(
            config,
            scopes=SCOPES,
            redirect_uri=config['web']['redirect_uris'][0]
        )
        
        # Use the full URL to fetch the token
        flow.fetch_token(authorization_response=request.url.replace('http://', 'https://'))
        credentials = flow.credentials
        
        user = User.query.get(int(state_user_id))
        if not user:
            return redirect(f"{frontend_url}/admin/crm?google_sync=error&reason=user_not_found")
            
        # Store tokens in the database
        user.google_access_token = credentials.token
        if credentials.refresh_token:
            user.google_refresh_token = credentials.refresh_token
            
        if credentials.expiry:
            user.google_token_expiry = credentials.expiry
            
        db.session.commit()
        
        return redirect(f"{frontend_url}/admin/crm?google_sync=success")
        
    except Exception as e:
        db.session.rollback()
        print(f"Google OAuth Error: {str(e)}")
        return redirect(f"{frontend_url}/admin/crm?google_sync=error&reason=token_exchange_failed")
