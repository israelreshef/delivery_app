from cryptography.fernet import Fernet
import os
import base64
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

class EncryptionService:
    def __init__(self, key=None):
        # In production, this key should come from environment variables or Vault
        # If not provided, it generates one (for dev only)
        
        env_key = os.environ.get('ENCRYPTION_KEY')
        
        if env_key:
            self.cipher_suite = Fernet(env_key.encode())
        elif key:
             self.cipher_suite = Fernet(key)
        else:
            # Dev fallback - Generate a key derived from SECRET_KEY
            secret = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production').encode()
            salt = b'static_salt_for_dev_only' # Change in prod
            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=32,
                salt=salt,
                iterations=100000,
            )
            key = base64.urlsafe_b64encode(kdf.derive(secret))
            self.cipher_suite = Fernet(key)

    def encrypt_data(self, data):
        """Encrypts a string or bytes"""
        if not data:
            return None
        if isinstance(data, str):
            data = data.encode()
        
        encrypted_data = self.cipher_suite.encrypt(data)
        return encrypted_data.decode('utf-8')

    def decrypt_data(self, encrypted_data):
        """Decrypts a base64 encoded string"""
        if not encrypted_data:
            return None
        
        try:
            if isinstance(encrypted_data, str):
                encrypted_data = encrypted_data.encode()
            
            decrypted_data = self.cipher_suite.decrypt(encrypted_data)
            return decrypted_data.decode('utf-8')
        except Exception as e:
            print(f"Decryption error: {e}")
            return None

# Singleton instance
crypto_service = EncryptionService()
