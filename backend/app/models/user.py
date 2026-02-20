from sqlalchemy import Boolean, Column, Integer, String, Enum as PgEnum
from sqlalchemy.sql import func
from sqlalchemy.types import TIMESTAMP
import enum
from app.core.db import Base

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    COURIER = "courier"
    CUSTOMER = "customer"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, index=True)
    phone_number = Column(String, unique=True, index=True)
    role = Column(PgEnum(UserRole), default=UserRole.CUSTOMER, nullable=False)
    is_active = Column(Boolean, default=True)
    is_approved = Column(Boolean, default=False)
    is_superuser = Column(Boolean, default=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())
