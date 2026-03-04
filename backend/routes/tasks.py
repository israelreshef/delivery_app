from flask import Blueprint, request, jsonify
from models import db, CustomerTask, User, Customer
from utils.decorators import token_required, role_required
from datetime import datetime
import logging

tasks_bp = Blueprint('tasks', __name__)

@tasks_bp.route('', methods=['GET'])
@token_required
@role_required('admin')
def get_tasks(current_user):
    """קבלת כל המשימות - Global Tasks"""
    try:
        status_filter = request.args.get('status')
        priority_filter = request.args.get('priority')
        customer_id = request.args.get('customer_id')

        query = CustomerTask.query
        
        if status_filter:
            query = query.filter_by(status=status_filter)
        if priority_filter:
            query = query.filter_by(priority=priority_filter)
        if customer_id:
            query = query.filter_by(customer_id=customer_id)
            
        tasks = query.order_by(
            # Order priority: high -> medium -> low, then by due date
            db.case(
                (CustomerTask.priority == 'high', 1),
                (CustomerTask.priority == 'medium', 2),
                (CustomerTask.priority == 'low', 3),
                else_=4
            ),
            CustomerTask.due_date.asc().nullslast()
        ).all()
        
        result = []
        for t in tasks:
            assigned_user = User.query.get(t.assigned_to) if t.assigned_to else None
            customer = Customer.query.get(t.customer_id) if t.customer_id else None
            
            result.append({
                'id': t.id,
                'customer_id': t.customer_id,
                'customer_name': customer.full_name if customer else None,
                'title': t.title,
                'description': t.description,
                'due_date': t.due_date.isoformat() if t.due_date else None,
                'priority': t.priority,
                'status': t.status,
                'assigned_to': t.assigned_to,
                'assigned_to_name': assigned_user.username if assigned_user else None,
                'created_at': t.created_at.isoformat() if t.created_at else None,
                'completed_at': t.completed_at.isoformat() if t.completed_at else None
            })
            
        return jsonify(result), 200

    except Exception as e:
        logging.error(f"Error fetching tasks: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

@tasks_bp.route('', methods=['POST'])
@token_required
@role_required('admin')
def create_task(current_user):
    """יצירת משימה חדשה"""
    try:
        data = request.json
        if not data.get('title'):
            return jsonify({'error': 'Title is required'}), 400
            
        due_date = None
        if data.get('due_date'):
            try:
                # Support both ISO format and YYYY-MM-DD
                if 'T' in data['due_date']:
                    due_date = datetime.fromisoformat(data['due_date'].replace('Z', '+00:00'))
                else:
                    due_date = datetime.strptime(data['due_date'], '%Y-%m-%d')
            except ValueError:
                pass

        task = CustomerTask(
            customer_id=data.get('customer_id'),
            title=data['title'],
            description=data.get('description'),
            due_date=due_date,
            priority=data.get('priority', 'medium'),
            status=data.get('status', 'open'),
            assigned_to=data.get('assigned_to', current_user.id),
            created_by=current_user.id
        )
        
        db.session.add(task)
        db.session.commit()
        
        return jsonify({'success': True, 'id': task.id, 'message': 'Task created'}), 201
        
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error creating task: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

@tasks_bp.route('/<int:task_id>', methods=['PATCH', 'PUT'])
@token_required
@role_required('admin')
def update_task(current_user, task_id):
    """עדכון משימה (כולל שינוי סטטוס)"""
    try:
        task = CustomerTask.query.get_or_404(task_id)
        data = request.json
        
        if 'title' in data:
            task.title = data['title']
        if 'description' in data:
            task.description = data['description']
        if 'priority' in data:
            task.priority = data['priority']
        if 'assigned_to' in data:
            task.assigned_to = data['assigned_to']
            
        if 'status' in data:
            old_status = task.status
            task.status = data['status']
            if data['status'] == 'completed' and old_status != 'completed':
                task.completed_at = datetime.utcnow()
            elif data['status'] != 'completed':
                task.completed_at = None
                
        if 'due_date' in data:
            if not data['due_date']:
                task.due_date = None
            else:
                try:
                    if 'T' in data['due_date']:
                        task.due_date = datetime.fromisoformat(data['due_date'].replace('Z', '+00:00'))
                    else:
                        task.due_date = datetime.strptime(data['due_date'], '%Y-%m-%d')
                except ValueError:
                    pass
                    
        db.session.commit()
        return jsonify({'success': True, 'message': 'Task updated'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@tasks_bp.route('/<int:task_id>', methods=['DELETE'])
@token_required
@role_required('admin')
def delete_task(current_user, task_id):
    """מחיקת משימה"""
    try:
        task = CustomerTask.query.get_or_404(task_id)
        db.session.delete(task)
        db.session.commit()
        return jsonify({'success': True, 'message': 'Task deleted'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
