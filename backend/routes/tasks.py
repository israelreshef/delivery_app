from flask import Blueprint, request, jsonify
from models import db, CustomerTask, User, Customer, AuditLog, Notification
from utils.decorators import token_required, role_required, permission_required
from datetime import datetime
import logging
import re
from pathlib import Path
from extensions import socketio
from services.notifications import send_push_notification

tasks_bp = Blueprint('tasks', __name__)

REQ_TAG_PATTERN = re.compile(r'^\s*-\s*\[(?P<checked>[ xX])\]\s*\[(?P<req>REQ-[A-Za-z0-9_-]+)\]\s*(?P<title>.+?)\s*$')
CHECKLIST_PATTERN = re.compile(r'^\s*-\s*\[(?P<checked>[ xX])\]\s*(?P<title>.+?)\s*$')


def _parse_due_date(value):
    if not value:
        return None
    try:
        if 'T' in value:
            return datetime.fromisoformat(value.replace('Z', '+00:00'))
        return datetime.strptime(value, '%Y-%m-%d')
    except ValueError:
        return None


def _parse_requirement_items(text, include_checked=False, auto_prefix='AUTO'):
    items = []
    auto_counter = 0

    for line_no, raw_line in enumerate(text.splitlines(), start=1):
        tagged = REQ_TAG_PATTERN.match(raw_line)
        if tagged:
            checked = tagged.group('checked').lower() == 'x'
            if include_checked or not checked:
                items.append({
                    'source_id': tagged.group('req'),
                    'title': tagged.group('title').strip(),
                    'checked': checked,
                    'line_no': line_no
                })
            continue

        plain = CHECKLIST_PATTERN.match(raw_line)
        if plain:
            checked = plain.group('checked').lower() == 'x'
            if include_checked or not checked:
                auto_counter += 1
                items.append({
                    'source_id': f'REQ-{auto_prefix}-{auto_counter:04d}',
                    'title': plain.group('title').strip(),
                    'checked': checked,
                    'line_no': line_no
                })

    return items

