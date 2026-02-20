from typing import Optional
from pydantic import BaseModel

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenPayload(BaseModel):
    sub: Optional[str] = None

class TokenData(BaseModel):
    sub: Optional[str] = None

class User(BaseModel):
    username: Optional[str] = None 
    email: Optional[str] = None
    is_active: Optional[bool] = True
    is_superuser: bool = False

class UserCreate(BaseModel):
    email: str
    password: str
    full_name: str = ""
    phone_number: str = ""
    role: Optional[str] = "customer"
    is_active: bool = True

class UserUpdate(BaseModel):
    email: Optional[str] = None
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    is_approved: Optional[bool] = None
    
class GoogleLogin(BaseModel):
    id_token: str

class OtpRequest(BaseModel):
    phone_number: str

class OtpVerify(BaseModel):
    phone_number: str
    otp_code: str

