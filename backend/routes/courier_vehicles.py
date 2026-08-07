from flask import Blueprint, request, jsonify
from models import db, Courier, CourierVehicle, StorageType, Rating, RatingFeedback
from utils.decorators import token_required, role_required
from datetime import datetime
import logging
import re

courier_vehicles_bp = Blueprint('courier_vehicles', __name__)
logger = logging.getLogger(__name__)

# Allowed Israeli license plate format: 7-8 chars, e.g. 123-45-678 / 12-345-67
PLATE_REGEX = re.compile(r'^\d{1,2}-?\d{2,3}-?\d{2,4}$')

# Allowed vehicle types (must match Courier.vehicle_type enum)
VEHICLE_TYPES = {'motorcycle', 'scooter', 'car', 'bicycle', 'van'}

# Default storage types seeded into the reference table
DEFAULT_STORAGE_TYPES = ['קירור', 'רגיל', 'שברירי', 'מכתבים', 'כבד']


def _ensure_storage_types():
    """Idempotently seed the storage_types reference table."""
    for name in DEFAULT_STORAGE_TYPES:
        if not StorageType.query.filter_by(name=name).first():
            db.session.add(StorageType(name=name))
    db.session.commit()


def _get_courier(current_user):
    courier = Courier.query.filter_by(user_id=current_user.id).first()
    if not courier:
        return None
    return courier


def _assert_vehicle_owner(current_user, vehicle_id):
    """Return (courier, vehicle) or abort with 403/404.
    Prevents BOLA/IDOR: never trust the client-supplied id."""
    courier = _get_courier(current_user)
    if not courier:
        return None, None
    vehicle = CourierVehicle.query.get(vehicle_id)
    if not vehicle or vehicle.courier_id != courier.id:
        return courier, None
    return courier, vehicle


def _resolve_storage_types(names):
    """Map a list of storage type names to StorageType rows (creating missing ones)."""
    result = []
    for name in (names or []):
        name = str(name).strip()
        if not name:
            continue
        st = StorageType.query.filter_by(name=name).first()
        if not st:
            st = StorageType(name=name)
            db.session.add(st)
            db.session.flush()
        result.append(st)
    return result


def _parse_date(value):
    if not value:
        return None
    try:
        return datetime.strptime(value, '%Y-%m-%d').date()
    except (ValueError, TypeError):
        try:
            return datetime.fromisoformat(value).date()
        except (ValueError, TypeError):
            return None


