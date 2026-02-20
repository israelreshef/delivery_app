from datetime import timedelta
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.api import deps
from app.core import security
from app.core.config import settings
from app.crud.user import user as crud_user
from app.schemas.auth import Token, User

router = APIRouter()

@router.post("/login")
def login_access_token(
    db: Session = Depends(deps.get_db), form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests
    """
    user = crud_user.authenticate(
        db, email=form_data.username, password=form_data.password
    )
    if not user:
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    elif not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        user.email, expires_delta=access_token_expires
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "token": access_token,
        "user": {
            "id": str(user.id),
            "username": user.email,
            "email": user.email,
            "full_name": user.full_name or "User",
            "user_type": user.role.value if user.role else "customer",
            "is_approved": getattr(user, 'is_approved', True)
        }
    }

@router.get("/me", response_model=User)
def read_users_me(
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get current user.
    """
    return current_user

# --- Google Auth ---
from app.core.google_auth import GoogleAuth
from app.schemas.auth import GoogleLogin

@router.post("/login/google")
def login_google(
    login_data: GoogleLogin,
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    Login with Google ID token.
    """
    # Verify token with Google
    google_user = GoogleAuth.verify_id_token(login_data.id_token)
    if not google_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google token",
        )
    
    email = google_user['email']
    # Check if user exists
    user = crud_user.get_by_email(db, email=email)
    if not user:
        # Auto-register new user
        from app.schemas.auth import UserCreate
        from app.models.user import UserRole as UserRoleModel
        user_in = UserCreate(
            email=email,
            password=security.get_password_hash(login_data.id_token[:10]),
            full_name=google_user.get('name', ''),
            phone_number="",
            role=UserRoleModel.COURIER
        )
        user = crud_user.create(db, obj_in=user_in)
    
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        user.email, expires_delta=access_token_expires
    )
    refresh_token = security.create_access_token(
        user.email, expires_delta=timedelta(days=30)
    )
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": {
            "id": str(user.id),
            "name": user.full_name or "Courier",
            "phone": user.phone_number or "",
            "email": user.email or "",
            "profile_image": None,
            "rating": None,
            "is_approved": getattr(user, 'is_approved', True)
        }
    }

# --- OTP Auth ---
from app.schemas.auth import OtpRequest, OtpVerify
import random

# Simple in-memory storage for OTPs (For production use Redis!)
otp_storage = {} 

@router.post("/login/otp/request")
def request_otp(
    otp_request: OtpRequest,
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    Request an OTP for phone number login.
    """
    phone = otp_request.phone_number
    # Generate 6-digit OTP
    otp_code = str(random.randint(100000, 999999))
    
    # Store OTP (valid for 5 mins)
    otp_storage[phone] = otp_code
    
    # TODO: Send SMS via provider (Twilio, AWS SNS, etc.)
    # For dev: Log to console
    print(f"------------ OTP FOR {phone}: {otp_code} ------------")
    
    return {"message": "OTP sent successfully"}

@router.post("/login/otp/verify")
def verify_otp(
    otp_verify: OtpVerify,
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    Verify OTP and login/register user.
    """
    phone = otp_verify.phone_number
    code = otp_verify.otp_code
    
    if phone not in otp_storage or otp_storage[phone] != code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP"
        )
        
    # Clear OTP
    del otp_storage[phone]
    
    # Check if user exists by phone
    user = crud_user.get_by_phone(db, phone=phone)
    
    if not user:
        # Create new user
        from app.schemas.auth import UserCreate
        # Create a dummy email for phone users if email is unique constraint
        dummy_email = f"{phone}@phone.tzir.com" 
        user_in = UserCreate(
            email=dummy_email,
            password=security.get_password_hash(code),
            full_name="Phone User",
            phone_number=phone
        )
        user = crud_user.create(db, obj_in=user_in)
        
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        user.email, expires_delta=access_token_expires
    )
    refresh_token = security.create_access_token(
        user.email, expires_delta=timedelta(days=30)
    )
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "name": user.full_name or "Phone User",
            "phone": user.phone_number or "",
            "email": user.email or "",
            "profile_image": None,
            "rating": None,
            "is_approved": getattr(user, 'is_approved', True)
        }
    }
