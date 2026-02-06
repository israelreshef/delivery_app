from app import create_app
from extensions import db, migrate

app, _ = create_app()

if __name__ == '__main__':
    # This is useful specifically for direct execution if needed
    pass
