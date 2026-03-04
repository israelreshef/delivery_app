import os
import requests
import logging
import sys
from pathlib import Path

# Add parent directory to path to allow importing from routes
sys.path.insert(0, str(Path(__file__).parent.parent))
from routes.expenses import track_api_call

class MessagingService:
    """
    שירות למשלוח הודעות (SMS או WhatsApp) ללקוחות/שליחים.
    תומך ב-Sms4Free ו-WhatsApp Business API.
    """
    
    SMS4FREE_API_KEY = os.environ.get('SMS4FREE_API_KEY')
    SMS4FREE_USER_ID = os.environ.get('SMS4FREE_USER_ID')
    
    WA_ACCESS_TOKEN = os.environ.get('WA_ACCESS_TOKEN')
    WA_PHONE_NUMBER_ID = os.environ.get('WA_PHONE_NUMBER_ID')
    
    # תצורה: מהי הדרך המועדפת לשלוח הודעות? ('whatsapp' או 'sms')
    PREFERRED_PROVIDER = os.environ.get('PREFERRED_MESSAGING_PROVIDER', 'whatsapp').lower()

    @classmethod
    def send_otp(cls, phone_number: str, otp_code: str):
        """
        שליחת קוד OTP ללקוח.
        מנסה לשלוח דרך הספק המועדף. אם המפתחות חסרים, עובר לחלופה או מבצע סימולציה.
        """
        message_text = f"קוד האימות שלך למשלוח הוא: {otp_code}\nתודה שבחרת בנו!"
        
        logging.info(f"Attempting to send OTP to {phone_number} via {cls.PREFERRED_PROVIDER}")
        
        if cls.PREFERRED_PROVIDER == 'whatsapp' and cls.WA_ACCESS_TOKEN:
            return cls._send_whatsapp_message(phone_number, otp_code, is_otp=True)
            
        elif cls.PREFERRED_PROVIDER == 'sms' and cls.SMS4FREE_API_KEY:
            return cls._send_sms4free(phone_number, message_text)
            
        # Fallbacks
        if cls.WA_ACCESS_TOKEN:
            logging.info("Preferred SMS missing keys, falling back to WhatsApp")
            return cls._send_whatsapp_message(phone_number, otp_code, is_otp=True)
            
        if cls.SMS4FREE_API_KEY:
             logging.info("Preferred WhatsApp missing keys, falling back to SMS4Free")
             return cls._send_sms4free(phone_number, message_text)
             
        # Mock mode if no keys
        logging.warning("No messaging keys configured. Simulating OTP send.")
        return {'success': True, 'mock': True, 'provider': 'mock'}

    @classmethod
    def _send_sms4free(cls, phone_number: str, text: str):
        """
        שליחת הודעה ע"י הספק הישראלי Sms4Free
        """
        # API documentation matching Sms4Free format
        url = "https://a.sms4free.co.il/Api/sms/"
        
        payload = {
            'key': cls.SMS4FREE_API_KEY,
            'user': cls.SMS4FREE_USER_ID,
            'pass': os.environ.get('SMS4FREE_PASSWORD', ''),
            'sender': 'TZIR',
            'recipient': phone_number,
            'msg': text
        }
        
        try:
            response = requests.post(url, data=payload, timeout=5)
            # Sms4Free returns text, usually >0 if successful (number of credits), or negative for errors
            result_text = response.text
            
            if response.status_code == 200 and not result_text.startswith('-'):
                logging.info(f"Sms4Free sent successfully to {phone_number}. Credits left/Message ID: {result_text}")
                # Track expense for dashboard
                track_api_call('sms4free')
                return {'success': True, 'provider': 'sms4free', 'response': result_text}
            else:
                logging.error(f"Sms4Free API Error: {result_text}")
                return {'success': False, 'provider': 'sms4free', 'error': result_text}
                
        except Exception as e:
            logging.error(f"Sms4Free Exception: {e}")
            return {'success': False, 'provider': 'sms4free', 'error': str(e)}

    @classmethod
    def _send_whatsapp_message(cls, phone_number: str, message: str, is_otp=False):
        """
        שליחת הודעה עסקית בווטסאפ.
        עבור OTP נשתמש בתבנית מסוג 'authentication' לקבלת התעריף המוזל.
        """
        url = f"https://graph.facebook.com/v19.0/{cls.WA_PHONE_NUMBER_ID}/messages"
        headers = {
            "Authorization": f"Bearer {cls.WA_ACCESS_TOKEN}",
            "Content-Type": "application/json"
        }
        
        # WhatsApp expects country code without '+', assuming Israeli numbers mostly
        if phone_number.startswith('0'):
            formatted_phone = '972' + phone_number[1:]
        elif phone_number.startswith('+'):
            formatted_phone = phone_number[1:]
        else:
            formatted_phone = phone_number
            
        if is_otp:
            # WhatsApp requires pre-approved templates for outgoing messages.
            # Assuming a template named 'delivery_otp' exists.
            payload = {
                "messaging_product": "whatsapp",
                "to": formatted_phone,
                "type": "template",
                "template": {
                    "name": "delivery_otp",
                    "language": {
                        "code": "he"
                    },
                    "components": [
                        {
                            "type": "body",
                            "parameters": [
                                {
                                    "type": "text",
                                    "text": message # The OTP code
                                }
                            ]
                        },
                         {
                            "type": "button",
                            "sub_type": "url",
                            "index": "0",
                            "parameters": [
                                {
                                    "type": "text",
                                    "text": message # OTP Code for copy button
                                }
                            ]
                        }
                    ]
                }
            }
        else:
            # Free-form messages (only works if user messaged within 24 hours)
            payload = {
                "messaging_product": "whatsapp",
                "to": formatted_phone,
                "type": "text",
                "text": {
                    "body": message
                }
            }

        try:
            response = requests.post(url, json=payload, headers=headers, timeout=5)
            response.raise_for_status()
            
            logging.info(f"WhatsApp sent successfully to {formatted_phone}")
            # Track expense for dashboard
            track_api_call('whatsapp_business')
            return {'success': True, 'provider': 'whatsapp_business'}
            
        except requests.exceptions.HTTPError as e:
            err_details = response.json() if hasattr(response, 'json') else str(e)
            logging.error(f"WhatsApp API Error: {err_details}")
            return {'success': False, 'provider': 'whatsapp_business', 'error': str(err_details)}
        except Exception as e:
            logging.error(f"WhatsApp Exception: {e}")
            return {'success': False, 'provider': 'whatsapp_business', 'error': str(e)}
