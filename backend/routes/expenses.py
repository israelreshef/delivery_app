"""
Expenses tracking routes for admin dashboard.
Tracks API usage costs, hosting costs, and other operational expenses.
"""
from flask import Blueprint, request, jsonify
from models import ApiUsage, db
from utils.decorators import token_required, admin_required, role_required
from datetime import datetime, timedelta
from sqlalchemy import func

expenses_bp = Blueprint('expenses', __name__)

# Service pricing configuration (USD)
SERVICE_PRICING = {
    'google_places': {
        'name': 'Google Places API',
        'icon': '',
        'cost_per_call': 0.00283,  # Per autocomplete request
        'monthly_free_credit': 200.0,  # Google's $200/month free tier
        'category': 'api'
    },
    'whatsapp_business': {
        'name': 'WhatsApp Business API',
        'icon': '',
        'cost_per_call': 0.0053,  # Latest Meta utility/auth rate Israel
        'monthly_free_credit': 0.0,
        'category': 'api'
    },
    'sms4free': {
        'name': 'Sms4Free (SMS)',
        'icon': '',
        'cost_per_call': 0.045,  # ~17 ILS for 100 msgs = 0.17 ILS ~ $0.045
        'monthly_free_credit': 0.0,
        'category': 'api'
    },
    'nominatim': {
        'name': 'OpenStreetMap (Nominatim)',
        'icon': '',
        'cost_per_call': 0.0,  # Free
        'monthly_free_credit': 0,
        'category': 'api'
    },
    'hosting_server': {
        'name': 'שרת Backend (Hetzner)',
        'icon': '',
        'cost_per_call': 0.0,
        'monthly_fixed': 4.5,  # Est. ~$4.50/mo for Hetzner
        'category': 'infrastructure'
    },
    'hosting_db': {
        'name': 'בסיס נתונים (PostgreSQL)',
        'icon': '',
        'cost_per_call': 0.0,
        'monthly_fixed': 0.0,
        'category': 'infrastructure'
    },
    'hosting_frontend': {
        'name': 'שרת Frontend (Vercel)',
        'icon': '',
        'cost_per_call': 0.0,
        'monthly_fixed': 0.0,
        'category': 'infrastructure'
    }
}


def track_api_call(service_name, count=1):
    """Track an API call for the expenses dashboard."""
    try:
        today = datetime.utcnow().date()
        pricing = SERVICE_PRICING.get(service_name, {})
        cost_per_call = pricing.get('cost_per_call', 0.0)
        
        # Try to find existing record for today
        usage = ApiUsage.query.filter_by(
            service_name=service_name,
            usage_date=today
        ).first()
        
        if usage:
            usage.call_count += count
            usage.total_cost = usage.call_count * cost_per_call
        else:
            usage = ApiUsage(
                service_name=service_name,
                usage_date=today,
                call_count=count,
                cost_per_call=cost_per_call,
                total_cost=count * cost_per_call
            )
            db.session.add(usage)
        
        db.session.commit()
        
        try:
            from app import socketio
            socketio.emit('expenses_updated', {
                'service': service_name,
                'count': count
            })
        except Exception as se:
            print(f"Socket IO expenses_updated emit failed: {se}")
            
    except Exception as e:
        db.session.rollback()
        print(f"Error tracking API usage: {e}")


