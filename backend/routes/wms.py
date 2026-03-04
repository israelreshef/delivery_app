from flask import Blueprint, request, jsonify
from models import db, Warehouse, StorageZone, StorageBin, InventoryItem, ItemLocation, StockMovement, User
from utils.decorators import token_required, role_required
from datetime import datetime

wms_bp = Blueprint('wms', __name__)

@wms_bp.route('/topology', methods=['GET'])
@token_required
def get_topology(current_user):
    """Returns the macro overview of Warehouses -> Zones -> Bins with volume metrics"""
    try:
        warehouses = Warehouse.query.all()
        result = []
        for w in warehouses:
            zones_data = []
            for z in w.zones:
                bins_data = []
                for b in z.bins:
                    # Calculate percentage full
                    percent_full = 0
                    if b.max_volume_cm3 and b.max_volume_cm3 > 0:
                        percent_full = round((b.current_volume_cm3 / b.max_volume_cm3) * 100, 1)
                    
                    # Get items in this bin
                    items_in_bin = []
                    for loc in b.locations:
                        if loc.quantity > 0:
                            item = InventoryItem.query.get(loc.item_id)
                            items_in_bin.append({
                                'item_name': item.name,
                                'sku': item.sku,
                                'quantity': loc.quantity
                            })

                    bins_data.append({
                        'id': b.id,
                        'bin_index': b.bin_index,
                        'max_volume': b.max_volume_cm3,
                        'current_volume': b.current_volume_cm3,
                        'percent_full': percent_full,
                        'items_count': sum(loc.quantity for loc in b.locations),
                        'items': items_in_bin
                    })

                zones_data.append({
                    'id': z.id,
                    'name': z.name,
                    'type': z.zone_type,
                    'bins': bins_data
                })

            result.append({
                'id': w.id,
                'name': w.name,
                'address': w.address,
                'zones': zones_data
            })
            
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@wms_bp.route('/inventory', methods=['GET'])
@token_required
def get_inventory(current_user):
    """List all inventory items with mapping of physical locations (Bin paths)"""
    try:
        items = InventoryItem.query.all()
        result = []
        for item in items:
            # Map where this item is
            location_data = []
            for loc in getattr(item, 'locations', []):
                if loc.quantity > 0:
                    bin_obj = StorageBin.query.get(loc.bin_id)
                    zone_obj = StorageZone.query.get(loc.zone_id)
                    wh_obj = Warehouse.query.get(loc.warehouse_id)
                    path = f"{wh_obj.name} > {zone_obj.name} > {bin_obj.bin_index}" if bin_obj else "Unknown"
                    location_data.append({
                        'bin_id': loc.bin_id,
                        'path': path,
                        'quantity': loc.quantity
                    })

            result.append({
                'id': item.id,
                'sku': item.sku,
                'name': item.name,
                'barcode': item.barcode,
                'volume_per_unit_cm3': getattr(item, 'volume_per_unit_cm3', 0),
                'quantity_on_hand': item.quantity_on_hand,
                'quantity_available': item.quantity_available,
                'unit_value': str(item.unit_value),
                'physical_locations': location_data
            })
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@wms_bp.route('/inventory/check-in', methods=['POST'])
@token_required
@role_required(['admin', 'logistics_manager'])
def check_in(current_user):
    """Receive goods precisely into a designated Storage Bin"""
    try:
        data = request.json
        sku = data.get('sku')
        quantity = int(data.get('quantity', 0))
        bin_id = data.get('bin_id')
        
        if quantity <= 0:
            return jsonify({'error': 'Quantity must be positive'}), 400
        
        if not bin_id:
            return jsonify({'error': 'A specific destination bin_id is required for check-in'}), 400

        target_bin = StorageBin.query.get(bin_id)
        if not target_bin:
            return jsonify({'error': 'Target storage bin not found'}), 404
            
        # Find or Create Item
        item = InventoryItem.query.filter_by(sku=sku).first()
        if not item:
            if not data.get('name'): 
                return jsonify({'error': 'New item requires name'}), 400
            
            item = InventoryItem(
                sku=sku,
                name=data.get('name'),
                description=data.get('description', ''),
                barcode=data.get('barcode', ''),
                unit_value=data.get('unit_value', 0),
                volume_per_unit_cm3=data.get('volume_per_unit_cm3', 0)
            )
            db.session.add(item)
            db.session.flush()
        
        # Volumetric Constraints Check
        item_volume = getattr(item, 'volume_per_unit_cm3', 0)
        added_volume = item_volume * quantity
        
        if target_bin.max_volume_cm3 and (target_bin.current_volume_cm3 + added_volume > target_bin.max_volume_cm3):
            return jsonify({
                'error': f'Volumetric limit exceeded. Bin {target_bin.bin_index} cannot fit {quantity} units (Requires {added_volume}cm3)'
            }), 400

        # Update Stock globally
        item.quantity_on_hand += quantity
        item.update_available()
        
        # Update Storage Bin Volume
        target_bin.current_volume_cm3 += added_volume
        
        # Update/Create precise ItemLocation
        loc = ItemLocation.query.filter_by(item_id=item.id, bin_id=target_bin.id).first()
        if loc:
            loc.quantity += quantity
        else:
            loc = ItemLocation(
                item_id=item.id,
                warehouse_id=target_bin.zone.warehouse_id,
                zone_id=target_bin.zone_id,
                bin_id=target_bin.id,
                quantity=quantity
            )
            db.session.add(loc)
        
        # Record Movement
        movement = StockMovement(
            item_id=item.id,
            warehouse_id=target_bin.zone.warehouse_id,
            zone_id=target_bin.zone_id,
            bin_id=target_bin.id,
            movement_type='inbound',
            quantity=quantity,
            performed_by=current_user.id,
            notes=data.get('notes', f'Check-in to {target_bin.bin_index}')
        )
        db.session.add(movement)
        
        db.session.commit()
        return jsonify({
            'message': 'Check-in successful', 
            'new_quantity': item.quantity_on_hand,
            'bin_percent_full': round((target_bin.current_volume_cm3 / target_bin.max_volume_cm3)*100, 1) if target_bin.max_volume_cm3 else 0
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@wms_bp.route('/inventory/check-out', methods=['POST'])
@token_required
@role_required(['admin', 'logistics_manager'])
def check_out(current_user):
    """Release specific goods from an exact Bin"""
    try:
        data = request.json
        sku = data.get('sku')
        quantity = int(data.get('quantity', 0))
        bin_id = data.get('bin_id')
        
        if not bin_id:
            return jsonify({'error': 'Source bin_id is required to pick items for check-out'}), 400

        item = InventoryItem.query.filter_by(sku=sku).first()
        if not item:
            return jsonify({'error': 'Item not found'}), 404
            
        target_bin = StorageBin.query.get(bin_id)
        if not target_bin:
            return jsonify({'error': 'Source bin not found'}), 404

        loc = ItemLocation.query.filter_by(item_id=item.id, bin_id=target_bin.id).first()
        if not loc or loc.quantity < quantity:
            return jsonify({'error': f'Bin {target_bin.bin_index} does not have {quantity} units of this item.'}), 400
            
        # Deduct global stock
        item.quantity_on_hand -= quantity
        item.update_available()
        
        # Deduct from Bin location
        loc.quantity -= quantity
        if loc.quantity <= 0:
            db.session.delete(loc)
        
        # Deduct volume
        removed_volume = getattr(item, 'volume_per_unit_cm3', 0) * quantity
        target_bin.current_volume_cm3 = max(0, target_bin.current_volume_cm3 - removed_volume)
        
        # Record Movement
        movement = StockMovement(
            item_id=item.id,
            warehouse_id=target_bin.zone.warehouse_id,
            zone_id=target_bin.zone_id,
            bin_id=target_bin.id,
            movement_type='outbound',
            quantity=quantity,
            performed_by=current_user.id,
            notes=data.get('notes', f'Check-out from {target_bin.bin_index}')
        )
        db.session.add(movement)
        
        db.session.commit()
        return jsonify({'message': 'Check-out successful', 'remaining_in_bin': loc.quantity}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# ==========================================
# WMS WAREHOUSE MANAGEMENT
# ==========================================

@wms_bp.route('/warehouses', methods=['POST'])
@token_required
@role_required('admin')
def create_warehouse(current_user):
    try:
        data = request.json
        name = data.get('name')
        address = data.get('address', '')
        
        if not name:
            return jsonify({'error': 'Warehouse name is required'}), 400
            
        new_wh = Warehouse(name=name, address=address)
        db.session.add(new_wh)
        db.session.flush() # Gain ID
        
        # Auto-create one Zone and Bin to make it instantly usable
        zone = StorageZone(warehouse_id=new_wh.id, name="Main Zone", zone_type="general")
        db.session.add(zone)
        db.session.flush()
        
        bin_obj = StorageBin(zone_id=zone.id, bin_index="A-01", max_volume_cm3=100000)
        db.session.add(bin_obj)
        
        db.session.commit()
        return jsonify({'message': 'Warehouse created successfully', 'id': new_wh.id}), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# ==========================================
# WMS ORDER FULFILLMENT / PACKAGE TRACKING
# ==========================================

def _get_delivery_volume(delivery):
    # Rough estimate logic based on ENUM if dimensions aren't exact
    if getattr(delivery, 'package_size', None) == 'small': return 2000
    if getattr(delivery, 'package_size', None) == 'medium': return 8000
    if getattr(delivery, 'package_size', None) == 'large': return 25000
    if getattr(delivery, 'package_size', None) == 'xlarge': return 80000
    return 5000

@wms_bp.route('/orders/check-in', methods=['POST'])
@token_required
@role_required(['admin', 'logistics_manager'])
def order_check_in(current_user):
    # Import Delivery locally to avoid circular import if needed (but models is safe here)
    from models import Delivery
    try:
        data = request.json
        order_number = data.get('order_number')
        bin_id = data.get('bin_id')
        
        if not order_number or not bin_id:
            return jsonify({'error': 'order_number and bin_id are required'}), 400
            
        delivery = Delivery.query.filter_by(order_number=order_number).first()
        if not delivery:
            return jsonify({'error': f'Order {order_number} not found'}), 404
            
        target_bin = StorageBin.query.get(bin_id)
        if not target_bin:
            return jsonify({'error': 'Bin not found'}), 404
            
        if delivery.current_bin_id == target_bin.id:
            return jsonify({'message': 'Order is already in this bin'}), 200
            
        # Free up space in old bin if it was previously stored
        vol = _get_delivery_volume(delivery)
        if delivery.current_bin_id and delivery.current_bin:
            delivery.current_bin.current_volume_cm3 = max(0, delivery.current_bin.current_volume_cm3 - vol)
            
        # Add volume to new bin
        if target_bin.max_volume_cm3 and (target_bin.current_volume_cm3 + vol > target_bin.max_volume_cm3):
            return jsonify({'error': 'Bin is too full to accept this package.'}), 400
            
        target_bin.current_volume_cm3 += vol
        delivery.current_bin_id = target_bin.id
        
        db.session.commit()
        return jsonify({'message': 'Order successfully checked into bin.'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@wms_bp.route('/orders/check-out', methods=['POST'])
@token_required
@role_required(['admin', 'logistics_manager'])
def order_check_out(current_user):
    from models import Delivery
    try:
        data = request.json
        order_number = data.get('order_number')
        
        delivery = Delivery.query.filter_by(order_number=order_number).first()
        if not delivery:
            return jsonify({'error': 'Order not found'}), 404
            
        if not delivery.current_bin_id:
            return jsonify({'error': 'Order is not currently in a bin'}), 400
            
        vol = _get_delivery_volume(delivery)
        bin_obj = delivery.current_bin
        if bin_obj:
            bin_obj.current_volume_cm3 = max(0, bin_obj.current_volume_cm3 - vol)
            
        delivery.current_bin_id = None
        db.session.commit()
        return jsonify({'message': 'Order checked out from WMS successfully.'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@wms_bp.route('/orders/locations', methods=['GET'])
@token_required
@role_required(['admin', 'logistics_manager'])
def order_locations(current_user):
    from models import Delivery
    try:
        # Get all deliveries that are attached to a bin
        deliveries = Delivery.query.filter(Delivery.current_bin_id.isnot(None)).all()
        
        result = []
        for d in deliveries:
            bin_obj = d.current_bin
            zone = bin_obj.zone
            warehouse = zone.warehouse
            
            result.append({
                'order_number': d.order_number,
                'status': d.status,
                'package_description': d.package_description,
                'package_size': d.package_size,
                'bin_id': bin_obj.id,
                'bin_index': bin_obj.bin_index,
                'zone_name': zone.name,
                'warehouse_name': warehouse.name,
                'location_path': f"{warehouse.name} -> {zone.name} -> {bin_obj.bin_index}"
            })
            
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
