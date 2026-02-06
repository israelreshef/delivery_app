import os
import base64
from docusign_esign import ApiClient, EnvelopesApi, EnvelopeDefinition, Document, Signer, CarbonCopy, SignHere, Tabs, Recipients
from docusign_esign.client.api_exception import ApiException

class DocuSignService:
    def __init__(self):
        # Configuration
        self.user_id = os.environ.get('DOCUSIGN_USER_ID', '39f23c9e-a9e5-438c-8207-63c74404134c')
        self.api_account_id = os.environ.get('DOCUSIGN_ACCOUNT_ID', '1441f284-1e38-4910-9339-8d9a164b280d')
        self.base_url = os.environ.get('DOCUSIGN_BASE_URL', 'https://demo.docusign.net/restapi')
        self.integration_key = os.environ.get('DOCUSIGN_INTEGRATION_KEY', '62ff5d53-10ab-45ba-8aa3-9d8ed3147c8b')
        self.private_key_path = os.environ.get('DOCUSIGN_PRIVATE_KEY_PATH', 'docusign_private_key.pem') # RSA Key from DocuSign
        
        self.api_client = None
        self.access_token = None

    def _get_jwt_token(self):
        """
        Gains a fresh access token using JWT Grant
        Note: Integration Key (Client ID) must be granted consent by the user once manually.
        """
        if not self.integration_key:
            print("❌ DocuSign Integration Key is missing.")
            return None

        if not os.path.exists(self.private_key_path):
            print(f"❌ DocuSign Private Key not found at {self.private_key_path}")
            return None

        try:
            self.api_client = ApiClient()
            self.api_client.set_base_path(os.environ.get('DOCUSIGN_AUTH_SERVER', 'account-d.docusign.com')) # Demo Auth Server
            
            # Scopes: signature means we can send/sign envelopes
            scopes = ["signature", "impersonation"]
            
            with open(self.private_key_path, "rb") as key_file:
                private_key = key_file.read()

            # Request JWT User Token
            token_response = self.api_client.request_jwt_user_token(
                client_id=self.integration_key,
                user_id=self.user_id,
                oauth_host_name=os.environ.get('DOCUSIGN_AUTH_SERVER', 'account-d.docusign.com'),
                private_key_bytes=private_key,
                expires_in=3600,
                scopes=scopes
            )
            
            self.access_token = token_response.access_token
            
            # Configure Client for API calls
            self.api_client = ApiClient()
            self.api_client.host = self.base_url
            self.api_client.set_default_header("Authorization", "Bearer " + self.access_token)
            
            return self.access_token

        except ApiException as e:
            print(f"❌ DocuSign Auth Failed: {e}")
            return None
        except Exception as e:
            print(f"❌ Generic DocuSign Error: {e}")
            return None

    def send_employment_contract(self, courier_email, courier_name, contract_html):
        """
        Sends an employment contract to a new courier for signing.
        """
        if not self.access_token:
            # Try to login
            if not self._get_jwt_token():
                return {"success": False, "error": "Authentication failed"}

        # 1. Create the document object
        # Convert HTML/String to Base64
        # In production, you might generate a PDF properly using WeasyPrint or similar
        doc_b64 = base64.b64encode(contract_html.encode('utf-8')).decode('ascii')
        
        document = Document(
            document_base64=doc_b64, 
            name="Courier Employment Agreement", 
            file_extension="html", 
            document_id="1"
        )

        # 2. Create the signer object
        signer = Signer(
            email=courier_email, 
            name=courier_name, 
            recipient_id="1", 
            routing_order="1"
        )

        # 3. Create a sign_here tab (where they sign)
        # Using Anchor Tagging (place signature where text says '/sn1/')
        sign_here = SignHere(
            anchor_string="/sn1/", 
            anchor_units="pixels",
            anchor_y_offset="10", 
            anchor_x_offset="20"
        )
        signer.tabs = Tabs(sign_here_tabs=[sign_here])

        # 4. Add recipients to envelope object
        recipients = Recipients(signers=[signer])
        
        # 5. Create envelope definition
        envelope_definition = EnvelopeDefinition(
            email_subject="TZIR Delivery - Please Sign Your Contract",
            documents=[document],
            recipients=recipients,
            status="sent"  # 'sent' sends immediately, 'created' saves as draft
        )

        # 6. Send via API
        try:
            envelopes_api = EnvelopesApi(self.api_client)
            results = envelopes_api.create_envelope(
                account_id=self.api_account_id, 
                envelope_definition=envelope_definition
            )
            
            return {
                "success": True, 
                "envelope_id": results.envelope_id,
                "status": results.status
            }
            
        except ApiException as e:
            print(f"❌ DocuSign Send Error: {e}")
            return {"success": False, "error": str(e)}

# Singleton Instance
docusign_service = DocuSignService()
