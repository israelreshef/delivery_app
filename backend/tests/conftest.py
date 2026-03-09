import pytest
import os
from pathlib import Path
from httpx import AsyncClient, ASGITransport
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy import create_engine

# Load test environment variables
from dotenv import load_dotenv
env_path = Path(__file__).parent.parent / ".env.test"
load_dotenv(env_path)

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app import create_app

app = create_app()
# Mock db for tests if necessary, although the db is global in extensions
from extensions import db

# Test database URL
TEST_DATABASE_URL = app.config.get('SQLALCHEMY_DATABASE_URI', 'sqlite:///:memory:')
if 'test_' not in TEST_DATABASE_URL and 'sqlite' not in TEST_DATABASE_URL:
    # Ensure we use a test database if postgres
    TEST_DATABASE_URL = TEST_DATABASE_URL.replace(TEST_DATABASE_URL.split('/')[-1], 'test_' + TEST_DATABASE_URL.split('/')[-1])

engine = create_engine(TEST_DATABASE_URL, echo=False)
TestingSessionLocal = sessionmaker(
    autocommit=False, autoflush=False, bind=engine
)


@pytest.fixture(scope="session")
def setup_database():
    """Create test database tables"""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db_session(setup_database):
    """Get test database session"""
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client(db_session):
    """Get test HTTP client"""
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    
    transport = ASGITransport(app=app)
    yield AsyncClient(transport=transport, base_url="http://test")
    
    app.dependency_overrides.clear()
