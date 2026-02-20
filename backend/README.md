# TZIR Delivery Backend 🐍

This is the new FastAPI-based backend for the TZIR Delivery system.

## Prerequisites
- Docker & Docker Compose
- Python 3.11+ (optional, for local intellisense)

## Quick Start 🚀

1.  **Start the System:**
    ```bash
    docker-compose up -d --build
    ```
    This will start:
    - **Backend API:** http://localhost:8000
    - **PostgreSQL DB:** localhost:5432
    - **Redis:** localhost:6379
    - **PgAdmin:** http://localhost:5050

2.  **Access Documentation:**
    - Swagger UI: [http://localhost:8000/docs](http://localhost:8000/docs)
    - ReDoc: [http://localhost:8000/redoc](http://localhost:8000/redoc)

3.  **Run Migrations:**
    Once the containers are running, initialize the database:
    ```bash
    # Create initial migration
    docker-compose exec backend alembic revision --autogenerate -m "Initial migration"
    
    # Apply migration
    docker-compose exec backend alembic upgrade head
    ```

## Structure
- `app/api`: API Endpoints (Routes)
- `app/core`: Configuration & Security
- `app/models`: Database Models (SQLAlchemy)
- `app/schemas`: Pydantic Schemas (Request/Response)
- `app/crud`: Database Operations
- `app/services`: Business Logic

## Development
To add a new dependency, update `requirements.txt` and rebuild:
```bash
docker-compose up -d --build
```
