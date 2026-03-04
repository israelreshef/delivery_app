import traceback
from app import create_app
from extensions import db
from models import Delivery, Invoice, Payment, Expense, CustomerFile, CustomerNote, CustomerTask, AuditLog, User
app = create_app()
with app.app_context():
    try:
        customer_id = 9
        
        deliveries = Delivery.query.filter_by(customer_id=customer_id).order_by(Delivery.created_at.desc()).limit(50).all()
        invoices = Invoice.query.filter_by(customer_id=customer_id).order_by(Invoice.issue_date.desc()).limit(50).all()
        payments = db.session.query(Payment, Invoice).join(Invoice, Payment.invoice_id == Invoice.id).filter(Invoice.customer_id == customer_id).order_by(Payment.payment_date.desc()).limit(50).all()
        expenses = Expense.query.filter(Expense.customer_id == customer_id).order_by(Expense.expense_date.desc()).limit(50).all()
        files = CustomerFile.query.filter_by(customer_id=customer_id).order_by(CustomerFile.created_at.desc()).limit(100).all()
        notes = CustomerNote.query.filter_by(customer_id=customer_id).order_by(CustomerNote.created_at.desc()).limit(50).all()
        tasks = CustomerTask.query.filter_by(customer_id=customer_id).order_by(CustomerTask.status.asc(), CustomerTask.due_date.asc()).limit(50).all()

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
                'expense_date': e.expense_date.isoformat() if hasattr(e.expense_date, 'isoformat') else e.expense_date,
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
                'due_date': t.due_date.isoformat() if hasattr(t.due_date, 'isoformat') else t.due_date,
                'priority': t.priority,
                'status': t.status,
                'created_at': t.created_at.isoformat() if hasattr(t.created_at, 'isoformat') else t.created_at,
                'completed_at': t.completed_at.isoformat() if hasattr(t.completed_at, 'isoformat') and t.completed_at else t.completed_at
            })

        audits = AuditLog.query.filter_by(resource_type='Customer', resource_id=str(customer_id)).order_by(AuditLog.timestamp.desc()).all()
        audits_data = []
        for a in audits:
            actor = User.query.get(a.user_id) if a.user_id else None
            audits_data.append({
                'id': a.id,
                'action': a.action,
                'status': a.status,
                'details': a.details,
                'timestamp': a.timestamp.isoformat() if hasattr(a.timestamp, 'isoformat') else a.timestamp,
                'user_name': actor.username if actor else 'מערכת'
            })
            
        print('All loops succeeded')
        
    except Exception as e:
        with open('trace.log', 'w', encoding='utf-8') as f:
            f.write(traceback.format_exc())
