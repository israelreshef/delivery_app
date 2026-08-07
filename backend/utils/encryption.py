import os
import base64
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

def _get_key():
    """Derives a 256-bit key from the app's SECRET_KEY for AES-GCM encryption."""
    secret = os.environ.get('SECRET_KEY', 'default-dev-secret-key').encode()
    salt = b'tzir-delivery-salt' # In production, this should ideally be unique/stored
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=100000,
    )
    return kdf.derive(secret)

def encrypt_data(data: str) -> str:
    """Encrypts a string using AES-256-GCM and returns a base64 encoded string."""
    if not data:
        return None
    
    key = _get_key()
    aesgcm = AESGCM(key)
    nonce = os.urandom(12)
    encrypted_data = aesgcm.encrypt(nonce, data.encode(), None)
    
    # Store nonce with data
    combined = nonce + encrypted_data
    return base64.b64encode(combined).decode('utf-8')

def decrypt_data(token: str) -> str:
    """Decrypts a base64 encoded string using AES-256-GCM."""
    if not token:
        return None
    
    try:
        combined = base64.b64decode(token.encode('utf-8'))
        nonce = combined[:12]
        encrypted_data = combined[12:]
        
        key = _get_key()
        aesgcm = AESGCM(key)
        decrypted_data = aesgcm.decrypt(nonce, encrypted_data, None)
        return decrypted_data.decode('utf-8')
    except Exception as e:
        print(f"Decryption Error: {e}")
        return None


def encrypt_bytes(data: bytes) -> bytes:
    """Encrypts raw bytes using AES-256-GCM and returns the raw ciphertext.

    Returns ``None`` for empty/falsy input. The 12-byte nonce is prepended to the
    ciphertext so it can travel alongside the payload and be split on decrypt.
    """
    if not data:
        return None

    key = _get_key()
    aesgcm = AESGCM(key)
    nonce = os.urandom(12)
    return nonce + aesgcm.encrypt(nonce, data, None)


def decrypt_bytes(token: bytes) -> bytes:
    """Decrypts bytes produced by :func:`encrypt_bytes` back to plaintext bytes."""
    if not token:
        return None

    try:
        nonce = token[:12]
        key = _get_key()
        aesgcm = AESGCM(key)
        return aesgcm.decrypt(nonce, token[12:], None)
    except Exception as e:
        print(f"Decryption Error: {e}")
        return None
