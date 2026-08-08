"""Typed request schemas + JSON safety limits for the API (S3: OpenAPI + validation).

Central registry that drives both the OpenAPI document (request ``$ref`` bodies)
and runtime request validation (see ``utils/openapi.py`` ``validate_api_json``).

Design
  * Each pydantic model describes the *accepted* shape of one route's JSON body.
  * ``REQUEST_SCHEMAS`` maps ``(path_template, HTTP method) -> model``. The path
    template is the exact Flask rule string (e.g. ``/api/courier/schedule``).
  * Schemas are deliberately *tolerant* (extra keys ignored, most fields
    optional) so validation only rejects type errors and clearly malformed
    payloads — business rules stay in the route handlers.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field, field_validator, model_validator

logger = logging.getLogger(__name__)

# --------------------------------------------------------------------------- #
# Generic JSON safety railings (parser hardening — complements proxy WAF)    #
# --------------------------------------------------------------------------- #

MAX_JSON_DEPTH = 64          # guard against deeply nested payloads
MAX_JSON_KEYS = 2000         # guard against key-flooding payloads
MAX_JSON_BODY_BYTES = 1_048_576  # 1 MiB cap on JSON request bodies


def json_depth(value: Any, _depth: int = 0) -> int:
    """Return nesting depth of a decoded JSON value."""
    if _depth > MAX_JSON_DEPTH:
        return _depth
    if isinstance(value, dict):
        if not value:
            return _depth
        return max(json_depth(v, _depth + 1) for v in value.values())
    if isinstance(value, list):
        if not value:
            return _depth
        return max(json_depth(item, _depth + 1) for item in value)
    return _depth


def count_json_keys(value: Any, _count: int = 0) -> int:
    """Return total number of mapping keys across the whole payload."""
    if isinstance(value, dict):
        _count += len(value)
        for v in value.values():
            _count = count_json_keys(v, _count)
            if _count > MAX_JSON_KEYS:
                return _count
    elif isinstance(value, list):
        for item in value:
            _count = count_json_keys(item, _count)
            if _count > MAX_JSON_KEYS:
                return _count
    return _count


def json_safety_errors(payload: Any) -> List[str]:
    """Return a list of guard failures (empty when the payload is acceptable)."""
    errors: List[str] = []
    depth = json_depth(payload)
    if depth > MAX_JSON_DEPTH:
        errors.append(f"JSON nesting depth {depth} exceeds limit {MAX_JSON_DEPTH}")
    keys = count_json_keys(payload)
    if keys > MAX_JSON_KEYS:
        errors.append(f"JSON object has {keys} keys (limit {MAX_JSON_KEYS})")
    return errors


# --------------------------------------------------------------------------- #
# Typed request schemas                                                       #
# --------------------------------------------------------------------------- #


class LoginRequest(BaseModel):
    password: str = Field(..., min_length=1, max_length=256)
    username: Optional[str] = Field(None, max_length=64)
    email: Optional[str] = Field(None, max_length=254)
    token: Optional[str] = Field(None, max_length=1024)  # google login reuse

    @model_validator(mode="after")
    def _identifier_or_token(self) -> "LoginRequest":
        have_ident = bool(self.username or self.email)
        if not have_ident and not self.token:
            raise ValueError("either username, email or token is required")
        return self


class RegisterRequest(BaseModel):
    email: str = Field(..., max_length=254)
    password: str = Field(..., min_length=8, max_length=256)
    user_type: Literal["customer", "courier"]
    username: Optional[str] = Field(None, max_length=64)
    phone: Optional[str] = Field(None, max_length=32)
    full_name: Optional[str] = Field(None, max_length=128)
    company_name: Optional[str] = Field(None, max_length=128)
    customer_type: Optional[str] = Field(None, max_length=32)
    vehicle_type: Optional[str] = Field(None, max_length=32)
    license_plate: Optional[str] = Field(None, max_length=16)


class VerifyTokenRequest(BaseModel):
    token: str = Field(..., max_length=4096)


class FcmTokenRequest(BaseModel):
    fcm_token: Optional[str] = Field(None, max_length=2048)
    device_token: Optional[str] = Field(None, max_length=2048)

    @model_validator(mode="after")
    def _require_token(self) -> "FcmTokenRequest":
        if not (self.fcm_token or self.device_token):
            raise ValueError("fcm_token is required")
        return self


class ConsentRequest(BaseModel):
    terms_accepted: Optional[bool] = None
    privacy_policy_accepted: Optional[bool] = None


class ResetPasswordRequest(BaseModel):
    user_id: int
    password: str = Field(..., min_length=8, max_length=256)


class TwoFactorReviewRequest(BaseModel):
    code: str = Field(..., min_length=6, max_length=16)


class MfaLoginRequest(BaseModel):
    mfa_token: str = Field(..., max_length=2048)
    code: str = Field(..., min_length=6, max_length=16)


class ScheduleRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    start: str = Field(..., pattern=r"^([01]\d|2[0-3]):[0-5]\d$")
    end: Optional[str] = Field(None, pattern=r"^([01]\d|2[0-3]):[0-5]\d$")
    pickup_address: Optional[str] = Field(None, max_length=300)
    dropoff_address: Optional[str] = Field(None, max_length=300)


class OrderCreateRequest(BaseModel):
    """Permissive shape of the order wizard payload.

    The handler itself validates the nested wizard structure; here we only
    enforce the high-level *types* so garbage payloads fail fast with 422.
    """
    sender: Optional[dict[str, Any]] = None
    recipient: Optional[dict[str, Any]] = None
    package: Optional[dict[str, Any]] = None
    service: Optional[dict[str, Any]] = None
    notes: Optional[str] = Field(None, max_length=2000)
    # Flat legacy fields
    pickup_address: Optional[dict[str, Any] | str] = None
    delivery_address: Optional[dict[str, Any] | str] = None
    pickup_contact_name: Optional[str] = Field(None, max_length=128)
    pickup_contact_phone: Optional[str] = Field(None, max_length=32)
    recipient_name: Optional[str] = Field(None, max_length=128)
    recipient_phone: Optional[str] = Field(None, max_length=32)
    package_content: Optional[str] = Field(None, max_length=300)
    package_weight: Optional[float] = Field(None, ge=0)
    delivery_type: Optional[str] = Field(None, max_length=32)
    urgency: Optional[str] = Field(None, max_length=32)
    insurance_required: Optional[bool] = None
    insurance_value: Optional[float] = Field(None, ge=0)


# --------------------------------------------------------------------------- #
# Registry (path template, method) -> pydantic model                          #
# --------------------------------------------------------------------------- #

REQUEST_SCHEMAS: dict[tuple[str, str], type[BaseModel]] = {
    ("/api/auth/login", "POST"): LoginRequest,
    ("/api/auth/register", "POST"): RegisterRequest,
    ("/api/auth/verify-token", "POST"): VerifyTokenRequest,
    ("/api/auth/fcm-token", "POST"): FcmTokenRequest,
    ("/api/auth/consent", "POST"): ConsentRequest,
    ("/api/auth/admin/reset-password", "POST"): ResetPasswordRequest,
    ("/api/auth/2fa/verify-and-enable", "POST"): TwoFactorReviewRequest,
    ("/api/auth/2fa/login-verify", "POST"): MfaLoginRequest,
    ("/api/courier/schedule", "POST"): ScheduleRequest,
    ("/api/orders", "POST"): OrderCreateRequest,
    ("/api/orders/create", "POST"): OrderCreateRequest,
}


def schema_for(path: str, method: str) -> type[BaseModel] | None:
    """Resolve the request schema (if any) for a Flask rule + method."""
    return REQUEST_SCHEMAS.get((path, method.upper()))


def request_spec_ref(path: str, method: str) -> dict[str, Any] | None:
    """Return OpenAPI requestBody content doc for a registered route."""
    model = schema_for(path, method)
    if model is None:
        return None
    meta = getattr(model, "openapi_meta", None) or {}
    description = meta.get("description", "")

    class_ref = {"$ref": f"#/components/schemas/{model.__name__}"}
    return {
        "description": description,
        "required": True,
        "content": {"application/json": {"schema": class_ref}},
    }


def model_openapi_schema(model: type[BaseModel]) -> dict[str, Any]:
    """pydantic JSON schema, cleaned of $defs (inlined) — for safe embedding."""
    raw = model.model_json_schema()
    defs = raw.pop("$defs", {})
    # Inline any referenced definitions into the schema itself.
    if defs:
        raw["definitions"] = defs
    return raw