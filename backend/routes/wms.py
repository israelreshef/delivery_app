from flask import Blueprint, request, jsonify
from models import db, Warehouse, StorageZone, InventoryItem, StockMovement, User
from utils.decorators import token_required, role_required
from datetime import datetime

wms_bp = Blueprint('wms', __name__)

@wms_bp.route('/inventory', methods=['GET'])
@token_required
def get_inventory(current_user):
    """List all inventory items"""
    try:
        items = InventoryItem.query.all()
        result = []
        for item in items:
            result.append({
                'id': item.id,
                'sku': item.sku,
                'name': item.name,
                'barcode': item.barcode,
                'quantity_on_hand': item.quantity_on_hand,
                'quantity_available': item.quantity_available,
                'unit_value': str(item.unit_value)
            })
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@wms_bp.route('/inventory/check-in', methods=['POST'])
@token_required
@role_required(['admin', 'logistics_manager'])
def check_in(current_user):
    """Receive goods into inventory"""
    try:
        data = request.json
        sku = data.get('sku')
        quantity = int(data.get('quantity', 0))
        warehouse_id = data.get('warehouse_id')
        
        if quantity <= 0:
            return jsonify({'error': 'Quantity must be positive'}), 400
            
        # Find or Create Item
        item = InventoryItem.query.filter_by(sku=sku).first()
        if not item:
            # If new item, require details
            if not data.get('name'): 
                return jsonify({'error': 'New item requires name'}), 400
            
            item = InventoryItem(
                sku=sku,
                name=data.get('name'),
                description=data.get('description'),
                barcode=data.get('barcode'),
                unit_value=data.get('unit_value', 0)
            )
            db.session.add(item)
            db.session.flush() # Get ID
            
        # Update Stock
        item.quantity_on_hand += quantity
        item.update_available()
        
        # Record Movement
        movement = StockMovement(
            item_id=item.id,
            warehouse_id=warehouse_id or 1, # Default to first warehouse if not specified
            movement_type='inbound',
            quantity=quantity,
            performed_by=current_user.id,
            notes=data.get('notes', 'Manual Check-in')
        )
        db.session.add(movement)
        
        db.session.commit()
        return jsonify({'message': 'Check-in successful', 'new_quantity': item.quantity_on_hand}), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@wms_bp.route('/inventory/check-out', methods=['POST'])
@token_required
@role_required(['admin', 'logistics_manager'])
def check_out(current_user):
    """Release goods from inventory"""
    try:
        data = request.json
        sku = data.get('sku')
        quantity = int(data.get('quantity', 0))
        warehouse_id = data.get('warehouse_id')
        
        item = InventoryItem.query.filter_by(sku=sku).first()
        if not item:
            return jsonify({'error': 'Item not found'}), 404
            
        if item.quantity_available < quantity:
            return jsonify({'error': f'Insufficient stock. Available: {item.quantity_available}'}), 400
            
        # Update Stock
        item.quantity_on_hand -= quantity
        item.update_available()
        
        # Record Movement
        movement = StockMovement(
            item_id=item.id,
            warehouse_id=warehouse_id or 1,
            movement_type='outbound',
            quantity=quantity,
            performed_by=current_user.id,
            notes=data.get('notes', 'Manual Check-out')
        )
        db.session.add(movement)
        
        db.session.commit()
        return jsonify({'message': 'Check-out successful', 'new_quantity': item.quantity_on_hand}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
