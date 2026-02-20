from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.api import api_router

app = FastAPI(
    title="TZIR Delivery API",
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Set all CORS enabled origins
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "TZIR Backend"}


@app.get("/")
def root():
    return {"message": "Welcome to TZIR Delivery API"}

# Mount Socket.IO — keep `app` as the FastAPI instance for imports/tests,
# and expose `application` as the ASGI entry point for uvicorn.
from app.core.socket import sio
import socketio
application = socketio.ASGIApp(sio, app)
