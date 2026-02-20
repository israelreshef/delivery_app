from flask import Blueprint, request, jsonify, send_file
from models import db, Courier, CourierDocument, Payout, Delivery, User
from utils.decorators import token_required, role_required
from datetime import datetime, timedelta
from sqlalchemy import func, and_
import os
from werkzeug.utils import secure_filename
import logging

freelance_bp = Blueprint('freelance', __name__)

# File upload configuration
UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), '..', 'uploads', 'documents')
ALLOWED_EXTENSIONS = {'pdf', 'jpg', 'jpeg', 'png'}

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@freelance_bp.route('/documents', methods=['POST'])
@token_required
def upload_document(current_user):
    """
    Upload a document for courier verification
    """
    try:
        if current_user.user_type != 'courier':
            return jsonify({'error': 'Only couriers can upload documents'}), 403
        
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        document_type = request.form.get('document_type')
        expiry_date_str = request.form.get('expiry_date')
        
        if not document_type:
            return jsonify({'error': 'Document type is required'}), 400
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if file and allowed_file(file.filename):
            filename = secure_filename(f"{current_user.courier.id}_{document_type}_{datetime.now().strftime('%Y%m%d%H%M%S')}_{file.filename}")
            filepath = os.path.join(UPLOAD_FOLDER, filename)
            file.save(filepath)
            
            # Parse expiry date if provided
            expiry_date = None
            if expiry_date_str:
                try:
                    expiry_date = datetime.strptime(expiry_date_str, '%Y-%m-%d').date()
                except ValueError as e:
                    logging.warning(f"Invalid expiry date format: {expiry_date_str}")
            
            # Check if document of this type already exists
            existing_doc = CourierDocument.query.filter_by(
                courier_id=current_user.courier.id,
                document_type=document_type
            ).first()
            
            if existing_doc:
                # Update existing
                existing_doc.file_path = filepath
                existing_doc.status = 'pending'
                existing_doc.uploaded_at = datetime.utcnow()
                existing_doc.expiry_date = expiry_date
                existing_doc.reviewed_at = None
                existing_doc.reviewed_by = None
            else:
                # Create new
                doc = CourierDocument(
                    courier_id=current_user.courier.id,
                    document_type=document_type,
                    file_path=filepath,
                    expiry_date=expiry_date,
                    status='pending'
                )
                db.session.add(doc)
            
            db.session.commit()
            return jsonify({'message': 'Document uploaded successfully'}), 201
        
        return jsonify({'error': 'Invalid file type'}), 400
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@freelance_bp.route('/documents', methods=['GET'])
@token_required
def get_documents(current_user):
    """
    Get documents for current courier or all documents for admin
    """
    try:
        if current_user.user_type == 'courier':
            docs = CourierDocument.query.filter_by(courier_id=current_user.courier.id).all()
        elif current_user.user_type == 'admin':
            # Admin can filter by courier_id or status
            courier_id = request.args.get('courier_id')
            status = request.args.get('status')
            
            query = CourierDocument.query
            if courier_id:
                query = query.filter_by(courier_id=courier_id)
            if status:
                query = query.filter_by(status=status)
            
            docs = query.all()
        else:
            return jsonify({'error': 'Unauthorized'}), 403
        
        result = []
        for doc in docs:
            result.append({
                'id': doc.id,
                'courier_id': doc.courier_id,
                'document_type': doc.document_type,
                'status': doc.status,
                'expiry_date': doc.expiry_date.strftime('%Y-%m-%d') if doc.expiry_date else None,
                'uploaded_at': doc.uploaded_at.strftime('%Y-%m-%d %H:%M'),
                'reviewed_at': doc.reviewed_at.strftime('%Y-%m-%d %H:%M') if doc.reviewed_at else None,
                'is_expired': doc.expiry_date < datetime.now().date() if doc.expiry_date else False
            })
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@freelance_bp.route('/documents/<int:doc_id>/verify', methods=['PUT'])
@token_required
@role_required(['admin'])
def verify_document(current_user, doc_id):
    """
    Approve or reject a courier document
    """
    try:
        doc = CourierDocument.query.get_or_404(doc_id)
        data = request.get_json()
        
        new_status = data.get('status')  # 'approved' or 'rejected'
        
        if new_status not in ['approved', 'rejected']:
            return jsonify({'error': 'Invalid status'}), 400
        
        doc.status = new_status
        doc.reviewed_at = datetime.utcnow()
        doc.reviewed_by = current_user.id
        
        db.session.commit()
        return jsonify({'message': f'Document {new_status}'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@freelance_bp.route('/documents/<int:doc_id>/file', methods=['GET'])
@token_required
def get_document_file(current_user, doc_id):
    """
    Download/view document file
    """
    try:
        doc = CourierDocument.query.get_or_404(doc_id)
        
        # Access control
        if current_user.user_type == 'courier' and doc.courier_id != current_user.courier.id:
            return jsonify({'error': 'Unauthorized'}), 403
        
        if not os.path.exists(doc.file_path):
            return jsonify({'error': 'File not found'}), 404
        
        return send_file(doc.file_path)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@freelance_bp.route('/payouts/calculate', methods=['POST'])
@token_required
def calculate_payout(current_user):
    """
    Calculate payout for a courier for a given period
    """
    try:
        data = request.get_json()
        courier_id = data.get('courier_id') or (current_user.courier.id if current_user.user_type == 'courier' else None)
        period_start = datetime.strptime(data.get('period_start'), '%Y-%m-%d').date()
        period_end = datetime.strptime(data.get('period_end'), '%Y-%m-%d').date()
        
        if not courier_id:
            return jsonify({'error': 'Courier ID required'}), 400
        
        # Access control
        if current_user.user_type == 'courier' and courier_id != current_user.courier.id:
            return jsonify({'error': 'Unauthorized'}), 403
        
        # Get all delivered orders in period
        deliveries = Delivery.query.filter(
            and_(
                Delivery.courier_id == courier_id,
                Delivery.status == 'delivered',
                Delivery.delivered_at >= period_start,
                Delivery.delivered_at <= period_end
            )
        ).all()
        
        total_deliveries = len(deliveries)
        total_amount = sum(d.delivery_fee for d in deliveries if d.delivery_fee)
        
        return jsonify({
            'courier_id': courier_id,
            'period_start': period_start.strftime('%Y-%m-%d'),
            'period_end': period_end.strftime('%Y-%m-%d'),
            'total_deliveries': total_deliveries,
            'total_amount': float(total_amount)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@freelance_bp.route('/payouts', methods=['POST'])
@token_required
@role_required(['admin'])
def create_payout(current_user):
    """
    Generate a payout record (admin only)
    """
    try:
        data = request.get_json()
        
        payout = Payout(
            courier_id=data.get('courier_id'),
            period_start=datetime.strptime(data.get('period_start'), '%Y-%m-%d').date(),
            period_end=datetime.strptime(data.get('period_end'), '%Y-%m-%d').date(),
            total_deliveries=data.get('total_deliveries'),
            total_amount=data.get('total_amount'),
            status='draft'
        )
        
        db.session.add(payout)
        db.session.commit()
        
        return jsonify({'message': 'Payout created', 'id': payout.id}), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@freelance_bp.route('/payouts', methods=['GET'])
@token_required
def get_payouts(current_user):
    """
    Get payouts for courier or all payouts for admin
    """
    try:
        if current_user.user_type == 'courier':
            payouts = Payout.query.filter_by(courier_id=current_user.courier.id).all()
        elif current_user.user_type == 'admin':
            courier_id = request.args.get('courier_id')
            query = Payout.query
            if courier_id:
                query = query.filter_by(courier_id=courier_id)
            payouts = query.all()
        else:
            return jsonify({'error': 'Unauthorized'}), 403
        
        result = []
        for p in payouts:
            result.append({
                'id': p.id,
                'courier_id': p.courier_id,
                'period_start': p.period_start.strftime('%Y-%m-%d'),
                'period_end': p.period_end.strftime('%Y-%m-%d'),
                'total_deliveries': p.total_deliveries,
                'total_amount': float(p.total_amount),
                'status': p.status,
                'invoice_number': p.invoice_number,
                'created_at': p.created_at.strftime('%Y-%m-%d')
            })
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@freelance_bp.route('/payouts/<int:payout_id>/approve', methods=['PUT'])
@token_required
@role_required(['admin'])
def approve_payout(current_user, payout_id):
    """
    Approve a payout
    """
    try:
        payout = Payout.query.get_or_404(payout_id)
        
        if payout.status == 'approved':
             return jsonify({'error': 'Payout already approved'}), 400

        # Generate Self-Billing Invoice Number
        # Format: SB-{COURIER_ID}-{YYYYMMDD}-{RANDOM}
        import uuid
        if not payout.invoice_number:
            payout.invoice_number = f"SB-{payout.courier_id}-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:4].upper()}"
        
        payout.status = 'approved'
        payout.approved_at = datetime.utcnow()
        
        db.session.commit()
        
        # AUDIT LOG
        from utils.audit import log_audit
        log_audit(
            action='APPROVE_PAYOUT_SELF_BILLING',
            user_id=current_user.id,
            resource_type='Payout',
            resource_id=payout.id,
            details=f"Approved payout {payout.id} and generated self-billing invoice {payout.invoice_number}",
            status='SUCCESS'
        )
        
        return jsonify({
            'message': 'Payout approved and Invoice generated',
            'invoice_number': payout.invoice_number
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
from utils.pdf_generator import generate_earnings_report
import tempfile

@freelance_bp.route('/earnings/report', methods=['GET'])
@token_required
def get_earnings_report(current_user):
    """
    Generate and download a PDF earnings report
    """
    try:
        if current_user.user_type != 'courier':
             return jsonify({'error': 'Unauthorized'}), 403
             
        year = int(request.args.get('year', datetime.now().year))
        month = int(request.args.get('month', datetime.now().month))
        
        start_date = datetime(year, month, 1)
        if month == 12:
            end_date = datetime(year + 1, 1, 1) - timedelta(days=1)
        else:
            end_date = datetime(year, month + 1, 1) - timedelta(days=1)
            
        deliveries = Delivery.query.filter(
            and_(
                Delivery.courier_id == current_user.courier.id,
                Delivery.status == 'delivered',
                Delivery.delivered_at >= start_date,
                Delivery.delivered_at <= end_date
            )
        ).all()
        
        total_amount = sum(d.delivery_fee for d in deliveries if d.delivery_fee)
        
        # Create temporary file
        temp = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
        generate_earnings_report(
            courier_name=current_user.courier.full_name,
            period=f"{month:02d}/{year}",
            deliveries=deliveries,
            total_amount=total_amount,
            output_path=temp.name
        )
        
        return send_file(
            temp.name,
            as_attachment=True,
            download_name=f"Earnings_{year}_{month:02d}.pdf"
        )
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
