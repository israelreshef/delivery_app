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
    try:
        # 1. Orders Today
        today = datetime.utcnow().date()
        orders_today = Delivery.query.filter(func.date(Delivery.created_at) == today).count()
        
        # 2. Active Orders (Pending, Assigned, Picked Up, In Transit)
        active_orders = Delivery.query.filter(Delivery.status.in_(['pending', 'assigned', 'picked_up', 'in_transit'])).count()
        
        # 3. Active Couriers (Online via Socket AND is_available=True in DB)
        from models import Courier, Customer
        from sockets.delivery_events import connected_couriers
        
        # Get set of unique courier IDs currently online
        online_courier_ids = [cid for cid in connected_couriers.values() if cid is not None]
        
        with open('stats_debug.log', 'a') as f:
            f.write(f"\n[{datetime.utcnow().isoformat()}] --- Dashboard Refresh ---\n")
            f.write(f"Connected SIDs/IDs: {connected_couriers}\n")
            f.write(f"Online Courier IDs: {online_courier_ids}\n")
        
        # Query total count of couriers marked as available in DB
        available_couriers_count = Courier.query.filter_by(is_available=True).count()
        
        with open('stats_debug.log', 'a') as f:
            f.write(f"Available in DB: {available_couriers_count}\n")
        
        # Intersection: Available in DB AND Online via Socket
        if online_courier_ids:
            active_couriers_query = Courier.query.filter(
                Courier.is_available == True,
                Courier.id.in_(online_courier_ids)
            ).all()
        else:
            active_couriers_query = []
            
        active_couriers_count = len(active_couriers_query)
        
        with open('stats_debug.log', 'a') as f:
            f.write(f"Active Couriers (Intersection): {active_couriers_count}\n")
        
        active_courier_list = [{
            'id': c.id,
            'name': c.full_name,
            'lat': c.current_location_lat,
            'lng': c.current_location_lng,
            'status': 'available',
            'last_seen': c.updated_at.isoformat() if hasattr(c, 'updated_at') and c.updated_at else datetime.utcnow().isoformat()
        } for c in active_couriers_query]
        
        available_couriers = active_couriers_count # Alias for frontend compatibility 
        
        # 4. Total Revenue Today
        try:
            revenue_today = db.session.query(func.sum(Invoice.total_amount)).filter(func.date(Invoice.issue_date) == today, Invoice.status == 'paid').scalar() or 0
        except Exception as rev_err:
            print(f"Error calculating revenue: {rev_err}")
            revenue_today = 0
            
        # 5. New Customers (Last 7 days)
        week_ago = datetime.utcnow() - timedelta(days=7)
        new_customers = Customer.query.filter(Customer.created_at >= week_ago).count()
        
        return jsonify({
            'orders_today': orders_today,
            'active_orders': active_orders,
            'active_couriers': active_couriers_count,
            'available_couriers': available_couriers,
            'active_courier_list': active_courier_list,
            'revenue_today': float(revenue_today),
            'new_customers': new_customers
        }), 200
    except Exception as e:
        print(f"Error in get_dashboard_stats: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

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
