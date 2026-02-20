from sqlalchemy.orm import Session
from app.models.address import Address
from app.schemas.address import AddressCreate, AddressUpdate

class CRUDAddress:
    def get(self, db: Session, id: int):
        return db.query(Address).filter(Address.id == id).first()

    def create(self, db: Session, obj_in: AddressCreate, user_id: int = None):
        db_obj = Address(
            street=obj_in.street,
            city=obj_in.city,
            postal_code=obj_in.postal_code,
            building_number=obj_in.building_number,
            apartment=obj_in.apartment,
            floor=obj_in.floor,
            entrance=obj_in.entrance,
            latitude=obj_in.latitude,
            longitude=obj_in.longitude,
            notes=obj_in.notes,
            user_id=user_id,
            # Create PostGIS point if lat/lon exist
            location=f"POINT({obj_in.longitude} {obj_in.latitude})" if obj_in.latitude and obj_in.longitude else None
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

address = CRUDAddress()
