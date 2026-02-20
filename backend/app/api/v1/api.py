from fastapi import APIRouter
from app.api.v1.endpoints import auth, users, orders, couriers, notifications

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(orders.router, prefix="/orders", tags=["orders"])
api_router.include_router(couriers.router, prefix="/couriers", tags=["couriers"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
