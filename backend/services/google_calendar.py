import datetime
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from models import User, db

class GoogleCalendarService:
    def __init__(self, user: User):
        self.user = user
        self.credentials = self._get_credentials()
        self.service = build('calendar', 'v3', credentials=self.credentials) if self.credentials else None

    def _get_credentials(self) -> Credentials:
        if not self.user.google_access_token:
            return None
            
        import os
        client_id = os.environ.get('GOOGLE_CLIENT_ID')
        client_secret = os.environ.get('GOOGLE_CLIENT_SECRET')

        creds = Credentials(
            token=self.user.google_access_token,
            refresh_token=self.user.google_refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=client_id,
            client_secret=client_secret
        )
        return creds

    def is_configured(self) -> bool:
        return self.service is not None

    def check_and_refresh_token(self):
        if self.credentials and self.credentials.expired and self.credentials.refresh_token:
            from google.auth.transport.requests import Request
            self.credentials.refresh(Request())
            # Save new access token to DB
            self.user.google_access_token = self.credentials.token
            if self.credentials.expiry:
                self.user.google_token_expiry = self.credentials.expiry
            db.session.commit()

    def create_event(self, summary: str, description: str, start_time: datetime.datetime, end_time: datetime.datetime = None):
        """
        Pushes a new event to the user's primary calendar.
        """
        if not self.is_configured():
            return None
            
        self.check_and_refresh_token()
        
        if not end_time:
            # Default to a 1 hour meeting block
            end_time = start_time + datetime.timedelta(hours=1)
            
        event = {
            'summary': summary,
            'description': description,
            'start': {
                'dateTime': start_time.isoformat(),
                'timeZone': 'Asia/Jerusalem',
            },
            'end': {
                'dateTime': end_time.isoformat(),
                'timeZone': 'Asia/Jerusalem',
            },
            'reminders': {
                'useDefault': False,
                'overrides': [
                    {'method': 'popup', 'minutes': 10},
                ],
            },
        }

        calendar_id = self.user.google_calendar_id or 'primary'
        try:
            created_event = self.service.events().insert(calendarId=calendar_id, body=event).execute()
            return created_event.get('id')
        except Exception as e:
            print(f"Failed to create Google Calendar event: {e}")
            return None

    def list_upcoming_events(self, max_results=10):
        """
        Fetches the user's upcoming events from Google Calendar.
        """
        if not self.is_configured():
            return []
            
        self.check_and_refresh_token()
        
        now = datetime.datetime.utcnow().isoformat() + 'Z'  # 'Z' indicates UTC time
        calendar_id = self.user.google_calendar_id or 'primary'
        
        try:
            events_result = self.service.events().list(
                calendarId=calendar_id, timeMin=now,
                maxResults=max_results, singleEvents=True,
                orderBy='startTime'
            ).execute()
            events = events_result.get('items', [])
            return events
        except Exception as e:
            print(f"Failed to fetch Google Calendar events: {e}")
            return []
