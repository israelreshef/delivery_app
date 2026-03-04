from app import create_app
from extensions import db
from sqlalchemy import text
app = create_app()
with app.app_context():
    db.session.execute(text("UPDATE customer_tasks SET status = 'open' WHERE status = 'pending'"))
    db.session.commit()
    print("Fixed task statuses")
