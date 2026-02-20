from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.courier import Courier
from app.schemas.courier import CourierCreate, CourierUpdate
from geoalchemy2.elements import WKTElement

class CRUDCourier:
    def get(self, db: Session, id: int):
        return db.query(Courier).filter(Courier.id == id).first()

    def get_by_user_id(self, db: Session, user_id: int):
        return db.query(Courier).filter(Courier.user_id == user_id).first()

    def create(self, db: Session, obj_in: CourierCreate, user_id: int):
        db_obj = Courier(
            user_id=user_id,
            vehicle_type=obj_in.vehicle_type,
            license_plate=obj_in.license_plate,
            max_capacity=obj_in.max_capacity,
            is_available=obj_in.is_available,
            is_online=obj_in.is_online,
            current_latitude=obj_in.current_latitude,
            current_longitude=obj_in.current_longitude,
            
            # Documents & Status
            national_id=obj_in.national_id,
            bank_account=obj_in.bank_account,
            driving_license_url=obj_in.driving_license_url,
            insurance_url=obj_in.insurance_url,
            vehicle_license_url=obj_in.vehicle_license_url,
            tax_deduction_url=obj_in.tax_deduction_url,
            dealer_certificate_url=obj_in.dealer_certificate_url,
            terms_accepted=obj_in.terms_accepted,
            status=obj_in.status,

             # Create PostGIS point if lat/lon exist
            location=f"POINT({obj_in.current_longitude} {obj_in.current_latitude})" if obj_in.current_latitude and obj_in.current_longitude else None
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update(self, db: Session, db_obj: Courier, obj_in: CourierUpdate):
        obj_data = db_obj.__dict__
        update_data = obj_in.dict(exclude_unset=True)
        
        # Handle location update specifically to sync geometry
        if 'current_latitude' in update_data or 'current_longitude' in update_data:
            lat = update_data.get('current_latitude', db_obj.current_latitude)
            lng = update_data.get('current_longitude', db_obj.current_longitude)
            if lat and lng:
                db_obj.location = f"POINT({lng} {lat})"
        
        for field in obj_data:
            if field in update_data:
                setattr(db_obj, field, update_data[field])
        
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def get_nearest_couriers(self, db: Session, lat: float, lng: float, radius_km: float = 10.0, limit: int = 5) -> List[Courier]:
        """
        Find nearest available and online couriers within a radius.
        """
        point = WKTElement(f'POINT({lng} {lat})', srid=4326)
        
        return db.query(Courier).filter(
            Courier.is_available == True,
            Courier.is_online == True,
            func.ST_DWithin(Courier.location, point, radius_km * 1000) # Radius in meters (if using geography type) or degrees? 
            # PostGIS Geometry type in 4326 uses degrees for ST_DWithin if logic is not cast to geography.
            # Usually better to cast to Geography for meters: ST_DWithin(geom::geography, point::geography, meters)
        ).filter(
             # Alternative: use ST_DistanceSphere or cast to geography
             func.ST_DistanceSphere(Courier.location, point) <= radius_km * 1000
        ).order_by(
            # Order by distance
            func.ST_DistanceSphere(Courier.location, point)
        ).limit(limit).all()

courier = CRUDCourier()
