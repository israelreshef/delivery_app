from app import create_app, db
from models import User
from datetime import datetime

app = create_app()

with app.app_context():
    print("🔄 Updating all users to ACCEPTED privacy policy...")
    
    # Update all users where privacy_policy_accepted_at IS NULL
    count = User.query.filter(User.privacy_policy_accepted_at == None).update(
        {User.privacy_policy_accepted_at: datetime.utcnow()}
    )
    
    db.session.commit()
    print(f"✅ Successfully updated {count} users.")
