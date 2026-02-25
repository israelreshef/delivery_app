import os
import jwt
from datetime import datetime, timedelta
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend
import logging

class CertificateService:
    """
    Phase 4: Standalone Digital Certificates.
    PKI infrastructure to generate digitally signed credentials (JWTs) using ECDSA/RSA.
    These can be embedded into QR Codes or Apple/Google Wallet.
    """
    
    KEY_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'keys')
    PRIVATE_KEY_PATH = os.path.join(KEY_DIR, 'cert_private_key.pem')
    PUBLIC_KEY_PATH = os.path.join(KEY_DIR, 'cert_public_key.pem')
    
    @classmethod
    def _ensure_keys_exist(cls):
        """Generates RSA-2048 keys if they don't exist"""
        if not os.path.exists(cls.KEY_DIR):
            os.makedirs(cls.KEY_DIR)
            
        if not os.path.exists(cls.PRIVATE_KEY_PATH) or not os.path.exists(cls.PUBLIC_KEY_PATH):
            logging.info("Generating new RSA Key Pair for Digital Certificates...")
            private_key = rsa.generate_private_key(
                public_exponent=65537,
                key_size=2048,
                backend=default_backend()
            )
            public_key = private_key.public_key()
            
            # Save Private Key
            with open(cls.PRIVATE_KEY_PATH, 'wb') as f:
                f.write(private_key.private_bytes(
                    encoding=serialization.Encoding.PEM,
                    format=serialization.PrivateFormat.PKCS8,
                    encryption_algorithm=serialization.NoEncryption()
                ))
            
            # Save Public Key
            with open(cls.PUBLIC_KEY_PATH, 'wb') as f:
                f.write(public_key.public_bytes(
                    encoding=serialization.Encoding.PEM,
                    format=serialization.PublicFormat.SubjectPublicKeyInfo
                ))

    @classmethod
    def generate_certificate(cls, courier_name, courier_id, course_title, valid_days=365):
        """Generate a cryptographically signed static token (JWT) representing a certification."""
        cls._ensure_keys_exist()
        
        with open(cls.PRIVATE_KEY_PATH, 'rb') as f:
            private_key = f.read()
            
        payload = {
            'iss': 'TZIR_ACADEMY_AUTHORITY',
            'sub': str(courier_id),
            'name': courier_name,
            'cert_type': course_title,
            'iat': datetime.utcnow(),
            'exp': datetime.utcnow() + timedelta(days=valid_days),
            'doc_type': 'VERIFIED_COURIER_CREDENTIAL'
        }
        
        # Sign with RS256 algorithm using our private key
        encoded_jwt = jwt.encode(payload, private_key, algorithm="RS256")
        return encoded_jwt

    @classmethod
    def verify_certificate(cls, token_string):
        """Verify the cryptographic signature statically (no DB hit required for authenticity)."""
        cls._ensure_keys_exist()
        
        with open(cls.PUBLIC_KEY_PATH, 'rb') as f:
            public_key = f.read()
            
        try:
            decoded = jwt.decode(
                token_string, 
                public_key, 
                algorithms=["RS256"],
                issuer='TZIR_ACADEMY_AUTHORITY'
            )
            return {'valid': True, 'data': decoded}
        except jwt.ExpiredSignatureError:
            return {'valid': False, 'error': 'Certificate has expired'}
        except jwt.InvalidTokenError as e:
            return {'valid': False, 'error': f'Invalid cryptographic signature: {e}'}
