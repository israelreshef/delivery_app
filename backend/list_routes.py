
from app import create_app

app = create_app()
with app.app_context():
    for rule in app.url_map.iter_rules():
        if 'location' in str(rule):
            print(f"{rule.endpoint:40} {rule.methods} {rule}")
