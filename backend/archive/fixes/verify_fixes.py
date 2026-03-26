"""Verification script for bug fixes."""
import sys

ok = 0
fail = 0
modules = [
    'app.main',
    'app.core.config',
    'app.core.db',
    'app.core.security',
    'app.core.socket',
    'app.core.notifications',
    'app.core.celery_app',
    'app.core.google_auth',
    'app.api.deps',
    'app.api.v1.api',
    'app.api.v1.endpoints.auth',
    'app.api.v1.endpoints.orders',
    'app.api.v1.endpoints.couriers',
    'app.api.v1.endpoints.notifications',
    'app.api.v1.endpoints.users',
    'app.crud.user',
    'app.crud.order',
    'app.crud.courier',
    'app.crud.notification',
    'app.crud.address',
    'app.models.user',
    'app.models.order',
    'app.models.courier',
    'app.models.notification',
    'app.models.address',
    'app.schemas.auth',
    'app.schemas.order',
    'app.schemas.courier',
    'app.schemas.notification',
    'app.schemas.address',
]

print("=" * 50)
print("  Bug Fix Verification - Module Imports")
print("=" * 50)

for m in modules:
    try:
        __import__(m)
        ok += 1
        print(f"  OK:   {m}")
    except Exception as e:
        fail += 1
        print(f"  FAIL: {m} -> {e}")

print("=" * 50)

# Specific checks
print("\n--- Specific Bug Fix Checks ---")

# B1/B2: CRUDUser param names
try:
    from app.crud.user import user as crud_user
    import inspect
    sig = inspect.signature(crud_user.create)
    params = list(sig.parameters.keys())
    assert 'obj_in' in params, f"B1 FAIL: 'obj_in' not in create() params: {params}"
    print("  OK:   B1 - CRUDUser.create() accepts obj_in")
    
    sig2 = inspect.signature(crud_user.get)
    params2 = list(sig2.parameters.keys())
    assert 'id' in params2, f"B2 FAIL: 'id' not in get() params: {params2}"
    print("  OK:   B2 - CRUDUser.get() accepts id")
except Exception as e:
    print(f"  FAIL: B1/B2 - {e}")

# B3: Redis config
try:
    from app.core.config import settings
    assert hasattr(settings, 'REDIS_HOST'), "REDIS_HOST missing"
    assert hasattr(settings, 'REDIS_PORT'), "REDIS_PORT missing"
    print(f"  OK:   B3 - REDIS_HOST={settings.REDIS_HOST}, REDIS_PORT={settings.REDIS_PORT}")
except Exception as e:
    print(f"  FAIL: B3 - {e}")

# B8: main.py app vs application
try:
    from app.main import app, application
    from fastapi import FastAPI
    assert isinstance(app, FastAPI), f"app should be FastAPI, got {type(app)}"
    print(f"  OK:   B8 - app=FastAPI, application={type(application).__name__}")
except Exception as e:
    print(f"  FAIL: B8 - {e}")

print("=" * 50)
print(f"\nRESULT: {ok} imports passed, {fail} imports failed")
if fail == 0:
    print("ALL CHECKS PASSED!")
else:
    print("SOME CHECKS FAILED!")
    sys.exit(1)
