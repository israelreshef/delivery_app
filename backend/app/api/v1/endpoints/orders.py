from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api import deps
from app.crud.order import order as crud_order
from app.models.user import User as UserModel, UserRole
from app.schemas.order import Order, OrderCreate, OrderUpdate

router = APIRouter()

@router.get("/", response_model=List[Order])
def read_orders(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: UserModel = Depends(deps.get_current_user),
) -> Any:
    """
    Retrieve orders.
    """
    if current_user.role == UserRole.ADMIN:
        orders = crud_order.get_multi(db, skip=skip, limit=limit)
    elif current_user.role == UserRole.COURIER:
        # Couriers see orders assigned to them
        # TODO: Add logic for "available" orders if marketplace model
        orders = crud_order.get_by_courier(db, courier_id=current_user.id, skip=skip, limit=limit)
    else:
        # Customers see their own orders
        orders = crud_order.get_by_customer(db, customer_id=current_user.id, skip=skip, limit=limit)
    return orders

@router.get("/available", response_model=List[Order])
def read_available_orders(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: UserModel = Depends(deps.get_current_user),
) -> Any:
    """
    Retrieve available orders for couriers (Marketplace).
    """
    if current_user.role != UserRole.COURIER:
         raise HTTPException(
            status_code=403,
            detail="Only couriers can see available orders",
        )
        
    orders = crud_order.get_available(db, skip=skip, limit=limit)
    # Populate customer_name manually for now (or use Pydantic validator if we set up ORM correctly)
    for order in orders:
        if order.customer:
            order.customer_name = order.customer.full_name
            
    return orders

@router.post("/", response_model=Order)
def create_order(
    *,
    db: Session = Depends(deps.get_db),
    order_in: OrderCreate,
    current_user: UserModel = Depends(deps.get_current_user),
) -> Any:
    """
    Create new order.
    """
    if current_user.role == UserRole.COURIER:
         raise HTTPException(
            status_code=403,
            detail="Couriers cannot create orders",
        )
        
    order = crud_order.create(db, obj_in=order_in, customer_id=current_user.id)
    return order

@router.get("/{order_id}", response_model=Order)
def read_order(
    *,
    db: Session = Depends(deps.get_db),
    order_id: int,
    current_user: UserModel = Depends(deps.get_current_user),
) -> Any:
    """
    Get order by ID.
    """
    order = crud_order.get(db, id=order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Check permissions
    if current_user.role == UserRole.ADMIN:
        pass
    elif current_user.role == UserRole.COURIER:
        if order.courier_id != current_user.id:
             raise HTTPException(status_code=403, detail="Not enough permissions")
    else:
        if order.customer_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not enough permissions")
            
    return order

@router.put("/{order_id}", response_model=Order)
def update_order(
    *,
    db: Session = Depends(deps.get_db),
    order_id: int,
    order_in: OrderUpdate,
    current_user: UserModel = Depends(deps.get_current_user),
) -> Any:
    """
    Update an order.
    """
    order = crud_order.get(db, id=order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    # Check permissions logic
    # Admin can update everything
    # Courier can update status if assigned
    # Customer can update if pending (maybe)
    
    if current_user.role == UserRole.ADMIN:
        pass # OK
    elif current_user.role == UserRole.COURIER:
        if order.courier_id != current_user.id:
             raise HTTPException(status_code=403, detail="Not enough permissions")
        # Courier can mostly update status
        # We might want to restrict fields here or in basic CRUD, but for now trusting schema
    else:
        # Customer update logic (e.g. cancel if pending)
        if order.customer_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not enough permissions")
        
    order = crud_order.update(db, db_obj=order, obj_in=order_in)
    return order

@router.post("/{order_id}/accept", response_model=Order)
def accept_order(
    *,
    db: Session = Depends(deps.get_db),
    order_id: int,
    current_user: UserModel = Depends(deps.get_current_user),
) -> Any:
    """Courier accepts an available order."""
    if current_user.role != UserRole.COURIER:
        raise HTTPException(status_code=403, detail="Only couriers can accept orders")

    order = crud_order.get(db, id=order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    from app.models.order import OrderStatus
    if order.status != OrderStatus.PENDING:
        raise HTTPException(status_code=400, detail=f"Order cannot be accepted (status: {order.status})")

    order_update = OrderUpdate(status=OrderStatus.ASSIGNED, courier_id=current_user.id)
    order = crud_order.update(db, db_obj=order, obj_in=order_update)
    return order

@router.post("/{order_id}/pickup", response_model=Order)
def pickup_order(
    *,
    db: Session = Depends(deps.get_db),
    order_id: int,
    current_user: UserModel = Depends(deps.get_current_user),
) -> Any:
    """Courier marks order as picked up."""
    if current_user.role != UserRole.COURIER:
        raise HTTPException(status_code=403, detail="Only couriers can pick up orders")

    order = crud_order.get(db, id=order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.courier_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your order")

    from app.models.order import OrderStatus
    if order.status != OrderStatus.ASSIGNED:
        raise HTTPException(status_code=400, detail=f"Order cannot be picked up (status: {order.status})")

    order_update = OrderUpdate(status=OrderStatus.PICKED_UP)
    order = crud_order.update(db, db_obj=order, obj_in=order_update)
    return order

@router.post("/{order_id}/deliver", response_model=Order)
def deliver_order(
    *,
    db: Session = Depends(deps.get_db),
    order_id: int,
    current_user: UserModel = Depends(deps.get_current_user),
) -> Any:
    """Courier marks order as delivered."""
    if current_user.role != UserRole.COURIER:
        raise HTTPException(status_code=403, detail="Only couriers can deliver orders")

    order = crud_order.get(db, id=order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.courier_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your order")

    from app.models.order import OrderStatus
    if order.status != OrderStatus.PICKED_UP:
        raise HTTPException(status_code=400, detail=f"Order cannot be delivered (status: {order.status})")

    order_update = OrderUpdate(status=OrderStatus.DELIVERED)
    order = crud_order.update(db, db_obj=order, obj_in=order_update)
    return order
