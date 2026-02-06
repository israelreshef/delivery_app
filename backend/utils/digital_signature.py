import hashlib
import hmac
import os
import json
from datetime import datetime

class DigitalSignature:
    """
    מחלקה לניהול חתימות דיגיטליות מאובטחות (HMAC-SHA256).
    משמשת לחיתום רשומות קריטיות (מסירות משפטיות, לוגים) כדי להבטיח שלמות (Integrity) ואי-התכחשות.
    """
    
    _secret_key = os.environ.get('DIGITAL_SIGNATURE_KEY', 'default-secure-key-change-this').encode('utf-8')

    @staticmethod
    def sign_record(data_dict):
        """
        יוצר חתימה דיגיטלית עבור רשומה (מילון נתונים).
        """
        # מיון המפתחות מבטיח שהחתימה תהיה עקבית עבור אותו מידע
        canonical_data = json.dumps(data_dict, sort_keys=True, default=str)
        
        signature = hmac.new(
            DigitalSignature._secret_key,
            canonical_data.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        return signature

    @staticmethod
    def verify_signature(data_dict, provided_signature):
        """
        מאמת את החתימה מול הרשומה.
        """
        calculated_signature = DigitalSignature.sign_record(data_dict)
        return hmac.compare_digest(calculated_signature, provided_signature)

    @staticmethod
    def sign_delivery_completion(delivery_id, courier_id, timestamp, recipient_id=None, pod_path=None):
        """
        יוצר חתימה ספציפית לאירוע מסירה (Evidence).
        """
        record = {
            'event': 'DELIVERY_COMPLETED',
            'delivery_id': delivery_id,
            'courier_id': courier_id,
            'timestamp': timestamp.isoformat() if isinstance(timestamp, datetime) else timestamp,
            'recipient_id': recipient_id,
            'pod_hash': hashlib.sha256(pod_path.encode()).hexdigest() if pod_path else None
        }
        return DigitalSignature.sign_record(record)
