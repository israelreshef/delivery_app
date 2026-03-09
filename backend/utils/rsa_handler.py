import os
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import serialization, hashes

# נתיב למפתחות - בסביבת ייצור נשתמש ב-Vault או משתני סביבה
PRIVATE_KEY_PATH = 'private_key.pem'
PUBLIC_KEY_PATH = 'public_key.pem'

class RSAKeyManager:
    def __init__(self):
        self.private_key = None
        self.public_key = None
        self._load_or_generate_keys()

    def _load_or_generate_keys(self):
        """טעינת מפתחות קיימים או יצירת חדשים"""
        if os.path.exists(PRIVATE_KEY_PATH) and os.path.exists(PUBLIC_KEY_PATH):
            self._load_keys()
        else:
            self._generate_keys()

    def _generate_keys(self):
        """יצירת זוג מפתחות חדש"""
        print(" Generating new RSA Key Pair for E2EE...")
        self.private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048,
        )
        self.public_key = self.private_key.public_key()
        
        # שמירה לקובץ (בייצור יש להגן על ה-Private Key!)
        with open(PRIVATE_KEY_PATH, "wb") as f:
            f.write(self.private_key.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.PKCS8,
                encryption_algorithm=serialization.NoEncryption()
            ))
            
        with open(PUBLIC_KEY_PATH, "wb") as f:
            f.write(self.public_key.public_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PublicFormat.SubjectPublicKeyInfo
            ))

    def _load_keys(self):
        with open(PRIVATE_KEY_PATH, "rb") as f:
            self.private_key = serialization.load_pem_private_key(
                f.read(),
                password=None
            )
        with open(PUBLIC_KEY_PATH, "rb") as f:
            self.public_key = serialization.load_pem_public_key(f.read())

    def get_public_key_pem(self):
        """החזרת המפתח הציבורי בפורמט PEM לשליחה לקליינט"""
        return self.public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        ).decode('utf-8')

    def decrypt_session_key(self, encrypted_session_key_bytes):
        """פענוח מפתח סשן שנשלח מהלקוח"""
        return self.private_key.decrypt(
            encrypted_session_key_bytes,
            padding.OAEP(
                mgf=padding.MGF1(algorithm=hashes.SHA256()),
                algorithm=hashes.SHA256(),
                label=None
            )
        )

# יצירת מופע יחיד (Singleton)
rsa_manager = RSAKeyManager()
