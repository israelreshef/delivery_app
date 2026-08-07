from flask import Blueprint, request, jsonify
from models import db, Notification, Courier, CourierWallet, CourierLedgerEntry, Delivery, DeliveryStatus, CourierScheduleEntry
from utils.decorators import token_required, role_required
from datetime import datetime
import logging

courier_notifications_bp = Blueprint('courier_notifications', __name__)
logger = logging.getLogger(__name__)


def _get_courier(current_user):
    return Courier.query.filter_by(user_id=current_user.id).first()


@courier_notifications_bp.route('/notifications', methods=['GET'])
@token_required
@role_required('courier')
def get_notifications(current_user):
    try:
        courier = _get_courier(current_user)
        if not courier:
            return jsonify({'error': 'Courier profile not found'}), 404

        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        unread_only = request.args.get('unread_only', 'false').lower() == 'true'

        query = Notification.query.filter_by(user_id=current_user.id)
        if unread_only:
            query = query.filter_by(is_read=False)
        query = query.order_by(Notification.sent_at.desc())

        paginated = query.paginate(page=page, per_page=per_page, error_out=False)

        return jsonify({
            'data': [{
                'id': n.id,
                'type': 'push' if n.type == 'push' else n.type,
                'title': n.title,
                'message': n.message,
                'is_read': n.is_read,
                'delivery_id': n.delivery_id,
                'sent_at': n.sent_at.isoformat() if n.sent_at else None,
            } for n in paginated.items],
            'total': paginated.total,
            'pages': paginated.pages,
            'current_page': page,
            'per_page': per_page,
        }), 200
    except Exception as e:
        logger.error(f"Error fetching notifications: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@courier_notifications_bp.route('/notifications/<int:notification_id>/read', methods=['POST'])
@token_required
@role_required('courier')
def mark_notification_read(current_user, notification_id):
    try:
        n = Notification.query.filter_by(id=notification_id, user_id=current_user.id).first()
        if not n:
            return jsonify({'error': 'Notification not found'}), 404
        n.is_read = True
        db.session.commit()
        return jsonify({'success': True}), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error marking notification read: {e}")
        return jsonify({'error': str(e)}), 500


@courier_notifications_bp.route('/notifications/read-all', methods=['POST'])
@token_required
@role_required('courier')
def mark_all_read(current_user):
    try:
        Notification.query.filter_by(user_id=current_user.id, is_read=False).update({'is_read': True})
        db.session.commit()
        return jsonify({'success': True}), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error marking all read: {e}")
        return jsonify({'error': str(e)}), 500


@courier_notifications_bp.route('/schedule', methods=['GET'])
@token_required
@role_required('courier')
def get_schedule(current_user):
    try:
        courier = _get_courier(current_user)
        if not courier:
            return jsonify({'error': 'Courier profile not found'}), 404

        year = request.args.get('year', type=int)
        month = request.args.get('month', type=int)

        from calendar import monthrange
        if year and month:
            _, last_day = monthrange(year, month)
            start_date = datetime(year, month, 1)
            end_date = datetime(year, month, last_day, 23, 59, 59)
        else:
            from datetime import timedelta
            today = datetime.utcnow()
            start_date = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            end_date = (start_date + timedelta(days=32)).replace(day=1) - timedelta(seconds=1)

        deliveries = (
            Delivery.query
            .filter(
                Delivery.courier_id == courier.id,
                Delivery.created_at.between(start_date, end_date)
            )
            .order_by(Delivery.created_at.asc())
            .all()
        )

        entries = (
            CourierScheduleEntry.query
            .filter(
                CourierScheduleEntry.courier_id == courier.id,
                CourierScheduleEntry.entry_date.between(start_date.date(), end_date.date())
            )
            .order_by(CourierScheduleEntry.entry_date.asc(), CourierScheduleEntry.start_time.asc())
            .all()
        )

        result = []
        for d in deliveries:
            day = d.created_at.day
            result.append({
                'id': d.id,
                'order_number': d.order_number or f'#{d.id}',
                'address': d.dropoff_address or '',
                'pickup_address': d.pickup_address or '',
                'dropoff_address': d.dropoff_address or '',
                'day': day,
                'hour': d.created_at.hour,
                'minute': d.created_at.minute,
                'duration_min': 45,
                'status': d.status.value if isinstance(d.status, DeliveryStatus) else str(d.status),
                'delivery_fee': float(d.delivery_fee) if d.delivery_fee else 0.0,
            })
        for e in entries:
            duration_min = 45
            if e.end_time and e.end_time > e.start_time:
                duration_min = (datetime.combine(e.entry_date, e.end_time) - datetime.combine(e.entry_date, e.start_time)).seconds // 60
            result.append({
                'id': e.id,
                'order_number': f'#{e.id}',
                'address': e.dropoff_address or '',
                'pickup_address': e.pickup_address or '',
                'dropoff_address': e.dropoff_address or '',
                'day': e.entry_date.day,
                'hour': e.start_time.hour,
                'minute': e.start_time.minute,
                'duration_min': duration_min,
                'status': e.status or 'scheduled',
                'delivery_fee': 0.0,
            })

        return jsonify({
            'data': result,
            'year': year or datetime.utcnow().year,
            'month': month or (datetime.utcnow().month),
            'total': len(result),
        }), 200
    except Exception as e:
        logger.error(f"Error fetching schedule: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@courier_notifications_bp.route('/schedule', methods=['POST'])
@token_required
@role_required('courier')
def create_schedule_entry(current_user):
    try:
        courier = _get_courier(current_user)
        if not courier:
            return jsonify({'error': 'Courier profile not found'}), 404

        data = request.get_json(silent=True) or {}
        title = (data.get('title') or '').strip()
        date_str = data.get('date')
        start_str = data.get('start')
        end_str = data.get('end')

        if not title or not date_str or not start_str:
            return jsonify({'error': 'Missing required fields: title, date, start'}), 400

        try:
            entry_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            start_time = datetime.strptime(start_str, '%H:%M').time()
            end_time = datetime.strptime(end_str, '%H:%M').time() if end_str else start_time
        except ValueError:
            return jsonify({'error': 'Invalid date/time format'}), 400

        entry = CourierScheduleEntry(
            courier_id=courier.id,
            title=title,
            entry_date=entry_date,
            start_time=start_time,
            end_time=end_time,
            pickup_address=(data.get('pickup_address') or '').strip(),
            dropoff_address=(data.get('dropoff_address') or '').strip(),
            status='scheduled',
        )
        db.session.add(entry)
        db.session.commit()

        return jsonify({
            'success': True,
            'data': {
                'id': entry.id,
                'title': entry.title,
                'date': entry.entry_date.isoformat(),
                'start': entry.start_time.strftime('%H:%M'),
                'end': entry.end_time.strftime('%H:%M'),
                'pickup_address': entry.pickup_address,
                'dropoff_address': entry.dropoff_address,
                'status': entry.status,
            },
        }), 201
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating schedule entry: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500