@courier_vehicles_bp.route('/vehicles', methods=['GET'])
@token_required
@role_required('courier')
def list_vehicles(current_user):
    _ensure_storage_types()
    try:
        courier = _get_courier(current_user)
        if not courier:
            return jsonify({'error': 'Courier profile not found'}), 404
        vehicles = CourierVehicle.query.filter_by(courier_id=courier.id)\
            .order_by(CourierVehicle.is_primary.desc(), CourierVehicle.created_at.desc()).all()
        return jsonify({
            'data': [v.to_dict() for v in vehicles],
            'total': len(vehicles),
        }), 200
    except Exception as e:
        logger.error(f"Error listing vehicles: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@courier_vehicles_bp.route('/vehicles', methods=['POST'])
@token_required
@role_required('courier')
def create_vehicle(current_user):
    _ensure_storage_types()
    try:
        courier = _get_courier(current_user)
        if not courier:
            return jsonify({'error': 'Courier profile not found'}), 404

        data = request.get_json(silent=True) or {}
        plate = str(data.get('plate_number', '')).strip()
        vehicle_type = str(data.get('vehicle_type', '')).strip()
        if not plate:
            return jsonify({'error': 'Plate number is required'}), 400
        if not PLATE_REGEX.match(plate):
            return jsonify({'error': 'Invalid Israeli plate number format'}), 400
        if vehicle_type not in VEHICLE_TYPES:
            return jsonify({'error': 'Invalid vehicle type'}), 400

        # When adding the first vehicle, force it to be primary
        existing = CourierVehicle.query.filter_by(courier_id=courier.id).count()
        is_primary = bool(data.get('is_primary', existing == 0))

        vehicle = CourierVehicle(
            courier_id=courier.id,
            plate_number=plate,
            vehicle_type=vehicle_type,
            insurance_expiry=_parse_date(data.get('insurance_expiry')),
            test_expiry=_parse_date(data.get('test_expiry')),
            is_primary=is_primary,
        )
        vehicle.storage_types = _resolve_storage_types(data.get('storage_types'))
        db.session.add(vehicle)
        db.session.commit()

        if is_primary:
            _unset_other_primary(courier.id, vehicle.id)

        return jsonify({'data': vehicle.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating vehicle: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@courier_vehicles_bp.route('/vehicles/<int:vehicle_id>', methods=['PUT'])
@token_required
@role_required('courier')
def update_vehicle(current_user, vehicle_id):
    _ensure_storage_types()
    try:
        courier, vehicle = _assert_vehicle_owner(current_user, vehicle_id)
        if not vehicle:
            return jsonify({'error': 'Vehicle not found'}), 404

        data = request.get_json(silent=True) or {}
        if 'plate_number' in data:
            plate = str(data['plate_number']).strip()
            if not plate:
                return jsonify({'error': 'Plate number cannot be empty'}), 400
            if not PLATE_REGEX.match(plate):
                return jsonify({'error': 'Invalid Israeli plate number format'}), 400
            vehicle.plate_number = plate
        if 'vehicle_type' in data:
            vt = str(data['vehicle_type']).strip()
            if vt not in VEHICLE_TYPES:
                return jsonify({'error': 'Invalid vehicle type'}), 400
            vehicle.vehicle_type = vt
        if 'insurance_expiry' in data:
            vehicle.insurance_expiry = _parse_date(data['insurance_expiry'])
        if 'test_expiry' in data:
            vehicle.test_expiry = _parse_date(data['test_expiry'])
        if 'storage_types' in data:
            vehicle.storage_types = _resolve_storage_types(data['storage_types'])

        db.session.commit()
        return jsonify({'data': vehicle.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating vehicle {vehicle_id}: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@courier_vehicles_bp.route('/vehicles/<int:vehicle_id>', methods=['DELETE'])
@token_required
@role_required('courier')
def delete_vehicle(current_user, vehicle_id):
    try:
        courier, vehicle = _assert_vehicle_owner(current_user, vehicle_id)
        if not vehicle:
            return jsonify({'error': 'Vehicle not found'}), 404

        # If deleting the primary, promote the most recent remaining one
        was_primary = vehicle.is_primary
        db.session.delete(vehicle)
        db.session.commit()

        if was_primary:
            remaining = CourierVehicle.query.filter_by(courier_id=courier.id)\
                .order_by(CourierVehicle.created_at.desc()).first()
            if remaining:
                remaining.is_primary = True
                db.session.commit()

        return jsonify({'message': 'Vehicle deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting vehicle {vehicle_id}: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@courier_vehicles_bp.route('/vehicles/<int:vehicle_id>/primary', methods=['PUT'])
@token_required
@role_required('courier')
def set_primary_vehicle(current_user, vehicle_id):
    try:
        courier, vehicle = _assert_vehicle_owner(current_user, vehicle_id)
        if not vehicle:
            return jsonify({'error': 'Vehicle not found'}), 404

        # Atomic transaction: unset all other primaries, then set this one
        _unset_other_primary(courier.id, vehicle.id)
        vehicle.is_primary = True
        db.session.commit()

        return jsonify({'data': vehicle.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error setting primary vehicle {vehicle_id}: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500


def _unset_other_primary(courier_id, keep_vehicle_id):
    """Unset is_primary on every other vehicle of this courier (within a transaction)."""
    CourierVehicle.query.filter_by(courier_id=courier_id, is_primary=True)\
        .filter(CourierVehicle.id != keep_vehicle_id)\
        .update({'is_primary': False})
