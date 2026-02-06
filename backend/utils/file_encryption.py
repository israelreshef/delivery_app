
import os
from cryptography.fernet import Fernet
import logging

# Generate a key if not exists (In production, this should be consistent and stored securely)
# For this implementation, we will try to load from ENV or a key file, otherwise generate one.
KEY_FILE = 'file_key.key'

def load_or_generate_key():
    if os.environ.get('FILE_ENCRYPTION_KEY'):
        return os.environ.get('FILE_ENCRYPTION_KEY').encode()
    
    if os.path.exists(KEY_FILE):
        with open(KEY_FILE, 'rb') as f:
            return f.read()
    
    key = Fernet.generate_key()
    with open(KEY_FILE, 'wb') as f:
        f.write(key)
    return key

try:
    cipher_suite = Fernet(load_or_generate_key())
except Exception as e:
    logging.error(f"Failed to initialize encryption key: {e}")
    # Fallback for dev - DANGEROUS in prod but prevents crash loop if key is bad
    cipher_suite = Fernet(Fernet.generate_key())

def encrypt_data(data: bytes) -> bytes:
    """Encrypts raw bytes"""
    return cipher_suite.encrypt(data)

def decrypt_data(token: bytes) -> bytes:
    """Decrypts encrypted bytes"""
    return cipher_suite.decrypt(token)

def encrypt_file(input_path, output_path):
    """Reads file from input_path, encrypts, writes to output_path"""
    with open(input_path, 'rb') as f:
        data = f.read()
    encrypted = encrypt_data(data)
    with open(output_path, 'wb') as f:
        f.write(encrypted)

def decrypt_file_to_memory(encrypted_path) -> bytes:
    """Reads encrypted file and returns decrypted bytes"""
    with open(encrypted_path, 'rb') as f:
        encrypted_data = f.read()
    return decrypt_data(encrypted_data)
