from flask import Blueprint, request, jsonify, session, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User, WebAuthnCredential
from webauthn import (
    generate_registration_options,
    verify_registration_response,
    options_to_json,
    base64url_to_bytes,
    generate_authentication_options,
    verify_authentication_response
)
from webauthn.helpers.structs import (
    AttestationConveyancePreference,
    AuthenticatorAttachment,
    AuthenticatorSelectionCriteria,
    ResidentKeyRequirement,
    UserVerificationRequirement,
    RegistrationCredential,
    AuthenticationCredential
)
import os

webauthn_bp = Blueprint('webauthn', __name__)

# Configuration (In production, replace with real domain)
RP_ID = 'localhost'
RP_NAME = 'TZIR Delivery'
ORIGIN = 'http://localhost:3000'

@webauthn_bp.route('/register/options', methods=['POST'])
@jwt_required()
def register_options():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user:
        return jsonify({"error": "User not found"}), 404

    # Get existing credentials to prevent re-registration
    user_credentials = WebAuthnCredential.query.filter_by(user_id=user.id).all()
    
    options = generate_registration_options(
        rp_id=RP_ID,
        rp_name=RP_NAME,
        user_id=str(user.id).encode(),
        user_name=user.username,
        attestation=AttestationConveyancePreference.NONE,
        exclude_credentials=[
            {"id": cred.credential_id, "transports": cred.transports, "type": "public-key"}
            for cred in user_credentials
        ]
    )
    
    # Store challenge in session (or cache) for verification
    # Note: Flask session is signed but client-side cookie by default. 
    # Ensure SECRET_KEY is set securely.
    session['current_registration_challenge'] = options.challenge

    return jsonify(options_to_json(options))

@webauthn_bp.route('/register/verify', methods=['POST'])
@jwt_required()
def register_verify():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user:
        return jsonify({"error": "User not found"}), 404

    challenge = session.get('current_registration_challenge')
    if not challenge:
        return jsonify({"error": "Challenge not found"}), 400

    registration_response = request.json
    
    try:
        verification = verify_registration_response(
            credential=RegistrationCredential.parse_obj(registration_response),
            expected_challenge=challenge,
            expected_origin=ORIGIN,
            expected_rp_id=RP_ID,
            require_user_verification=True
        )
        
        # Save credential to DB
        new_credential = WebAuthnCredential(
            user_id=user.id,
            credential_id=verification.credential_id,
            public_key=verification.credential_public_key,
            sign_count=verification.sign_count,
            transports="" # Optional
        )
        db.session.add(new_credential)
        db.session.commit()
        
        return jsonify({"verified": True})
    except Exception as e:
        return jsonify({"verified": False, "error": str(e)}), 400

@webauthn_bp.route('/auth/options', methods=['POST'])
@jwt_required()
def auth_options():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user:
        return jsonify({"error": "User not found"}), 404
        
    options = generate_authentication_options(
        rp_id=RP_ID,
        user_verification=UserVerificationRequirement.REQUIRED,
        allow_credentials=[
            {"id": cred.credential_id, "type": "public-key"} 
            for cred in user.webauthn_credentials
        ]
    )
    
    session['current_authentication_challenge'] = options.challenge
    
    return jsonify(options_to_json(options))

@webauthn_bp.route('/auth/verify', methods=['POST'])
@jwt_required()
def auth_verify():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    challenge = session.get('current_authentication_challenge')
    if not challenge:
        return jsonify({"error": "Challenge not found"}), 400

    auth_response = request.json
    credential_id_b64 = auth_response.get('id')
    
    # Simple lookup - in real app might be more robust
    credential_id_bytes = base64url_to_bytes(credential_id_b64)
    credential = WebAuthnCredential.query.filter_by(credential_id=credential_id_bytes).first()
    
    if not credential:
        return jsonify({"error": "Credential not found"}), 400
        
    try:
        verification = verify_authentication_response(
            credential=AuthenticationCredential.parse_obj(auth_response),
            expected_challenge=challenge,
            expected_rp_id=RP_ID,
            expected_origin=ORIGIN,
            credential_public_key=credential.public_key,
            credential_current_sign_count=credential.sign_count
        )
        
        # Update counter
        credential.sign_count = verification.new_sign_count
        db.session.commit()
        
        return jsonify({"verified": True})
    except Exception as e:
        return jsonify({"verified": False, "error": str(e)}), 400
