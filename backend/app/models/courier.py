import enum
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Float, DateTime, Enum as PgEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from geoalchemy2 import Geometry
from app.core.db import Base

class VehicleType(str, enum.Enum):
    MOTORCYCLE = "motorcycle"
    SCOOTER = "scooter"
    CAR = "car"
    BICYCLE = "bicycle"
    VAN = "van"

class Courier(Base):
    __tablename__ = "couriers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False, index=True)
    
    vehicle_type = Column(PgEnum(VehicleType), default=VehicleType.SCOOTER, nullable=False)
    license_plate = Column(String, nullable=True)
    max_capacity = Column(Integer, default=10)
    
    # Location
    current_latitude = Column(Float, nullable=True)
    current_longitude = Column(Float, nullable=True)
    location = Column(Geometry(geometry_type='POINT', srid=4326), nullable=True)
    
    is_available = Column(Boolean, default=True)
    is_online = Column(Boolean, default=False)
    last_seen = Column(DateTime(timezone=True), nullable=True)
    
    # Onboarding / Compliance
    national_id = Column(String, nullable=True)
    bank_account = Column(String, nullable=True)
    driving_license_url = Column(String, nullable=True)
    insurance_url = Column(String, nullable=True)
    terms_accepted = Column(Boolean, default=False)
    
    rating = Column(Float, default=5.0)
    total_deliveries = Column(Integer, default=0)

    # Documents & Status
    vehicle_license_url = Column(String, nullable=True)
    tax_deduction_url = Column(String, nullable=True)
    dealer_certificate_url = Column(String, nullable=True)
    
    status = Column(String, default="pending") # pending, approved, rejected, changes_requested
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", backref="courier_profile")
