from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.order import Order, OrderStatus
from app.schemas.order import OrderCreate, OrderUpdate
from app.crud.address import address as crud_address
import uuid

class CRUDOrder:
    def get(self, db: Session, id: int):
        return db.query(Order).filter(Order.id == id).first()

    def get_multi(self, db: Session, skip: int = 0, limit: int = 100):
        return db.query(Order).offset(skip).limit(limit).all()

    def get_by_customer(self, db: Session, customer_id: int, skip: int = 0, limit: int = 100):
        return db.query(Order).filter(Order.customer_id == customer_id).offset(skip).limit(limit).all()
        
    def get_by_courier(self, db: Session, courier_id: int, skip: int = 0, limit: int = 100):
        return db.query(Order).filter(Order.courier_id == courier_id).offset(skip).limit(limit).all()

    def get_available(self, db: Session, skip: int = 0, limit: int = 100):
        return db.query(Order).filter(
            Order.status == OrderStatus.PENDING,
            Order.courier_id == None
        ).offset(skip).limit(limit).all()

    def create(self, db: Session, obj_in: OrderCreate, customer_id: int):
        # Create addresses first
        pickup_addr = crud_address.create(db, obj_in=obj_in.pickup_address, user_id=customer_id)
        delivery_addr = crud_address.create(db, obj_in=obj_in.delivery_address, user_id=customer_id) # Should delivery addr be linked to customer? Yes, typically.

        db_obj = Order(
            order_number=str(uuid.uuid4()).split('-')[0].upper(), # Simple generic order number
            customer_id=customer_id,
            pickup_address_id=pickup_addr.id,
            delivery_address_id=delivery_addr.id,
            status=OrderStatus.PENDING,
            package_description=obj_in.package_description,
            package_weight=obj_in.package_weight,
            package_size=obj_in.package_size,
            priority=obj_in.priority,
            pickup_time_estimated=obj_in.pickup_time_estimated,
            delivery_time_estimated=obj_in.delivery_time_estimated
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update(self, db: Session, db_obj: Order, obj_in: OrderUpdate):
        obj_data = db_obj.__dict__
        update_data = obj_in.dict(exclude_unset=True)
        
        for field in obj_data:
            if field in update_data:
                setattr(db_obj, field, update_data[field])
        
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

order = CRUDOrder()
