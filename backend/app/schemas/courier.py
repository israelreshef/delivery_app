from typing import Optional
from datetime import datetime
from pydantic import BaseModel
from app.models.courier import VehicleType

# Shared properties
class CourierBase(BaseModel):
    vehicle_type: Optional[VehicleType] = VehicleType.SCOOTER
    license_plate: Optional[str] = None
    max_capacity: Optional[int] = 10
    national_id: Optional[str] = None
    bank_account: Optional[str] = None
    driving_license_url: Optional[str] = None
    insurance_url: Optional[str] = None
    vehicle_license_url: Optional[str] = None
    tax_deduction_url: Optional[str] = None
    dealer_certificate_url: Optional[str] = None
    terms_accepted: Optional[bool] = False
    status: Optional[str] = "pending"

# Properties to receive on creation
class CourierCreate(CourierBase):
    pass

# Properties to receive on update
class CourierUpdate(CourierBase):
    is_available: Optional[bool] = None
    is_online: Optional[bool] = None

# Properties shared by models stored in DB
class CourierInDBBase(CourierBase):
    id: int
    user_id: int
    is_available: bool
    is_online: bool
    rating: float
    total_deliveries: int
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Properties to return to client
class Courier(CourierInDBBase):
    pass
