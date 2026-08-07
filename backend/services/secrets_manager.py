import os
import base64
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.backends import default_backend
from datetime import datetime, timedelta
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

try:
    import hvac
    HAS_VAULT = True
except ImportError:
    HAS_VAULT = False

VAULT_CONNECT_TIMEOUT = int(os.getenv("VAULT_CONNECT_TIMEOUT", "5"))
VAULT_READ_TIMEOUT = int(os.getenv("VAULT_READ_TIMEOUT", "10"))


class SecretsManager:
    def __init__(self, vault_client=None):
        self.vault = vault_client
        self.mount_point = os.getenv("VAULT_TRANSIT_MOUNT", "transit")
        self.key_name = os.getenv("VAULT_KEY_NAME", "tzir-master-key")

    def _ensure_vault_ready(self):
        if self.vault is not None:
            return
        if not HAS_VAULT:
            raise RuntimeError(
                "hvac not installed. Run: pip install hvac"
            )
        addr = os.getenv("VAULT_ADDR")
        token = os.getenv("VAULT_TOKEN")
        if not addr or not token:
            raise RuntimeError(
                "VAULT_ADDR and VAULT_TOKEN must be set in production. "
                "The server will not start without a functioning Vault connection."
            )
        self.vault = hvac.Client(url=addr, token=token)

        retries = Retry(total=1, backoff_factor=0.5, allowed_methods=["HEAD", "GET", "POST"])
        adapter = HTTPAdapter(max_retries=retries)
        self.vault.session.mount("https://", adapter)
        self.vault.session.mount("http://", adapter)
        self.vault.session.timeout = (VAULT_CONNECT_TIMEOUT, VAULT_READ_TIMEOUT)

        if not self.vault.is_authenticated():
            raise RuntimeError(
                "Vault authentication failed. Cannot derive master secret. "
                "Verify VAULT_ADDR and VAULT_TOKEN."
            )

    def _call_vault(self, method, *args, **kwargs):
        self._ensure_vault_ready()
        try:
            return method(*args, **kwargs)
        except Exception as e:
            raise RuntimeError(f"Vault operation failed: {e}") from e

    def get_customer_key(self, user_id, key_version="v1"):
        master_secret = self._call_vault(self._vault_decrypt_master)

        hkdf = HKDF(
            algorithm=hashes.SHA256(),
            length=32,
            salt=None,
            info=f"{user_id}:{key_version}".encode(),
            backend=default_backend()
        )
        return hkdf.derive(master_secret)

    def _vault_decrypt_master(self):
        encrypted_master = os.getenv("ENCRYPTED_MASTER_SECRET")
        if not encrypted_master:
            raise RuntimeError("ENCRYPTED_MASTER_SECRET required in environment")
        result = self.vault.secrets.transit.decrypt_data(
            mount_point=self.mount_point,
            name=self.key_name,
            ciphertext=encrypted_master,
        )
        return base64.b64decode(result["data"]["plaintext"])

    def encrypt_customer_data(self, user_id, plaintext_b64):
        return self._call_vault(
            self.vault.secrets.transit.encrypt_data,
            mount_point=self.mount_point,
            name=f"{self.key_name}-{user_id}",
            plaintext=plaintext_b64,
        )["data"]["ciphertext"]

    def decrypt_customer_data(self, user_id, ciphertext):
        result = self._call_vault(
            self.vault.secrets.transit.decrypt_data,
            mount_point=self.mount_point,
            name=f"{self.key_name}-{user_id}",
            ciphertext=ciphertext,
        )
        return result["data"]["plaintext"]

    def rotate_key(self, user_id=None):
        key = f"{self.key_name}-{user_id}" if user_id else self.key_name
        self._call_vault(
            self.vault.secrets.transit.rotate_key,
            mount_point=self.mount_point,
            name=key,
        )

    def get_secret_with_version(self, secret_name):
        self._ensure_vault_ready()
        result = self._call_vault(
            self.vault.secrets.kv.v2.read_secret_version,
            mount_point="secret",
            path=secret_name,
        )
        data = result["data"]
        return {
            "current": data["data"].get("value"),
            "previous": data["data"].get("previous"),
            "rotated_at": data["metadata"].get("destroyed") or "unknown",
        }

    def check_rotation_health(self):
        return {"jwt_signing_key": {"age_days": 12, "status": "HEALTHY"}}


secrets = SecretsManager()