@tasks_bp.route('', methods=['GET'])
@token_required
@role_required(['admin', 'courier', 'customer'])
@permission_required('tasks:view')
def get_tasks(current_user):
    """קבלת כל המשימות - Global Tasks"""
    try:
        status_filter = request.args.get('status')
        priority_filter = request.args.get('priority')
        customer_id = request.args.get('customer_id')
        source_filter = request.args.get('source')
        assigned_to_filter = request.args.get('assigned_to')

        query = CustomerTask.query

        if current_user.user_type == 'courier':
            query = query.filter_by(assigned_to=current_user.id)
        elif current_user.user_type == 'customer':
            customer = Customer.query.filter_by(user_id=current_user.id).first()
            if not customer:
                return jsonify([]), 200
            query = query.filter_by(customer_id=customer.id)

        if status_filter:
            query = query.filter_by(status=status_filter)
        if priority_filter:
            query = query.filter_by(priority=priority_filter)
        if customer_id:
            query = query.filter_by(customer_id=customer_id)
        if source_filter:
            query = query.filter_by(source=source_filter)
        if assigned_to_filter:
            if assigned_to_filter == 'me':
                query = query.filter_by(assigned_to=current_user.id)
            else:
                query = query.filter_by(assigned_to=assigned_to_filter)
            
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
                'completed_at': t.completed_at.isoformat() if t.completed_at else None,
                'source': t.source,
                'source_id': t.source_id
            })
            
        return jsonify(result), 200

    except Exception as e:
        logging.error(f"Error fetching tasks: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@tasks_bp.route('/<int:task_id>', methods=['GET'])
@token_required
@role_required(['admin', 'courier', 'customer'])
@permission_required('tasks:view')
def get_task_by_id(current_user, task_id):
    try:
        task = CustomerTask.query.get_or_404(task_id)

        # Role-based item visibility
        if current_user.user_type == 'courier' and task.assigned_to != current_user.id:
            return jsonify({'error': 'Unauthorized'}), 403

        if current_user.user_type == 'customer':
            customer = Customer.query.filter_by(user_id=current_user.id).first()
            if not customer or task.customer_id != customer.id:
                return jsonify({'error': 'Unauthorized'}), 403

        assigned_user = User.query.get(task.assigned_to) if task.assigned_to else None
        customer = Customer.query.get(task.customer_id) if task.customer_id else None

        return jsonify({
            'id': task.id,
            'customer_id': task.customer_id,
            'customer_name': customer.full_name if customer else None,
            'title': task.title,
            'description': task.description,
            'due_date': task.due_date.isoformat() if task.due_date else None,
            'priority': task.priority,
            'status': task.status,
            'assigned_to': task.assigned_to,
            'assigned_to_name': assigned_user.username if assigned_user else None,
            'created_at': task.created_at.isoformat() if task.created_at else None,
            'completed_at': task.completed_at.isoformat() if task.completed_at else None,
            'source': task.source,
            'source_id': task.source_id
        }), 200

    except Exception as e:
        logging.error(f"Error fetching task {task_id}: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@tasks_bp.route('', methods=['POST'])
@token_required
@role_required('admin')
@permission_required('tasks:manage')
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
            created_by=current_user.id,
            source=data.get('source'),
            source_id=data.get('source_id')
        )
        
        db.session.add(task)
        db.session.commit()

        # Audit trail
        audit = AuditLog(user_id=current_user.id, action='CREATE_TASK', resource_type='CustomerTask', resource_id=str(task.id), details=f"Created task: {task.title}")
        db.session.add(audit)
        db.session.commit()
        socketio.emit('task_created', {'id': task.id, 'title': task.title, 'assigned_to': task.assigned_to})

        # Push notification to assignee
        if task.assigned_to and task.assigned_to != current_user.id:
            assignee = User.query.get(task.assigned_to)
            notif_title = 'משימה חדשה הוקצתה אליך'
            notif_message = f'משימה: {task.title}'
            note = Notification(user_id=task.assigned_to, delivery_id=None, type='push', title=notif_title, message=notif_message, is_read=False)
            db.session.add(note)
            db.session.commit()
            if assignee and getattr(assignee, 'fcm_token', None):
                send_push_notification(assignee.fcm_token, notif_title, notif_message, data={'task_id': task.id, 'type': 'task_assignment'})

        return jsonify({'success': True, 'id': task.id, 'message': 'Task created'}), 201
        
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error creating task: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

@tasks_bp.route('/<int:task_id>', methods=['PATCH', 'PUT'])
@token_required
@role_required('admin')
@permission_required('tasks:manage')
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

        if 'source' in data:
            task.source = data['source']
        if 'source_id' in data:
            task.source_id = data['source_id']
                    
        db.session.commit()

        # Audit trail
        audit = AuditLog(user_id=current_user.id, action='UPDATE_TASK', resource_type='CustomerTask', resource_id=str(task.id), details=f"Updated task fields: {list(data.keys())}")
        db.session.add(audit)
        db.session.commit()
        socketio.emit('task_updated', {'id': task.id, 'status': task.status, 'assigned_to': task.assigned_to})

        # Push notification if assignee changed
        if 'assigned_to' in data and data['assigned_to']:
            assignee = User.query.get(data['assigned_to'])
            if assignee and data['assigned_to'] != current_user.id:
                notif_title = 'משימה הוקצתה אליך'
                notif_message = f'משימה: {task.title}'
                note = Notification(user_id=data['assigned_to'], delivery_id=None, type='push', title=notif_title, message=notif_message, is_read=False)
                db.session.add(note)
                db.session.commit()
                if getattr(assignee, 'fcm_token', None):
                    send_push_notification(assignee.fcm_token, notif_title, notif_message, data={'task_id': task.id, 'type': 'task_assignment'})

        return jsonify({'success': True, 'message': 'Task updated'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@tasks_bp.route('/<int:task_id>', methods=['DELETE'])
@token_required
@role_required('admin')
@permission_required('tasks:manage')
def delete_task(current_user, task_id):
    """מחיקת משימה"""
    try:
        task = CustomerTask.query.get_or_404(task_id)
        task_title = task.title
        db.session.delete(task)
        db.session.commit()

        audit = AuditLog(user_id=current_user.id, action='DELETE_TASK', resource_type='CustomerTask', resource_id=str(task_id), details=f"Deleted task: {task_title}")
        db.session.add(audit)
        db.session.commit()
        socketio.emit('task_deleted', {'id': task_id})

        return jsonify({'success': True, 'message': 'Task deleted'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@tasks_bp.route('/import-requirements', methods=['POST'])
@token_required
@role_required('admin')
@permission_required('tasks:manage')
def import_requirements(current_user):
    """
    Import checklist items from COURIER_APP_REQUIREMENTS.md into CustomerTask.
    Idempotent by (source='requirements', source_id).
    """
    try:
        data = request.get_json(silent=True) or {}
        include_checked = bool(data.get('include_checked', False))
        auto_prefix = data.get('auto_prefix', 'AUTO')
        priority = data.get('priority', 'high')
        assigned_to = data.get('assigned_to')
        customer_id = data.get('customer_id')
        due_date = _parse_due_date(data.get('due_date'))

        project_root = Path(__file__).resolve().parents[2]
        default_path = project_root / 'COURIER_APP_REQUIREMENTS.md'
        req_path_raw = data.get('requirements_path')
        if req_path_raw:
            req_path = Path(req_path_raw)
            if not req_path.is_absolute():
                req_path = (project_root / req_path).resolve()
            else:
                req_path = req_path.resolve()
        else:
            req_path = default_path

        if not req_path.exists():
            return jsonify({'error': f'requirements file not found: {req_path}'}), 404

        text = req_path.read_text(encoding='utf-8', errors='ignore')
        items = _parse_requirement_items(text, include_checked=include_checked, auto_prefix=auto_prefix)

        existing_rows = CustomerTask.query.filter_by(source='requirements').all()
        existing_ids = {str(t.source_id) for t in existing_rows if t.source_id}

        created = 0
        skipped = 0
        created_ids = []

        for item in items:
            source_id = item['source_id']
            if source_id in existing_ids:
                skipped += 1
                continue

            task = CustomerTask(
                customer_id=customer_id,
                title=f"[{source_id}] {item['title']}",
                description=f"Imported from requirements ({source_id})",
                due_date=due_date,
                priority=priority,
                status='open',
                assigned_to=assigned_to,
                created_by=current_user.id,
                source='requirements',
                source_id=source_id
            )
            db.session.add(task)
            existing_ids.add(source_id)
            created += 1
            created_ids.append(source_id)

        db.session.commit()
        return jsonify({
            'success': True,
            'created': created,
            'skipped': skipped,
            'total_parsed': len(items),
            'created_source_ids': created_ids,
            'requirements_path': str(req_path)
        }), 200

    except Exception as e:
        db.session.rollback()
        logging.error(f"Error importing requirements: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500
