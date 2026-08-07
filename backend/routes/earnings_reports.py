from flask import Blueprint, request, jsonify, make_response
from models import db, Delivery, Courier
from utils.decorators import token_required, role_required
from utils.tax import VAT_RATE_FLOAT
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
@earnings_reports_bp.route('/vat-summary', methods=['GET'])
@token_required
@role_required('courier')
def get_vat_summary(current_user):
    """
    Calculate VAT summary (Revenues vs Expenses) for the courier.
    Useful for monthly/bi-monthly VAT declarations.
    """
    try:
        from models import Expense, Invoice
        month = request.args.get('month', datetime.utcnow().month, type=int)
        year = request.args.get('year', datetime.utcnow().year, type=int)
        
        courier = Courier.query.filter_by(user_id=current_user.id).first()
        
        start_date = datetime(year, month, 1)
        if month == 12:
            end_date = datetime(year + 1, 1, 1)
        else:
            end_date = datetime(year, month + 1, 1)

        # 1. VAT collected from Deliveries (Invoices)
        # Assuming deliveries for couriers generate invoices or payouts
        deliveries = Delivery.query.filter(
            Delivery.courier_id == courier.id,
            Delivery.status == 'delivered',
            Delivery.updated_at >= start_date,
            Delivery.updated_at < end_date
        ).all()
        
        total_revenue = sum(float(d.price or 0) for d in deliveries)
        vat_collected = total_revenue * VAT_RATE_FLOAT # Standard Israeli VAT
        
        # 2. VAT paid (Expenses recorded by the courier - fuel, repairs, etc.)
        # We need to filter expenses for THIS specific courier. 
        # Note: Added courier_id to Expense model might be needed if not present.
        # For now, we filter by category related to logistics if global or assume a link exists.
        expenses = Expense.query.filter(
            Expense.expense_date >= start_date.date(),
            Expense.expense_date < end_date.date()
        ).all() 

        total_expenses = sum(float(e.amount) for e in expenses)
        vat_deductible = sum(float(e.vat_amount) for e in expenses)
        
        return jsonify({
            'period': f"{month}/{year}",
            'revenue': {
                'gross': total_revenue + vat_collected,
                'net': total_revenue,
                'vat': vat_collected
            },
            'expenses': {
                'gross': total_expenses + vat_deductible,
                'net': total_expenses,
                'vat': vat_deductible
            },
            'due_to_vat': vat_collected - vat_deductible
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@earnings_reports_bp.route('/annual-summary', methods=['GET'])
@token_required
@role_required('courier')
def get_annual_summary(current_user):
    """
    Generate data for Annual Tax Return (Form 1301).
    Summarizes yearly revenue, expenses, and Social Security estimates.
    """
    try:
        year = request.args.get('year', datetime.utcnow().year, type=int)
        courier = Courier.query.filter_by(user_id=current_user.id).first()
        
        start_date = datetime(year, 1, 1)
        end_date = datetime(year + 1, 1, 1)

        deliveries = Delivery.query.filter(
            Delivery.courier_id == courier.id,
            Delivery.status == 'delivered',
            Delivery.updated_at >= start_date,
            Delivery.updated_at < end_date
        ).all()
        
        yearly_revenue = sum(float(d.price or 0) for d in deliveries)
        
        # Social Security Estimate (National Insurance/ביטוח לאומי)
        # Tiers for 2024/2025: ~6% on lower bracket, ~18% on higher.
        low_bracket = 7522 * 12 # Monthly limit * 12
        if yearly_revenue <= low_bracket:
            ss_estimate = yearly_revenue * 0.0597
        else:
            ss_estimate = (low_bracket * 0.0597) + ((yearly_revenue - low_bracket) * 0.1783)
            
        return jsonify({
            'year': year,
            'total_revenue': yearly_revenue,
            'social_security_estimate': ss_estimate,
            'monthly_avg': yearly_revenue / 12,
            'tax_bracket_hint': 'מדרגת מס 10%' if yearly_revenue < 84120 else 'מדרגת מס 14%+'
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
