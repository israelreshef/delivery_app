from flask import Blueprint, jsonify
from sqlalchemy import func
from datetime import datetime, timedelta
from models import db, Delivery, User, Invoice
from utils.decorators import token_required, admin_required

stats_bp = Blueprint('stats', __name__)

@stats_bp.route('/dashboard', methods=['GET'])
@token_required
@admin_required
def get_dashboard_stats(current_user):
    """Get high-level dashboard statistics"""
    
    # 1. Orders Today
    today = datetime.utcnow().date()
    orders_today = Delivery.query.filter(func.date(Delivery.created_at) == today).count()
    
    # 2. Active Orders (Pending, Assigned, Picked Up, In Transit)
    active_orders = Delivery.query.filter(Delivery.status.in_(['pending', 'assigned', 'picked_up', 'in_transit'])).count()
    
    # 3. Active Couriers
    active_couriers = User.query.filter_by(user_type='courier').count() 
    
    # 4. Total Revenue Today
    revenue_today = db.session.query(func.sum(Invoice.total_amount)).filter(func.date(Invoice.issue_date) == today, Invoice.status == 'paid').scalar() or 0
    
    return jsonify({
        'orders_today': orders_today,
        'active_orders': active_orders,
        'active_couriers': active_couriers,
        'revenue_today': float(revenue_today)
    }), 200

@stats_bp.route('/revenue', methods=['GET'])
@token_required
@admin_required
def get_revenue_chart(current_user):
    """Get revenue for the last 7 days"""
    end_date = datetime.utcnow().date()
    start_date = end_date - timedelta(days=6)
    
    # Query: Date, Sum(Total_Amount)
    results = db.session.query(
        func.date(Invoice.issue_date).label('date'),
        func.sum(Invoice.total_amount).label('total')
    ).filter(
        func.date(Invoice.issue_date) >= start_date,
        Invoice.status == 'paid'
    ).group_by(
        func.date(Invoice.issue_date)
    ).all()
    
    # Create map for O(1) lookup
    revenue_map = {str(r.date): float(r.total) for r in results}
    
    # Fill in missing days with 0
    chart_data = []
    for i in range(7):
        current_day = start_date + timedelta(days=i)
        day_str = str(current_day)
        chart_data.append({
            'date': day_str,
            'amount': revenue_map.get(day_str, 0)
        })
        
    return jsonify(chart_data), 200
