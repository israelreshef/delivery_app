
import requests
import json
import os

def send_push_notification(tokens, title, body, data=None):
    """
    Sends a push notification via FCM.
    Note: Requires a Firebase Server Key (FCM Legacy) or OAuth2 Token (FCM HTTP v1).
    This is a placeholder implementation that logs the notification.
    """
    FCM_SERVER_KEY = os.environ.get('FCM_SERVER_KEY')
    
    if not FCM_SERVER_KEY:
        print(f"📣 [MOCK PUSH] To: {tokens}, Title: {title}, Body: {body}")
        return True

    url = 'https://fcm.googleapis.com/fcm/send'
    headers = {
        'Authorization': f'key={FCM_SERVER_KEY}',
        'Content-Type': 'application/json'
    }
    
    payload = {
        'registration_ids': tokens if isinstance(tokens, list) else [tokens],
        'notification': {
            'title': title,
            'body': body,
            'sound': 'default'
        },
        'data': data or {}
    }

    try:
        response = requests.post(url, headers=headers, data=json.dumps(payload))
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Error sending FCM: {e}")
        return False

def notify_new_mission(order):
    """
    Triggers a notification for all available couriers about a new mission.
    """
    from models import Courier, User
    
    # In a production app, you might filter by proximity
    # For now, we'll notify all available couriers who have an FCM token
    # (Assuming we stored FCM tokens in the User model)
    
    available_couriers = Courier.query.filter_by(is_available=True).all()
    # Mock behavior: just log it since we don't have real tokens yet
    print(f"🔔 Notifying {len(available_couriers)} couriers about Order #{order.order_number}")
    
    send_push_notification(
        tokens=["MOCK_TOKEN"], # Replace with actual tokens from DB
        title="משימה חדשה זמינה! 📦",
        body=f"מאיסוף: {order.pickup_point.address.street if order.pickup_point and order.pickup_point.address else 'לא ידוע'} | שווי: ₪{order.delivery_fee}",
        data={"order_id": order.id, "type": "new_mission"}
    )
