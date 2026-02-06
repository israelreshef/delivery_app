# Query Optimization Examples
# Replace slow queries with optimized versions

from flask import Blueprint, request, jsonify
from models import db, Customer, Delivery, User
from sqlalchemy.orm import joinedload, selectinload
from utils.decorators import token_required, role_required

# ============================================================================
# BEFORE vs AFTER Examples
# ============================================================================

# ❌ SLOW - N+1 Problem
def get_customers_slow():
    customers = Customer.query.all()  # Query 1
    result = []
    for c in customers:
        result.append({
            'id': c.id,
            'name': c.full_name,
            'email': c.user.email,  # Query 2, 3, 4... (N+1!)
            'phone': c.user.phone
        })
    return result

# ✅ FAST - Eager Loading
def get_customers_fast():
    customers = Customer.query.options(
        joinedload(Customer.user)  # Single JOIN query!
    ).limit(100).all()
    
    result = []
    for c in customers:
        result.append({
            'id': c.id,
            'name': c.full_name,
            'email': c.user.email,  # No extra query!
            'phone': c.user.phone
        })
    return result

# ============================================================================

# ❌ SLOW - Loading all deliveries
def get_orders_slow():
    orders = Delivery.query.order_by(Delivery.created_at.desc()).all()
    return orders

# ✅ FAST - Pagination + Eager Loading
def get_orders_fast(page=1, per_page=20):
    orders = Delivery.query.options(
        joinedload(Delivery.customer).joinedload(Customer.user),
        joinedload(Delivery.courier).joinedload(Courier.user),
        joinedload(Delivery.pickup_point),
        joinedload(Delivery.delivery_point)
    ).order_by(
        Delivery.created_at.desc()
    ).paginate(
        page=page, 
        per_page=per_page, 
        error_out=False
    )
    
    return {
        'items': orders.items,
        'total': orders.total,
        'pages': orders.pages,
        'current_page': page
    }

# ============================================================================

# ❌ SLOW - Multiple queries
def get_dashboard_stats_slow():
    total_orders = Delivery.query.count()  # Query 1
    pending = Delivery.query.filter_by(status='pending').count()  # Query 2
    delivered = Delivery.query.filter_by(status='delivered').count()  # Query 3
    # ... more queries
    
# ✅ FAST - Single query with aggregation
def get_dashboard_stats_fast():
    from sqlalchemy import func, case
    
    stats = db.session.query(
        func.count(Delivery.id).label('total'),
        func.sum(case((Delivery.status == 'pending', 1), else_=0)).label('pending'),
        func.sum(case((Delivery.status == 'delivered', 1), else_=0)).label('delivered'),
        func.sum(case((Delivery.status == 'cancelled', 1), else_=0)).label('cancelled'),
        func.avg(Delivery.total_price).label('avg_price')
    ).first()
    
    return {
        'total': stats.total or 0,
        'pending': stats.pending or 0,
        'delivered': stats.delivered or 0,
        'cancelled': stats.cancelled or 0,
        'avg_price': float(stats.avg_price or 0)
    }

# ============================================================================

# ❌ SLOW - Loading all for search
def search_orders_slow(query_text):
    all_orders = Delivery.query.all()
    results = [o for o in all_orders if query_text in o.tracking_number]
    return results

# ✅ FAST - Database-level filtering
def search_orders_fast(query_text, page=1):
    orders = Delivery.query.filter(
        Delivery.tracking_number.ilike(f'%{query_text}%')
    ).limit(20).offset((page-1)*20).all()
    return orders

# ============================================================================
# CACHING EXAMPLE
# ============================================================================

from functools import lru_cache
from datetime import datetime, timedelta

# Simple in-memory cache
_cache = {}
_cache_timeout = {}

def cached_query(key, timeout_seconds=60):
    """Simple cache decorator"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            now = datetime.utcnow()
            
            # Check if cached and not expired
            if key in _cache and key in _cache_timeout:
                if now < _cache_timeout[key]:
                    return _cache[key]
            
            # Execute and cache
            result = func(*args, **kwargs)
            _cache[key] = result
            _cache_timeout[key] = now + timedelta(seconds=timeout_seconds)
            return result
        return wrapper
    return decorator

# Usage:
@cached_query('active_couriers', timeout_seconds=30)
def get_active_couriers():
    return Courier.query.filter_by(is_available=True).count()

# ============================================================================
# BATCH OPERATIONS
# ============================================================================

# ❌ SLOW - Individual inserts
def create_orders_slow(orders_data):
    for data in orders_data:
        order = Delivery(**data)
        db.session.add(order)
        db.session.commit()  # Commit each one!

# ✅ FAST - Bulk insert
def create_orders_fast(orders_data):
    orders = [Delivery(**data) for data in orders_data]
    db.session.bulk_save_objects(orders)
    db.session.commit()  # Single commit!

# ============================================================================
# SELECT ONLY NEEDED COLUMNS
# ============================================================================

# ❌ SLOW - Loading entire objects
def get_order_ids_slow():
    orders = Delivery.query.all()
    return [o.id for o in orders]

# ✅ FAST - Select specific columns
def get_order_ids_fast():
    result = db.session.query(Delivery.id).all()
    return [r[0] for r in result]
