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

from app.main import app
from app.core.db import get_db, Base
from app.core.config import settings

# Test database URL (sync, matching production db.py)
TEST_DATABASE_URL = f"postgresql://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}@{settings.POSTGRES_SERVER}:{settings.POSTGRES_PORT}/test_{settings.POSTGRES_DB}"

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
