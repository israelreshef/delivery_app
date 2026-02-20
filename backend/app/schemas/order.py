from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel
from app.models.order import OrderStatus, PackageSize, Priority
from app.schemas.address import Address, AddressCreate
from decimal import Decimal

class OrderBase(BaseModel):
    package_description: Optional[str] = None
    package_weight: Optional[float] = None
    package_size: Optional[PackageSize] = PackageSize.MEDIUM
    priority: Optional[Priority] = Priority.NORMAL
    pickup_time_estimated: Optional[datetime] = None
    delivery_time_estimated: Optional[datetime] = None

class OrderCreate(OrderBase):
    pickup_address: AddressCreate
    delivery_address: AddressCreate

class OrderUpdate(OrderBase):
    status: Optional[OrderStatus] = None
    courier_id: Optional[int] = None

class Order(OrderBase):
    id: int
    order_number: str
    customer_id: int
    courier_id: Optional[int] = None
    pickup_address: Address
    delivery_address: Address
    status: OrderStatus
    price: Optional[Decimal] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    customer_name: Optional[str] = None

    class Config:
        from_attributes = True
