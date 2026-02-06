from flask import Blueprint, request, jsonify, Response, make_response
from models import db, Delivery, Invoice, User, Courier
from utils.decorators import token_required, role_required
import logging
from datetime import datetime, timedelta
import csv
import io
from sqlalchemy import func, and_

reports_bp = Blueprint('reports', __name__)

@reports_bp.route('/revenue', methods=['GET'])
@token_required
@role_required(['admin', 'finance_admin'])
def get_revenue_report(current_user):
    """דוח הכנסות לפי טווח תאריכים"""
    try:
        start_date_str = request.args.get('start_date')
        end_date_str = request.args.get('end_date')
        
        # Default to this month
        if not start_date_str:
            start_date = datetime.utcnow().replace(day=1)
        else:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d')
            
        if not end_date_str:
            end_date = datetime.utcnow()
        else:
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d') + timedelta(days=1) # Include the end day

        # Query Revenue grouped by day
        revenue_data = db.session.query(
            func.date(Invoice.issue_date).label('date'),
            func.sum(Invoice.total_amount).label('total'),
            func.count(Invoice.id).label('count')
        ).filter(
            Invoice.issue_date >= start_date,
            Invoice.issue_date < end_date,
            Invoice.status.in_(['paid', 'sent']) # sent is also revenue theoretically
        ).group_by(
            func.date(Invoice.issue_date)
        ).all()
        
        result = []
        total_period_revenue = 0
        
        for r in revenue_data:
            amount = float(r.total)
            result.append({
                'date': r.date.strftime('%Y-%m-%d'),
                'amount': amount,
                'count': r.count
            })
            total_period_revenue += amount
            
        return jsonify({
            'period': {'start': start_date.strftime('%Y-%m-%d'), 'end': (end_date - timedelta(days=1)).strftime('%Y-%m-%d')},
            'daily_breakdown': result,
            'total_revenue': total_period_revenue
        }), 200
        
    except Exception as e:
        logging.error(f"Error generating revenue report: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

@reports_bp.route('/export', methods=['GET'])
@token_required
@role_required(['admin', 'finance_admin'])
def export_csv(current_user):
    """ייצוא דוחות ל-CSV"""
    try:
        report_type = request.args.get('type', 'orders')
        start_date_str = request.args.get('start_date')
        end_date_str = request.args.get('end_date')
        
        if not start_date_str or not end_date_str:
            return jsonify({'error': 'Date range required'}), 400
            
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d')
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d') + timedelta(days=1)
        
        si = io.StringIO()
        cw = csv.writer(si)
        
        filename = f"report_{report_type}_{datetime.now().strftime('%Y%m%d')}.csv"
        
        if report_type == 'orders':
            # Export Orders
            cw.writerow(['Order ID', 'Date', 'Status', 'Customer', 'Courier', 'Pickup', 'Dropoff', 'Price', 'Distance'])
            
            orders = Delivery.query.filter(
                Delivery.created_at >= start_date,
                Delivery.created_at < end_date
            ).all()
            
            for o in orders:
                cw.writerow([
                    o.order_number,
                    o.created_at.strftime('%Y-%m-%d %H:%M'),
                    o.status,
                    o.customer.full_name if o.customer else 'Guest',
                    o.courier.full_name if o.courier else 'Unassigned',
                    o.pickup_point.address.city if o.pickup_point else '',
                    o.delivery_point.address.city if o.delivery_point else '',
                    o.invoice.total_amount if o.invoice else 0,
                    o.distance_km or 0
                ])
                
        elif report_type == 'revenue':
            # Export Revenue
            cw.writerow(['Invoice ID', 'Date', 'Customer', 'Amount', 'VAT', 'Total', 'Status'])
            
            invoices = Invoice.query.filter(
                Invoice.issue_date >= start_date,
                Invoice.issue_date < end_date
            ).all()
            
            for i in invoices:
                cw.writerow([
                    i.invoice_number,
                    i.issue_date.strftime('%Y-%m-%d'),
                    i.customer.full_name if i.customer else 'Unknown',
                    i.subtotal,
                    i.vat_amount,
                    i.total_amount,
                    i.status
                ])
        
        else:
            return jsonify({'error': 'Invalid report type'}), 400
            
        output = make_response(si.getvalue().encode('utf-8-sig')) # utf-8-sig for Hebrew Excel support
        output.headers["Content-Disposition"] = f"attachment; filename={filename}"
        output.headers["Content-type"] = "text/csv"
        return output
        
    except Exception as e:
        logging.error(f"Error exporting CSV: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500
