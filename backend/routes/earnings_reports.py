from flask import Blueprint, request, jsonify, make_response
from models import db, Delivery, Courier
from utils.decorators import token_required, role_required
from datetime import datetime, timedelta
import csv
import io
import logging

earnings_reports_bp = Blueprint('earnings_reports', __name__)

@earnings_reports_bp.route('/export', methods=['GET'])
@token_required
@role_required('courier')
def export_earnings(current_user):
    """
    Export courier earnings report for a specific period
    """
    try:
        month = request.args.get('month', type=int)
        year = request.args.get('year', type=int)
        
        if not month or not year:
            return jsonify({'error': 'Month and Year required'}), 400
            
        courier = Courier.query.filter_by(user_id=current_user.id).first()
        if not courier:
            return jsonify({'error': 'Courier profile not found'}), 404

        start_date = datetime(year, month, 1)
        if month == 12:
            end_date = datetime(year + 1, 1, 1)
        else:
            end_date = datetime(year, month + 1, 1)

        deliveries = Delivery.query.filter(
            Delivery.courier_id == courier.id,
            Delivery.status == 'delivered',
            Delivery.updated_at >= start_date,
            Delivery.updated_at < end_date
        ).order_by(Delivery.updated_at.asc()).all()

        si = io.StringIO()
        cw = csv.writer(si)
        
        # CSV Headers
        cw.writerow(['ID המשלוח', 'תאריך', 'מכתובת', 'אל כתובת', 'מרחק (ק"מ)', 'זמן (דקות)', 'רווח (₪)'])
        
        total_payout = 0
        for d in deliveries:
            amount = float(d.price or 0)
            total_payout += amount
            
            duration_mins = ""
            if d.actual_pickup_time and d.actual_delivery_time:
                duration = d.actual_delivery_time - d.actual_pickup_time
                duration_mins = int(duration.total_seconds() / 60)

            cw.writerow([
                d.order_number,
                d.updated_at.strftime('%Y-%m-%d %H:%M') if d.updated_at else '',
                d.pickup_address,
                d.delivery_address,
                d.distance_km or 0,
                duration_mins,
                amount
            ])

        cw.writerow([])
        cw.writerow(['סה"כ לתשלום', '', '', '', '', '', total_payout])

        filename = f"earnings_{courier.full_name}_{year}_{month}.csv"
        
        output = make_response(si.getvalue().encode('utf-8-sig'))
        output.headers["Content-Disposition"] = f"attachment; filename={filename}"
        output.headers["Content-type"] = "text/csv"
        return output

    except Exception as e:
        logging.error(f"Error exporting earnings: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500
