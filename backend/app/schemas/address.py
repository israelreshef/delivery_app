from typing import Optional
from pydantic import BaseModel

class AddressBase(BaseModel):
    street: str
    city: str
    postal_code: Optional[str] = None
    building_number: str
    apartment: Optional[str] = None
    floor: Optional[str] = None
    entrance: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    notes: Optional[str] = None

class AddressCreate(AddressBase):
    pass

class AddressUpdate(AddressBase):
    pass

class Address(AddressBase):
    id: int
    user_id: Optional[int] = None

    class Config:
        from_attributes = True
