import enum
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Enum as PgEnum, Float, Boolean, Text, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.db import Base

class OrderStatus(str, enum.Enum):
    PENDING = "pending"
    ASSIGNED = "assigned"
    PICKED_UP = "picked_up"
    IN_TRANSIT = "in_transit"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"
    FAILED = "failed"

class PackageSize(str, enum.Enum):
    SMALL = "small"
    MEDIUM = "medium"
    LARGE = "large"
    XLARGE = "xlarge"

class Priority(str, enum.Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"

class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    order_number = Column(String, unique=True, index=True, nullable=False)
    
    customer_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    courier_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    
    pickup_address_id = Column(Integer, ForeignKey("addresses.id"), nullable=False)
    delivery_address_id = Column(Integer, ForeignKey("addresses.id"), nullable=False)
    
    status = Column(PgEnum(OrderStatus), default=OrderStatus.PENDING, nullable=False, index=True)
    priority = Column(PgEnum(Priority), default=Priority.NORMAL)
    
    package_description = Column(Text, nullable=True)
    package_weight = Column(Float, nullable=True) # kg
    package_size = Column(PgEnum(PackageSize), default=PackageSize.MEDIUM)
    
    price = Column(Numeric(10, 2), nullable=True)
    
    pickup_time_estimated = Column(DateTime(timezone=True), nullable=True)
    pickup_time_actual = Column(DateTime(timezone=True), nullable=True)
    delivery_time_estimated = Column(DateTime(timezone=True), nullable=True)
    delivery_time_actual = Column(DateTime(timezone=True), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    customer = relationship("User", foreign_keys=[customer_id], backref="customer_orders")
    courier = relationship("User", foreign_keys=[courier_id], backref="courier_orders")
    pickup_address = relationship("Address", foreign_keys=[pickup_address_id])
    delivery_address = relationship("Address", foreign_keys=[delivery_address_id])
