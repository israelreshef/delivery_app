from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "delivery_app",
    broker=f"redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}/0",
    backend=f"redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}/0"
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)

# Auto-discover tasks from all registered apps
celery_app.autodiscover_tasks(["app.tasks"])

@celery_app.task(name="app.tasks.example_task")
def example_task(message: str):
    """Example background task"""
    print(f"Processing task: {message}")
    return {"status": "success", "message": message}
