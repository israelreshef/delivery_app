from flask import Blueprint, request, jsonify
from models import db, Customer, User, Delivery, Invoice, Payment, CustomerContactLog, CustomerFile, Expense, CustomerNote, CustomerTask
import logging
from utils.decorators import token_required, role_required
from sqlalchemy.orm import joinedload
from datetime import datetime
from werkzeug.utils import secure_filename
import os
import uuid

customers_bp = Blueprint('customers', __name__)
CUSTOMER_FILES_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'files', 'customer_files')
os.makedirs(CUSTOMER_FILES_DIR, exist_ok=True)

@customers_bp.route('', methods=['GET'])
@token_required
@role_required('admin')
def get_customers(current_user):
    """קבלת כל הלקוחות"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        
        query = Customer.query.options(joinedload(Customer.user))
        
        paginated_data = query.paginate(page=page, per_page=per_page, error_out=False)
        customers = paginated_data.items
        
        result = []
        for c in customers:
            last_order = Delivery.query.filter_by(customer_id=c.id).order_by(Delivery.created_at.desc()).first()
            last_payment = db.session.query(Payment).join(Invoice).filter(Invoice.customer_id == c.id).order_by(Payment.payment_date.desc()).first()
            result.append({
                'id': c.id,
                'user_id': c.user_id,
                'full_name': c.full_name,
                'email': c.user.email if c.user else '',
                'phone': (c.user.phone if c.user else None) or c.phone or '',
                'company_name': c.company_name,
                'business_id': c.business_id, # H.P.
                'tax_id': c.tax_id,
                'customer_type': c.customer_type,
                'vat_status': c.vat_status,
                'payment_terms': c.payment_terms,
                'billing_address': c.billing_address,
                'default_address': c.default_address,
                'contact_person': c.contact_person,
                'balance': float(c.balance or 0.0),
                'credit_limit': float(c.credit_limit or 0.0),
                'total_orders': c.total_orders or 0,
                'rating': float(c.rating or 5.0),
                'is_active': c.user.is_active if c.user else False,
                'two_factor_enforced_by_admin': c.user.two_factor_enforced_by_admin if c.user else False,
                'has_account': bool(c.user_id),
                'created_at': c.created_at.isoformat() if c.created_at else None,
                'last_order_at': last_order.created_at.isoformat() if last_order and last_order.created_at else None,
                'last_payment_at': last_payment.payment_date.isoformat() if last_payment and last_payment.payment_date else None
            })
        
        return jsonify({
            'data': result,
            'total': paginated_data.total,
            'pages': paginated_data.pages,
            'current_page': page,
            'per_page': per_page
        }), 200
        
    except Exception as e:
        logging.error(f"Error fetching customers: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@customers_bp.route('', methods=['POST'])
@token_required
@role_required('admin')
def create_customer(current_user):
    """יצירת לקוח עסקי/פרטי חדש"""
    try:
        data = request.json
        
        user = None

        username = data.get('username')
        password = data.get('password')

        if username and password:
            existing_user = User.query.filter_by(username=username).first()
            if existing_user:
                return jsonify({'error': 'Username already exists'}), 400

            # Create User
            user = User(
                username=username,
                email=data.get('email', f"{username}@customer.com"),
                phone=data.get('phone', ''),
                user_type='customer'
            )
            user.set_password(password)
            db.session.add(user)
            db.session.flush()
        elif not data.get('full_name'):
            return jsonify({'error': 'Full name is required when no account is created'}), 400
        
        # Create Customer Profile
        customer = Customer(
            user_id=user.id if user else None,
            full_name=data.get('full_name', username or ''),
            company_name=data.get('company_name'),
            business_id=data.get('business_id'),
            tax_id=data.get('tax_id'),
            customer_type=data.get('customer_type', 'private'),
            vat_status=data.get('vat_status', 'authorized_dealer'),
            payment_terms=data.get('payment_terms', 'net_30'),
            contact_person=data.get('contact_person'),
            billing_address=data.get('billing_address'),
            default_address=data.get('default_address'),
            credit_limit=data.get('credit_limit', 0.0),
            phone=data.get('phone') if not user else None,  # store phone directly when no account
            balance=0.0
        )
        db.session.add(customer)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'id': customer.id,
            'message': 'Customer created successfully'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error creating customer: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500



@customers_bp.route('/<int:customer_id>', methods=['GET'])
@token_required
@role_required('admin')
def get_customer(current_user, customer_id):
    """קבלת פרטי לקוח בודד"""
    try:
        import json
        customer = Customer.query.get_or_404(customer_id)
        last_order = Delivery.query.filter_by(customer_id=customer.id).order_by(Delivery.created_at.desc()).first()
        
        # Calculate total_spent from all deliveries
        total_spent = db.session.query(db.func.sum(Delivery.delivery_fee)).filter_by(customer_id=customer.id).scalar() or 0.0
        
        # Parse tags from JSON text field
        try:
            tags = json.loads(customer.tags) if customer.tags else []
        except Exception:
            tags = []
        
        return jsonify({
            'id': customer.id,
            'user_id': customer.user_id,
            'full_name': customer.full_name,
            'email': customer.user.email if customer.user else '',
            'phone': (customer.user.phone if customer.user else None) or customer.phone or '',
            'company_name': customer.company_name,
            'business_id': customer.business_id,
            'tax_id': customer.tax_id,
            'customer_type': customer.customer_type,
            'vat_status': customer.vat_status,
            'payment_terms': customer.payment_terms,
            'billing_address': customer.billing_address,
            'default_address': customer.default_address,
            'contact_person': customer.contact_person,
            'balance': float(customer.balance or 0.0),
            'credit_limit': float(customer.credit_limit or 0.0),
            'total_orders': customer.total_orders or 0,
            'total_spent': float(total_spent),
            'rating': float(customer.rating or 5.0),
            'is_active': customer.user.is_active if customer.user else False,
            'has_account': bool(customer.user_id),
            'created_at': customer.created_at.isoformat() if customer.created_at else None,
            'last_order_at': last_order.created_at.isoformat() if last_order and last_order.created_at else None,
            'website': customer.website,
            'lead_source': customer.lead_source,
            'tags': tags,
        }), 200
    except Exception as e:
        logging.error(f"Error fetching customer {customer_id}: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@customers_bp.route('/<int:customer_id>', methods=['PUT'])
@token_required
@role_required('admin')
def update_customer(current_user, customer_id):

    """עדכון פרטי לקוח"""
    try:
        customer = Customer.query.get_or_404(customer_id)
        data = request.json
        
        if 'full_name' in data:
            customer.full_name = data['full_name']
        if 'company_name' in data:
            customer.company_name = data['company_name']
        if 'business_id' in data:
            customer.business_id = data['business_id']
        if 'contact_person' in data:
            customer.contact_person = data['contact_person']
        if 'tax_id' in data:
            customer.tax_id = data['tax_id']
        if 'customer_type' in data:
            customer.customer_type = data['customer_type']
        if 'vat_status' in data:
            customer.vat_status = data['vat_status']
        if 'payment_terms' in data:
            customer.payment_terms = data['payment_terms']
        if 'credit_limit' in data:
            customer.credit_limit = data['credit_limit']
        if 'billing_address' in data:
            customer.billing_address = data['billing_address']
        if 'default_address' in data:
            customer.default_address = data['default_address']
        if 'website' in data:
            customer.website = data['website']
        if 'lead_source' in data:
            customer.lead_source = data['lead_source']
        if 'tags' in data:
            import json as _json
            customer.tags = _json.dumps(data['tags']) if isinstance(data['tags'], list) else data['tags']

        # Update User fields if needed
        if customer.user:
            if 'phone' in data:
                customer.user.phone = data['phone']
            if 'email' in data:
                customer.user.email = data['email']
                
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Customer updated'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@customers_bp.route('/<int:customer_id>/account', methods=['POST'])
@token_required
@role_required('admin')
def create_customer_account(current_user, customer_id):
    """Create a login account for an existing customer (optional)."""
    try:
        customer = Customer.query.get_or_404(customer_id)
        if customer.user_id:
            return jsonify({'error': 'Customer already has an account'}), 400

        data = request.json
        username = data.get('username')
        password = data.get('password')
        email = data.get('email')
        phone = data.get('phone')

        if not username or not password:
            return jsonify({'error': 'Username and password are required'}), 400

        existing_user = User.query.filter_by(username=username).first()
        if existing_user:
            return jsonify({'error': 'Username already exists'}), 400

        user = User(
            username=username,
            email=email or f"{username}@customer.com",
            phone=phone or '',
            user_type='customer'
        )
        user.set_password(password)
        db.session.add(user)
        db.session.flush()

        customer.user_id = user.id
        db.session.commit()

        return jsonify({'success': True, 'user_id': user.id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@customers_bp.route('/<int:customer_id>/contacts', methods=['GET'])
@token_required
@role_required('admin')
def list_customer_contacts(current_user, customer_id):
    try:
        logs = CustomerContactLog.query.filter_by(customer_id=customer_id).order_by(CustomerContactLog.contact_date.desc()).all()
        result = []
        for l in logs:
            user = User.query.get(l.created_by) if l.created_by else None
            result.append({
                'id': l.id,
                'contact_type': l.contact_type,
                'summary': l.summary,
                'outcome': l.outcome,
                'contact_date': l.contact_date.isoformat() if l.contact_date else None,
                'next_follow_up': l.next_follow_up.isoformat() if l.next_follow_up else None,
                'created_by': l.created_by,
                'created_by_name': user.username if user else None
            })
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@customers_bp.route('/<int:customer_id>/contacts', methods=['POST'])
@token_required
@role_required('admin')
def create_customer_contact(current_user, customer_id):
    try:
        data = request.json or {}
        summary = data.get('summary')
        if not summary:
            return jsonify({'error': 'Summary is required'}), 400

        contact_date_str = data.get('contact_date')
        next_follow_up_str = data.get('next_follow_up')
        contact_date = datetime.strptime(contact_date_str, '%Y-%m-%d').date() if contact_date_str else datetime.utcnow().date()
        next_follow_up = datetime.strptime(next_follow_up_str, '%Y-%m-%d').date() if next_follow_up_str else None

        log = CustomerContactLog(
            customer_id=customer_id,
            contact_type=data.get('contact_type', 'call'),
            summary=summary,
            outcome=data.get('outcome'),
            contact_date=datetime.combine(contact_date, datetime.min.time()),
            next_follow_up=next_follow_up,
            created_by=current_user.id
        )
        db.session.add(log)
        db.session.commit()

        return jsonify({'success': True, 'id': log.id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@customers_bp.route('/<int:customer_id>/related', methods=['GET'])
@token_required
@role_required('admin')
def get_customer_related(current_user, customer_id):
    try:
        deliveries = Delivery.query.filter_by(customer_id=customer_id).order_by(Delivery.created_at.desc()).limit(50).all()
        invoices = Invoice.query.filter_by(customer_id=customer_id).order_by(Invoice.issue_date.desc()).limit(50).all()
        payments = db.session.query(Payment, Invoice).join(Invoice, Payment.invoice_id == Invoice.id).filter(Invoice.customer_id == customer_id).order_by(Payment.payment_date.desc()).limit(50).all()
        expenses = Expense.query.filter(Expense.customer_id == customer_id).order_by(Expense.expense_date.desc()).limit(50).all()
        files = CustomerFile.query.filter_by(customer_id=customer_id).order_by(CustomerFile.created_at.desc()).limit(100).all()
        notes = CustomerNote.query.filter_by(customer_id=customer_id).order_by(CustomerNote.created_at.desc()).limit(50).all()
        tasks = CustomerTask.query.filter_by(customer_id=customer_id).order_by(
            CustomerTask.status.asc(),
            CustomerTask.due_date.asc()
        ).limit(50).all()

        deliveries_data = []
        for d in deliveries:
            deliveries_data.append({
                'id': d.id,
                'order_number': d.order_number,
                'status': d.status,
                'created_at': d.created_at.isoformat() if d.created_at else None,
                'delivery_fee': float(d.delivery_fee or 0),
                'delivery_type': d.delivery_type,
                'tracking_number': d.tracking_number,
                'pod_image_path': d.pod_image_path,
                'pod_signature_path': d.pod_signature_path
            })

        invoices_data = []
        for inv in invoices:
            invoices_data.append({
                'id': inv.id,
                'invoice_number': inv.invoice_number,
                'document_type': inv.document_type,
                'status': inv.status,
                'issue_date': inv.issue_date.isoformat() if inv.issue_date else None,
                'due_date': inv.due_date.isoformat() if inv.due_date else None,
                'paid_at': inv.paid_at.isoformat() if inv.paid_at else None,
                'total_amount': float(inv.total_amount or 0)
            })

        payments_data = []
        for p, inv in payments:
            payments_data.append({
                'id': p.id,
                'invoice_number': inv.invoice_number if inv else None,
                'amount': float(p.amount or 0),
                'payment_method': p.payment_method,
                'status': p.status,
                'payment_date': p.payment_date.isoformat() if p.payment_date else None
            })

        expenses_data = []
        for e in expenses:
            expenses_data.append({
                'id': e.id,
                'description': e.description,
                'amount': float(e.total_amount or 0),
                'expense_date': e.expense_date.isoformat() if e.expense_date else None,
                'receipt_url': e.receipt_url,
                'category': e.category
            })

        files_data = []
        for f in files:
            files_data.append({
                'id': f.id,
                'title': f.title,
                'description': f.description,
                'file_type': f.file_type,
                'category': f.category,
                'status': f.status,
                'archived': f.archived,
                'file_name': f.file_name,
                'url': f'/api/customers/{customer_id}/files/{f.id}/download',
                'created_at': f.created_at.isoformat() if f.created_at else None
            })

        notes_data = []
        for n in notes:
            author = User.query.get(n.created_by) if n.created_by else None
            notes_data.append({
                'id': n.id,
                'content': n.content,
                'created_by': n.created_by,
                'created_by_name': author.username if author else 'מערכת',
                'created_at': n.created_at.isoformat() if n.created_at else None
            })

        tasks_data = []
        for t in tasks:
            tasks_data.append({
                'id': t.id,
                'title': t.title,
                'description': t.description,
                'due_date': t.due_date.isoformat() if t.due_date else None,
                'priority': t.priority,
                'status': t.status,
                'created_at': t.created_at.isoformat() if t.created_at else None,
                'completed_at': t.completed_at.isoformat() if t.completed_at else None
            })

        from models import AuditLog
        audits = AuditLog.query.filter_by(resource_type='Customer', resource_id=str(customer_id)).order_by(AuditLog.timestamp.desc()).all()
        audits_data = []
        for a in audits:
            actor = User.query.get(a.user_id) if a.user_id else None
            audits_data.append({
                'id': a.id,
                'action': a.action,
                'status': a.status,
                'details': a.details,
                'timestamp': a.timestamp.isoformat() if a.timestamp else None,
                'user_name': actor.username if actor else 'מערכת'
            })

        return jsonify({
            'deliveries': deliveries_data,
            'invoices': invoices_data,
            'payments': payments_data,
            'expenses': expenses_data,
            'files': files_data,
            'notes': notes_data,
            'tasks': tasks_data,
            'audit_logs': audits_data
        }), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
@customers_bp.route('/<int:customer_id>/files', methods=['GET'])
@token_required
@role_required('admin')
def list_customer_files(current_user, customer_id):
    try:
        files = CustomerFile.query.filter_by(customer_id=customer_id).order_by(CustomerFile.created_at.desc()).all()
        return jsonify([{
            'id': f.id,
            'title': f.title,
            'description': f.description,
            'file_type': f.file_type,
            'category': f.category,
            'status': f.status,
            'archived': f.archived,
            'file_name': f.file_name,
            'created_at': f.created_at.isoformat() if f.created_at else None
        } for f in files]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@customers_bp.route('/<int:customer_id>/files', methods=['POST'])
@token_required
@role_required('admin')
def upload_customer_file(current_user, customer_id):
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        files = request.files.getlist('file')
        if not files:
            return jsonify({'error': 'No files provided'}), 400

        title = request.form.get('title')
        description = request.form.get('description')
        file_type = request.form.get('file_type', 'other')
        category = request.form.get('category')
        status = request.form.get('status', 'active')
        archived = request.form.get('archived', 'false').lower() == 'true'

        created_ids = []
        for file in files:
            if not file or file.filename == '':
                continue
            ext = os.path.splitext(file.filename)[1].lower()
            safe_name = secure_filename(os.path.splitext(file.filename)[0])
            stored_name = f"{customer_id}_{safe_name}_{uuid.uuid4().hex[:8]}{ext}"
            file_path = os.path.join(CUSTOMER_FILES_DIR, stored_name)
            file.save(file_path)

            doc = CustomerFile(
                customer_id=customer_id,
                title=title or file.filename,
                description=description,
                file_type=file_type,
                category=category,
                status=status,
                archived=archived,
                file_name=stored_name,
                file_path=file_path,
                mime_type=file.mimetype,
                file_size=os.path.getsize(file_path),
                created_by=current_user.id
            )
            db.session.add(doc)
            db.session.flush()
            created_ids.append(doc.id)
        db.session.commit()

        return jsonify({'success': True, 'ids': created_ids}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@customers_bp.route('/<int:customer_id>/files/<int:file_id>', methods=['PUT'])
@token_required
@role_required('admin')
def update_customer_file(current_user, customer_id, file_id):
    try:
        doc = CustomerFile.query.filter_by(id=file_id, customer_id=customer_id).first_or_404()
        data = request.json or {}
        for key in ['title', 'description', 'file_type', 'category', 'status', 'archived']:
            if key in data:
                setattr(doc, key, data[key])
        db.session.commit()
        return jsonify({'success': True}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@customers_bp.route('/<int:customer_id>/files/<int:file_id>/download', methods=['GET'])
@token_required
@role_required('admin')
def download_customer_file(current_user, customer_id, file_id):
    try:
        doc = CustomerFile.query.filter_by(id=file_id, customer_id=customer_id).first_or_404()
        from flask import send_from_directory
        return send_from_directory(CUSTOMER_FILES_DIR, doc.file_name, as_attachment=True)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@customers_bp.route('/<int:customer_id>/notes', methods=['POST'])
@token_required
@role_required('admin')
def add_customer_note(current_user, customer_id):
    try:
        data = request.json
        if not data or not data.get('content'):
            return jsonify({'error': 'Content is required'}), 400

        note = CustomerNote(
            customer_id=customer_id,
            content=data['content'],
            created_by=current_user.id
        )
        db.session.add(note)
        db.session.commit()

        return jsonify({'success': True, 'id': note.id, 'message': 'Note added successfully'}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
