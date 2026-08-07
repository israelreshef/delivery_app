from flask import Blueprint, request, jsonify
from models import db, CourierContact, Courier, Delivery, PickupPoint, DeliveryPoint, Address, CustomerTask, AuditLog, Notification, User
from utils.decorators import token_required, role_required
from sqlalchemy.orm import joinedload
import logging
from datetime import datetime
import json
from extensions import socketio

courier_clients_bp = Blueprint('courier_clients', __name__)
logger = logging.getLogger(__name__)


def _get_courier(current_user):
    courier = Courier.query.filter_by(user_id=current_user.id).first()
    if not courier:
        return None
    return courier


# ─── My Clients (Courier's personal contacts) ────────────────────────────

@courier_clients_bp.route('/my-clients', methods=['GET'])
@token_required
@role_required('courier')
def get_my_clients(current_user):
    try:
        courier = _get_courier(current_user)
        if not courier:
            return jsonify({'error': 'Courier profile not found'}), 404

        query = CourierContact.query.filter_by(courier_id=courier.id)
        search = request.args.get('search', '')
        vip = request.args.get('vip', '')
        business = request.args.get('business', '')

        if search:
            query = query.filter(
                db.or_(
                    CourierContact.name.ilike(f'%{search}%'),
                    CourierContact.company.ilike(f'%{search}%'),
                    CourierContact.phone.ilike(f'%{search}%'),
                )
            )
        if vip.lower() in ('true', '1'):
            query = query.filter_by(is_vip=True)
        if business.lower() in ('true', '1'):
            query = query.filter_by(is_business=True)

        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        paginated = query.order_by(CourierContact.updated_at.desc()).paginate(page=page, per_page=per_page, error_out=False)

        return jsonify({
            'data': [c.to_dict() for c in paginated.items],
            'total': paginated.total,
            'pages': paginated.pages,
            'current_page': page,
            'per_page': per_page,
        }), 200

    except Exception as e:
        logger.error(f"Error fetching courier contacts: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@courier_clients_bp.route('/my-clients', methods=['POST'])
@token_required
@role_required('courier')
def create_my_client(current_user):
    try:
        courier = _get_courier(current_user)
        if not courier:
            return jsonify({'error': 'Courier profile not found'}), 404

        data = request.json
        if not data or not data.get('name'):
            return jsonify({'error': 'Name is required'}), 400

        contact = CourierContact(
            courier_id=courier.id,
            name=data['name'].strip(),
            company=data.get('company', ''),
            phone=data.get('phone', ''),
            email=data.get('email', ''),
            addresses=json.dumps(data.get('addresses', []), ensure_ascii=False),
            is_vip=data.get('is_vip', False),
            is_business=data.get('is_business', False),
            notes=data.get('notes', ''),
            tags=json.dumps(data.get('tags', []), ensure_ascii=False),
        )
        db.session.add(contact)
        db.session.commit()

        return jsonify({'data': contact.to_dict()}), 201

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating courier contact: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@courier_clients_bp.route('/my-clients/<int:contact_id>', methods=['GET'])
@token_required
@role_required('courier')
def get_my_client(current_user, contact_id):
    try:
        courier = _get_courier(current_user)
        if not courier:
            return jsonify({'error': 'Courier profile not found'}), 404

        contact = CourierContact.query.filter_by(id=contact_id, courier_id=courier.id).first()
        if not contact:
            return jsonify({'error': 'Contact not found'}), 404

        return jsonify({'data': contact.to_dict()}), 200

    except Exception as e:
        logger.error(f"Error fetching contact {contact_id}: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@courier_clients_bp.route('/my-clients/<int:contact_id>', methods=['PUT'])
@token_required
@role_required('courier')
def update_my_client(current_user, contact_id):
    try:
        courier = _get_courier(current_user)
        if not courier:
            return jsonify({'error': 'Courier profile not found'}), 404

        contact = CourierContact.query.filter_by(id=contact_id, courier_id=courier.id).first()
        if not contact:
            return jsonify({'error': 'Contact not found'}), 404

        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        if 'name' in data:
            contact.name = data['name'].strip()
        if 'company' in data:
            contact.company = data.get('company', '')
        if 'phone' in data:
            contact.phone = data.get('phone', '')
        if 'email' in data:
            contact.email = data.get('email', '')
        if 'addresses' in data:
            contact.addresses = json.dumps(data['addresses'], ensure_ascii=False)
        if 'is_vip' in data:
            contact.is_vip = data['is_vip']
        if 'is_business' in data:
            contact.is_business = data['is_business']
        if 'notes' in data:
            contact.notes = data.get('notes', '')
        if 'tags' in data:
            contact.tags = json.dumps(data['tags'], ensure_ascii=False)
        contact.updated_at = datetime.utcnow()
        db.session.commit()

        return jsonify({'data': contact.to_dict()}), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating contact {contact_id}: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@courier_clients_bp.route('/my-clients/<int:contact_id>', methods=['DELETE'])
@token_required
@role_required('courier')
def delete_my_client(current_user, contact_id):
    try:
        courier = _get_courier(current_user)
        if not courier:
            return jsonify({'error': 'Courier profile not found'}), 404

        contact = CourierContact.query.filter_by(id=contact_id, courier_id=courier.id).first()
        if not contact:
            return jsonify({'error': 'Contact not found'}), 404

        db.session.delete(contact)
        db.session.commit()

        return jsonify({'message': 'Contact deleted successfully'}), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting contact {contact_id}: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500


# ─── Delivery Clients (System customers from courier's deliveries) ───────

@courier_clients_bp.route('/delivery-clients', methods=['GET'])
@token_required
@role_required('courier')
def get_delivery_clients(current_user):
    try:
        courier = _get_courier(current_user)
        if not courier:
            return jsonify({'error': 'Courier profile not found'}), 404

        search = request.args.get('search', '')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)

        deliveries = Delivery.query.options(
            joinedload(Delivery.pickup_point).joinedload(PickupPoint.address),
            joinedload(Delivery.delivery_point).joinedload(DeliveryPoint.address),
        ).filter_by(courier_id=courier.id)

        if search:
            deliveries = deliveries.join(PickupPoint, Delivery.pickup_point_id == PickupPoint.id).filter(
                db.or_(
                    PickupPoint.contact_name.ilike(f'%{search}%'),
                    PickupPoint.contact_phone.ilike(f'%{search}%'),
                )
            )

        paginated = deliveries.order_by(Delivery.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)

        result = []
        seen = set()
        for d in paginated.items:
            pp = d.pickup_point
            dp = d.delivery_point
            if not pp or not dp:
                continue

            key = pp.contact_phone or pp.contact_name
            if key and key not in seen:
                seen.add(key)
                pa = pp.address
                da = dp.address
                pickup_addr = f'{pa.street} {pa.building_number}, {pa.city}' if pa else ''
                dropoff_addr = f'{da.street} {da.building_number}, {da.city}' if da else ''

                result.append({
                    'order_id': d.id,
                    'name': pp.contact_name or 'לקוח ממערכת',
                    'phone': pp.contact_phone or '',
                    'pickup_address': pickup_addr,
                    'dropoff_address': dropoff_addr,
                    'delivery_date': d.created_at.isoformat() if d.created_at else None,
                    'delivery_type': d.delivery_type or 'standard',
                    'notes': d.notes or '',
                })

        return jsonify({
            'data': result,
            'total': len(result),
            'current_page': page,
            'per_page': per_page,
        }), 200

    except Exception as e:
        logger.error(f"Error fetching delivery clients: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500


# ─── Client Order History ──────────────────────────────────────────────────

@courier_clients_bp.route('/my-clients/<int:contact_id>/orders', methods=['GET'])
@token_required
@role_required('courier')
def get_client_orders(current_user, contact_id):
    try:
        courier = _get_courier(current_user)
        if not courier:
            return jsonify({'error': 'Courier profile not found'}), 404

        contact = CourierContact.query.filter_by(id=contact_id, courier_id=courier.id).first()
        if not contact:
            return jsonify({'error': 'Contact not found'}), 404

        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)

        phone = contact.phone or ''
        name = contact.name or ''

        PickupAddr = db.aliased(Address)
        DeliveryAddr = db.aliased(Address)

        deliveries = Delivery.query\
            .join(PickupPoint, Delivery.pickup_point_id == PickupPoint.id)\
            .join(PickupAddr, PickupPoint.address_id == PickupAddr.id)\
            .filter(
                Delivery.courier_id == courier.id,
                db.or_(
                    PickupPoint.contact_phone == phone,
                    PickupPoint.contact_name.ilike(f'%{name}%'),
                )
            )

        paginated = deliveries.order_by(Delivery.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)

        result = []
        for d in paginated.items:
            pp = d.pickup_point
            dp = d.delivery_point
            if not pp or not dp:
                continue
            pa = pp.address
            da = dp.address or (DeliveryPoint.query.options(joinedload(DeliveryPoint.address)).get(d.delivery_point_id).address if dp else None)

            result.append({
                'id': d.id,
                'order_number': d.order_number,
                'status': d.status,
                'delivery_fee': float(d.delivery_fee or 0.0),
                'package_description': d.package_description or '',
                'pickup_address': f'{pp.address.street} {pp.address.building_number}, {pp.address.city}' if pp.address else '',
                'dropoff_address': f'{dp.address.street} {dp.address.building_number}, {dp.address.city}' if dp and dp.address else '',
                'created_at': d.created_at.isoformat() if d.created_at else None,
                'delivered_at': d.delivered_at.isoformat() if d.delivered_at else None,
            })

        return jsonify({
            'data': result,
            'total': paginated.total,
            'pages': paginated.pages,
            'current_page': page,
        }), 200

    except Exception as e:
        logger.error(f"Error fetching orders for contact {contact_id}: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500


# ─── Contact Log (log interactions with a client) ────────────────────────

@courier_clients_bp.route('/my-clients/<int:contact_id>/contact-log', methods=['POST'])
@token_required
@role_required('courier')
def log_contact_interaction(current_user, contact_id):
    try:
        courier = _get_courier(current_user)
        if not courier:
            return jsonify({'error': 'Courier profile not found'}), 404

        contact = CourierContact.query.filter_by(id=contact_id, courier_id=courier.id).first()
        if not contact:
            return jsonify({'error': 'Contact not found'}), 404

        data = request.json
        note = data.get('note', '') if data else ''
        contact.notes = (contact.notes + '\n' + note).strip()
        contact.last_interaction = datetime.utcnow()
        contact.total_deliveries = (contact.total_deliveries or 0) + (data.get('add_delivery', 0) if data else 0)
        if data and 'revenue' in data:
            contact.total_revenue = (contact.total_revenue or 0.0) + float(data['revenue'])
        db.session.commit()

        return jsonify({'data': contact.to_dict()}), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error logging contact interaction: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500


# ─── Quotes ───────────────────────────────────────────────────────────────

@courier_clients_bp.route('/my-clients/<int:contact_id>/quote', methods=['POST'])
@token_required
@role_required('courier')
def send_quote(current_user, contact_id):
    try:
        courier = _get_courier(current_user)
        if not courier:
            return jsonify({'error': 'Courier profile not found'}), 404

        contact = CourierContact.query.filter_by(id=contact_id, courier_id=courier.id).first()
        if not contact:
            return jsonify({'error': 'Contact not found'}), 404

        data = request.json
        if not data or not data.get('description') or not data.get('price'):
            return jsonify({'error': 'description and price are required'}), 400

        description = data['description']
        price = float(data['price'])

        contact.notes = (contact.notes + f'\n[הצעת מחיר] {description} — ₪{price:.2f}').strip()
        contact.last_interaction = datetime.utcnow()
        db.session.commit()

        socketio.emit('quote_sent', {
            'contact_id': contact.id,
            'contact_name': contact.name,
            'description': description,
            'price': price,
        })

        return jsonify({'message': 'Quote sent', 'description': description, 'price': price}), 201

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error sending quote for contact {contact_id}: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500


# ─── Follow-up Tasks for a Contact ────────────────────────────────────────

@courier_clients_bp.route('/my-clients/<int:contact_id>/tasks', methods=['GET'])
@token_required
@role_required('courier')
def get_client_tasks(current_user, contact_id):
    try:
        courier = _get_courier(current_user)
        if not courier:
            return jsonify({'error': 'Courier profile not found'}), 404

        contact = CourierContact.query.filter_by(id=contact_id, courier_id=courier.id).first()
        if not contact:
            return jsonify({'error': 'Contact not found'}), 404

        tasks = CustomerTask.query.filter_by(source='courier_contact', source_id=str(contact.id)).order_by(CustomerTask.created_at.desc()).all()

        return jsonify([{
            'id': t.id,
            'title': t.title,
            'description': t.description,
            'due_date': t.due_date.isoformat() if t.due_date else None,
            'priority': t.priority,
            'status': t.status,
            'created_at': t.created_at.isoformat() if t.created_at else None,
            'source': t.source,
            'source_id': t.source_id,
        } for t in tasks]), 200

    except Exception as e:
        logger.error(f"Error fetching tasks for contact {contact_id}: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@courier_clients_bp.route('/my-clients/<int:contact_id>/tasks', methods=['POST'])
@token_required
@role_required('courier')
def create_client_task(current_user, contact_id):
    try:
        courier = _get_courier(current_user)
        if not courier:
            return jsonify({'error': 'Courier profile not found'}), 404

        contact = CourierContact.query.filter_by(id=contact_id, courier_id=courier.id).first()
        if not contact:
            return jsonify({'error': 'Contact not found'}), 404

        data = request.json
        if not data or not data.get('title'):
            return jsonify({'error': 'Title is required'}), 400

        due_date = None
        if data.get('due_date'):
            try:
                if 'T' in data['due_date']:
                    due_date = datetime.fromisoformat(data['due_date'].replace('Z', '+00:00'))
                else:
                    due_date = datetime.strptime(data['due_date'], '%Y-%m-%d')
            except ValueError:
                pass

        task = CustomerTask(
            customer_id=None,
            title=data['title'],
            description=data.get('description', ''),
            due_date=due_date,
            priority=data.get('priority', 'medium'),
            status='open',
            assigned_to=current_user.id,
            created_by=current_user.id,
            source='courier_contact',
            source_id=str(contact.id),
        )
        db.session.add(task)
        db.session.commit()

        audit = AuditLog(user_id=current_user.id, action='CREATE_TASK', resource_type='CustomerTask', resource_id=str(task.id), details=f"Created follow-up task for contact {contact.name}: {task.title}")
        db.session.add(audit)
        db.session.commit()

        socketio.emit('task_created', {'id': task.id, 'title': task.title, 'assigned_to': task.assigned_to, 'source': 'courier_contact'})

        contact.last_interaction = datetime.utcnow()
        db.session.commit()

        return jsonify({
            'id': task.id,
            'title': task.title,
            'description': task.description,
            'due_date': task.due_date.isoformat() if task.due_date else None,
            'priority': task.priority,
            'status': task.status,
            'created_at': task.created_at.isoformat() if task.created_at else None,
            'source': task.source,
            'source_id': task.source_id,
        }), 201

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating task for contact {contact_id}: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500