@expenses_bp.route('/summary', methods=['GET'])
@token_required
@role_required(['admin', 'finance_admin'])
def get_expenses_summary(current_user):
    """Get comprehensive expenses summary for the dashboard."""
    try:
        today = datetime.utcnow().date()
        month_start = today.replace(day=1)
        week_start = today - timedelta(days=today.weekday())
        
        # Get all usage records for this month
        monthly_usage = ApiUsage.query.filter(
            ApiUsage.usage_date >= month_start
        ).all()
        
        # Aggregate by service
        services = {}
        for usage in monthly_usage:
            if usage.service_name not in services:
                pricing = SERVICE_PRICING.get(usage.service_name, {})
                services[usage.service_name] = {
                    'name': pricing.get('name', usage.service_name),
                    'icon': pricing.get('icon', ''),
                    'category': pricing.get('category', 'other'),
                    'total_calls': 0,
                    'total_cost': 0.0,
                    'cost_per_call': pricing.get('cost_per_call', 0.0),
                    'monthly_free_credit': pricing.get('monthly_free_credit', 0.0),
                    'monthly_fixed': pricing.get('monthly_fixed', 0.0),
                }
            services[usage.service_name]['total_calls'] += usage.call_count
            services[usage.service_name]['total_cost'] += usage.total_cost
        
        # Add infrastructure services that have fixed monthly costs even without API calls
        for svc_key, svc_info in SERVICE_PRICING.items():
            if svc_key not in services:
                services[svc_key] = {
                    'name': svc_info.get('name', svc_key),
                    'icon': svc_info.get('icon', ''),
                    'category': svc_info.get('category', 'other'),
                    'total_calls': 0,
                    'total_cost': 0.0,
                    'cost_per_call': svc_info.get('cost_per_call', 0.0),
                    'monthly_free_credit': svc_info.get('monthly_free_credit', 0.0),
                    'monthly_fixed': svc_info.get('monthly_fixed', 0.0),
                }
        
        # Today's costs
        today_usage = [u for u in monthly_usage if u.usage_date == today]
        today_cost = sum(u.total_cost for u in today_usage)
        today_calls = sum(u.call_count for u in today_usage)
        
        # This month total
        month_cost = sum(s['total_cost'] + s.get('monthly_fixed', 0) for s in services.values())
        month_calls = sum(s['total_calls'] for s in services.values())
        
        # Google free credit calculation
        google_data = services.get('google_places', {})
        google_cost = google_data.get('total_cost', 0)
        google_free_credit = google_data.get('monthly_free_credit', 200)
        google_effective_cost = max(0, google_cost - google_free_credit)
        
        # Daily breakdown for chart (last 14 days)
        chart_start = today - timedelta(days=13)
        daily_data = db.session.query(
            ApiUsage.usage_date,
            func.sum(ApiUsage.total_cost).label('cost'),
            func.sum(ApiUsage.call_count).label('calls')
        ).filter(
            ApiUsage.usage_date >= chart_start
        ).group_by(
            ApiUsage.usage_date
        ).order_by(
            ApiUsage.usage_date
        ).all()
        
        # Fill in missing days with zeros
        day_map = {row.usage_date: {'cost': float(row.cost or 0), 'calls': int(row.calls or 0)} for row in daily_data}
        chart = []
        for i in range(14):
            d = chart_start + timedelta(days=i)
            data = day_map.get(d, {'cost': 0, 'calls': 0})
            chart.append({
                'date': d.strftime('%d/%m'),
                'cost': round(data['cost'], 4),
                'calls': data['calls']
            })
        
        return jsonify({
            'today': {
                'cost': round(today_cost, 4),
                'calls': today_calls
            },
            'month': {
                'cost': round(month_cost, 4),
                'calls': month_calls,
                'effective_cost': round(month_cost - min(google_cost, google_free_credit), 4)
            },
            'google_credit': {
                'used': round(google_cost, 4),
                'total': google_free_credit,
                'remaining': round(max(0, google_free_credit - google_cost), 4),
                'percent_used': round(min(100, (google_cost / google_free_credit) * 100), 1) if google_free_credit > 0 else 0
            },
            'services': list(services.values()),
            'chart': chart
        }), 200
        
    except Exception as e:
        print(f"Error fetching expenses: {e}")
        return jsonify({
            'today': {'cost': 0, 'calls': 0},
            'month': {'cost': 0, 'calls': 0, 'effective_cost': 0},
            'google_credit': {'used': 0, 'total': 200, 'remaining': 200, 'percent_used': 0},
            'services': [],
            'chart': []
        }), 200
