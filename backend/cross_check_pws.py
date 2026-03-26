from app import create_app
from models import User

app = create_app()
with app.app_context():
    print("Database Credential Verification:")
    for username, potential_pws in [
        ('demo_client', ['TzirClient2026!', 'ClientShop88!']),
        ('demo_courier', ['TzirRiderSpeed!77', 'RiderFast99!'])
    ]:
        u = User.query.filter_by(username=username).first()
        if u:
            print(f"\nUser: {username}")
            for pw in potential_pws:
                if u.check_password(pw):
                    print(f"  MATCH FOUND: '{pw}'")
                else:
                    print(f"  No match: '{pw}'")
        else:
            print(f"\nUser: {username} MISSING!")
