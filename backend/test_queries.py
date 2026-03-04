from app import create_app
from extensions import db
from models import Delivery, Invoice, Payment, Expense, CustomerFile, CustomerNote, CustomerTask, AuditLog, User

app = create_app()
with app.app_context():
    customer_id = 3
    print("Testing Delivery...")
    try: Delivery.query.filter_by(customer_id=customer_id).order_by(Delivery.created_at.desc()).limit(50).all()
    except Exception as e: print("Fail Delivery:", e)
    
    print("Testing Invoice...")
    try: Invoice.query.filter_by(customer_id=customer_id).order_by(Invoice.issue_date.desc()).limit(50).all()
    except Exception as e: print("Fail Invoice:", e)
    
    print("Testing Payment...")
    try: db.session.query(Payment, Invoice).join(Invoice, Payment.invoice_id == Invoice.id).filter(Invoice.customer_id == customer_id).order_by(Payment.payment_date.desc()).limit(50).all()
    except Exception as e: print("Fail Payment:", e)
    
    print("Testing Expense...")
    try: Expense.query.filter_by(customer_id=customer_id).order_by(Expense.expense_date.desc()).limit(50).all()
    except Exception as e: print("Fail Expense:", e)
    
    print("Testing CustomerFile...")
    try: CustomerFile.query.filter_by(customer_id=customer_id).order_by(CustomerFile.created_at.desc()).limit(100).all()
    except Exception as e: print("Fail CustomerFile:", e)
    
    print("Testing CustomerNote...")
    try: CustomerNote.query.filter_by(customer_id=customer_id).order_by(CustomerNote.created_at.desc()).limit(50).all()
    except Exception as e: print("Fail CustomerNote:", e)
    
    print("Testing CustomerTask...")
    try: CustomerTask.query.filter_by(customer_id=customer_id).order_by(CustomerTask.status.asc(), CustomerTask.due_date.asc()).limit(50).all()
    except Exception as e: print("Fail CustomerTask:", e)
    
    print("Testing AuditLog...")
    try: AuditLog.query.filter_by(resource_type='Customer', resource_id=str(customer_id)).order_by(AuditLog.timestamp.desc()).all()
    except Exception as e: print("Fail AuditLog:", e)
    
    print("Done")
