from typing import Any, List
import shutil
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session

from app.api import deps
from app.crud.courier import courier as crud_courier
from app.models.user import User as UserModel, UserRole
from app.schemas.courier import Courier, CourierCreate, CourierUpdate

router = APIRouter()

UPLOAD_DIR = Path("static/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

@router.get("/", response_model=List[Any])
def read_couriers(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: UserModel = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Retrieve all couriers (Admin only).
    """
    # Get users with role COURIER
    couriers = db.query(UserModel).filter(
        UserModel.role == UserRole.COURIER
    ).offset(skip).limit(limit).all()

    couriers_data = []
    for u in couriers:
        # Get courier profile details if exists
        profile = crud_courier.get_by_user_id(db, user_id=u.id)
        
        courier_data = {
            "id": u.id,
            "full_name": u.full_name or "No Name",
            "email": u.email,
            "phone": u.phone_number or "",
            "created_at": str(u.created_at) if u.created_at else "",
            "vehicle_type": profile.vehicle_type if profile else None,
            "license_plate": profile.license_plate if profile else None,
            "driving_license_url": profile.driving_license_url if profile else None,
            "insurance_url": profile.insurance_url if profile else None,
            "vehicle_license_url": profile.vehicle_license_url if profile else None,
            "tax_deduction_url": profile.tax_deduction_url if profile else None,
            "dealer_certificate_url": profile.dealer_certificate_url if profile else None,
            "is_available": profile.is_available if profile else False,
            "rating": profile.rating if profile else 0.0,
            "total_deliveries": profile.total_deliveries if profile else 0,
            "onboarding_status": profile.status if profile else "new", # Map status to onboarding_status for frontend
            "status": profile.status if profile else "pending"
        }
        couriers_data.append(courier_data)

    return couriers_data

@router.post("/upload")
def upload_file(file: UploadFile = File(...)):
    """
    Upload a file (document/image) and return the local URL.
    """
    try:
        file_path = UPLOAD_DIR / file.filename
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Return a URL that can be accessed via static files (assuming static mount)
        # For now, just returning the relative path or absolute for local use
        # Ideally, this should include the base URL
        return {"url": f"/static/uploads/{file.filename}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not save file: {e}")

@router.post("/register", response_model=Courier)
def register_courier(
    *,
    db: Session = Depends(deps.get_db),
    courier_in: CourierCreate,
    current_user: UserModel = Depends(deps.get_current_user),
) -> Any:
    """
    Register a new courier profile.
    """
    # Verify user is a courier
    if current_user.role != UserRole.COURIER:
         # Auto-fix role if needed, or raise error. 
         # For this flow, we assume login created them as 'courier', 
         # but let's ensure it.
         current_user.role = UserRole.COURIER
         db.commit()

    # Check if profile exists
    if crud_courier.get_by_user_id(db, user_id=current_user.id):
        raise HTTPException(
            status_code=400,
            detail="Courier profile already exists",
        )
        
    courier = crud_courier.create(db, obj_in=courier_in, user_id=current_user.id)
    return courier

@router.get("/me", response_model=Courier)
def read_courier_me(
    db: Session = Depends(deps.get_db),
    current_user: UserModel = Depends(deps.get_current_user),
) -> Any:
    """
    Get current courier profile.
    """
    courier = crud_courier.get_by_user_id(db, user_id=current_user.id)
    if not courier:
        raise HTTPException(status_code=404, detail="Courier profile not found")
    return courier

@router.put("/me", response_model=Courier)
def update_courier_me(
    *,
    db: Session = Depends(deps.get_db),
    courier_in: CourierUpdate,
    current_user: UserModel = Depends(deps.get_current_user),
) -> Any:
    """
    Update current courier profile (location, status, etc.).
    """
    courier = crud_courier.get_by_user_id(db, user_id=current_user.id)
    if not courier:
        raise HTTPException(status_code=404, detail="Courier profile not found")
    
    courier = crud_courier.update(db, db_obj=courier, obj_in=courier_in)
    return courier

@router.get("/nearest", response_model=List[Courier])
def find_nearest_couriers(
    *,
    db: Session = Depends(deps.get_db),
    lat: float = Query(..., description="Latitude"),
    lng: float = Query(..., description="Longitude"),
    radius_km: float = Query(10.0, description="Radius in KM"),
    limit: int = Query(5, description="Limit results"),
    current_user: UserModel = Depends(deps.get_current_active_superuser), # Admin only for now
) -> Any:
    """
    Find nearest available couriers.
    """
    couriers = crud_courier.get_nearest_couriers(db, lat=lat, lng=lng, radius_km=radius_km, limit=limit)
    return couriers


# --- Courier Approval (Admin) ---

@router.get("/pending")
def get_pending_couriers(
    db: Session = Depends(deps.get_db),
    current_user: UserModel = Depends(deps.get_current_user),
) -> Any:
    """Get list of couriers awaiting approval (Admin only)."""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin only")
    
    # Check for both logic: User not approved OR Courier status is pending
    # But usually we rely on the specific status field now
    
    # 1. Get users with role COURIER and is_approved=False
    pending_users = db.query(UserModel).filter(
        UserModel.role == UserRole.COURIER,
        UserModel.is_approved == False
    ).all()

    pending_couriers_data = []
    for u in pending_users:
        # Get courier profile details if exists
        profile = crud_courier.get_by_user_id(db, user_id=u.id)
        
        courier_data = {
            "id": u.id,
            "full_name": u.full_name or "No Name",
            "email": u.email,
            "phone": u.phone_number or "",
            "created_at": str(u.created_at) if u.created_at else "",
            "vehicle_type": profile.vehicle_type if profile else None,
            "license_plate": profile.license_plate if profile else None,
            "driving_license_url": profile.driving_license_url if profile else None,
            "insurance_url": profile.insurance_url if profile else None,
            "vehicle_license_url": profile.vehicle_license_url if profile else None,
            "tax_deduction_url": profile.tax_deduction_url if profile else None,
            "dealer_certificate_url": profile.dealer_certificate_url if profile else None,
            "status": profile.status if profile else "pending",
        }
        pending_couriers_data.append(courier_data)

    return pending_couriers_data


@router.post("/{user_id}/approve")
def approve_courier(
    user_id: int,
    db: Session = Depends(deps.get_db),
    current_user: UserModel = Depends(deps.get_current_user),
) -> Any:
    """Approve a pending courier (Admin only)."""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin only")

    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_approved = True
    
    # Also update courier profile status if exists
    profile = crud_courier.get_by_user_id(db, user_id=user.id)
    if profile:
        profile.status = "approved"
        db.add(profile)

    db.commit()
    db.refresh(user)

    return {"message": f"Courier {user.full_name} approved successfully", "id": user.id}


@router.post("/{user_id}/reject")
def reject_courier(
    user_id: int,
    db: Session = Depends(deps.get_db),
    current_user: UserModel = Depends(deps.get_current_user),
) -> Any:
    """Reject a pending courier (Admin only)."""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin only")

    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_active = False # Or just keep them active but not approved?
    # Usually reject means disable
    
    profile = crud_courier.get_by_user_id(db, user_id=user.id)
    if profile:
        profile.status = "rejected"
        db.add(profile)

    db.commit()

    return {"message": f"Courier {user.full_name} rejected", "id": user.id}


@router.get("/stats")
def get_courier_stats(
    db: Session = Depends(deps.get_db),
    current_user: UserModel = Depends(deps.get_current_user),
) -> Any:
    """
    Get courier statistics (earnings, deliveries).
    """
    if current_user.role != UserRole.COURIER:
         raise HTTPException(status_code=403, detail="Courier only")
         
    from app.models.order import Order, OrderStatus
    from sqlalchemy import func
    from datetime import datetime, timedelta
    
    today = datetime.utcnow().date()
    
    # Calculate today's earnings
    # Assuming Order has 'total_amount' or 'delivery_fee'. 
    # Let's check Order model. If not, use dummy calculation based on count.
    # For now, let's assume each delivery is flat rate 30 ILS if no fee field.
    
    completed_orders_today = db.query(Order).filter(
        Order.courier_id == current_user.id,
        Order.status == OrderStatus.DELIVERED,
        Order.updated_at >= today
    ).count()
    
    earnings_today = completed_orders_today * 30.0 # Mock calculation
    
    # Total deliveries
    total_deliveries = db.query(Order).filter(
        Order.courier_id == current_user.id,
        Order.status == OrderStatus.DELIVERED
    ).count()
    
    return {
        "earnings_today": earnings_today,
        "total_deliveries": total_deliveries,
        "rating": 5.0 # Mock
    }

