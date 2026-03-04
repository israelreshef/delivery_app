from flask import Blueprint, request, jsonify
from utils.decorators import token_required, role_required
from models import db, Delivery, Courier, PickupPoint, DeliveryPoint
from utils.route_optimizer import RouteOptimizer
import logging

optimization_bp = Blueprint('optimization', __name__)

@optimization_bp.route('/optimize-my-route', methods=['GET', 'POST'])
@token_required
@role_required('courier')
def optimize_courier_route(current_user):
    """
    Fetches the active deliveries for a courier and returns the optimal order
    to process them based on their current GPS coordinates.
    """
    try:
        courier = current_user.courier
        
        # Option 1: Live coordinates posted by the app
        data = request.json if request.is_json else request.args
        lat = data.get('lat', type=float)
        lng = data.get('lng', type=float)
        
        # Option 2: Fallback to last known coordinates
        if lat is None or lng is None:
            lat = courier.current_location_lat
            lng = courier.current_location_lng
            
        if lat is None or lng is None:
            return jsonify({'error': 'Cannot optimize route without courier GPS coordinates.'}), 400
            
        # 1. Fetch all pending/active deliveries for this courier
        # We need to sort both the Pickups (if pending) and Dropoffs (if picked_up)
        active_deliveries = Delivery.query.filter_by(courier_id=courier.id).filter(
            Delivery.status.in_(['assigned', 'picked_up'])
        ).all()
        
        if not active_deliveries:
            return jsonify({'message': 'No active deliveries to optimize.', 'optimized_sequence': []}), 200
            
        # 2. Extract coordinates for the TSP solver
        destinations = []
        for d in active_deliveries:
            if d.status == 'assigned':
                # Needs pickup
                p = d.pickup_point.address
                destinations.append({
                    'id': f"pickup_{d.id}",
                    'delivery_id': d.id,
                    'order_id': d.id,
                    'type': 'pickup',
                    'lat': p.latitude,
                    'lng': p.longitude,
                    'address': p.street,
                    'priority': d.priority
                })
            elif d.status == 'picked_up':
                # Needs dropoff
                p = d.delivery_point.address
                destinations.append({
                    'id': f"dropoff_{d.id}",
                    'delivery_id': d.id,
                    'order_id': d.id,
                    'type': 'dropoff',
                    'lat': p.latitude,
                    'lng': p.longitude,
                    'address': p.street,
                    'priority': d.priority
                })
                
        # 3. Filter out invalid coordinates
        valid_destinations = [x for x in destinations if x['lat'] is not None and x['lng'] is not None]
        
        if not valid_destinations:
            return jsonify({'error': 'Deliveries are missing strict GPS coordinates.'}), 400
            
        # 4. Run Optimization Engine
        optimization_result = RouteOptimizer.optimize_route(lat, lng, valid_destinations)
        
        return jsonify(optimization_result), 200
        
    except Exception as e:
        logging.error(f"Route Optimization Error: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500

@optimization_bp.route('/optimize-fleet', methods=['POST'])
@token_required
@role_required(['admin', 'operations_manager'])
def optimize_fleet(current_user):
    """
    Takes multiple unassigned orders and auto-assigns
    them to available couriers based on TSP clusters via VRP solver.
    Expects JSON: { "depot_lat": num, "depot_lng": num, "num_vehicles": int, "deliveries": [...] }
    """
    try:
        data = request.json
        depot_lat = data.get('depot_lat')
        depot_lng = data.get('depot_lng')
        num_vehicles = data.get('num_vehicles', 1)
        deliveries = data.get('deliveries', [])
        
        if not depot_lat or not depot_lng:
            return jsonify({'error': 'depot_lat and depot_lng are required (Start Point)'}), 400
            
        if not deliveries:
            return jsonify({'message': 'No deliveries to optimize.', 'routes': []}), 200
            
        # Example delivery format expected by RouteOptimizer:
        # { 'id': str, 'lat': num, 'lng': num, ... }
        # Let's ensure coordinates are present
        valid_destinations = [d for d in deliveries if d.get('lat') is not None and d.get('lng') is not None]
        
        if not valid_destinations:
             return jsonify({'error': 'Missing coordinates in deliveries payload.'}), 400
             
        # Run Optimization Engine (VRP)
        optimization_result = RouteOptimizer.optimize_fleet(depot_lat, depot_lng, valid_destinations, num_vehicles)
        
        return jsonify(optimization_result), 200
        
    except Exception as e:
        logging.error(f"Fleet Optimization Error: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500

# ============================================================================
# Advanced Route Builder 2.0 Management
# ============================================================================

@optimization_bp.route('/managed-routes', methods=['GET', 'POST'])
@token_required
@role_required(['admin', 'operations_manager'])
def manage_routes(current_user):
    """
    GET: List all saved/draft routes
    POST: Save a new route blueprint (draft)
    """
    from models import SavedRoute, RouteStop
    from datetime import datetime
    
    if request.method == 'GET':
        routes = SavedRoute.query.order_by(SavedRoute.created_at.desc()).all()
        return jsonify([{
            'id': r.id,
            'name': r.name,
            'date': r.date.isoformat() if r.date else None,
            'status': r.status,
            'courier_id': r.courier_id,
            'stop_count': r.stops.count(),
            'created_at': r.created_at.isoformat()
        } for r in routes]), 200

    if request.method == 'POST':
        data = request.json
        if not data or 'name' not in data:
            return jsonify({'error': 'Name is required'}), 400
            
        try:
            new_route = SavedRoute(
                name=data['name'],
                date=datetime.strptime(data.get('date', datetime.utcnow().strftime('%Y-%m-%d')), '%Y-%m-%d').date(),
                status='draft',
                courier_id=data.get('courier_id')
            )
            db.session.add(new_route)
            db.session.flush() # Get the ID
            
            # Add stops
            stops_data = data.get('stops', [])
            for i, s in enumerate(stops_data):
                stop = RouteStop(
                    route_id=new_route.id,
                    sequence_number=i + 1,
                    address=s['address'],
                    city=s.get('city'),
                    street=s.get('street'),
                    building_number=s.get('building_number'),
                    floor=s.get('floor'),
                    apartment=s.get('apartment'),
                    latitude=s.get('lat'),
                    longitude=s.get('lng'),
                    note=s.get('note'),
                    stop_type=s.get('stop_type', 'delivery'),
                    order_id=s.get('order_id'),
                    contact_name=s.get('contact_name'),
                    contact_phone=s.get('contact_phone')
                )
                db.session.add(stop)
            
            db.session.commit()
            return jsonify({'message': 'Route saved successfully', 'id': new_route.id}), 201
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 500

@optimization_bp.route('/managed-routes/<int:route_id>', methods=['GET', 'PATCH', 'DELETE'])
@token_required
@role_required(['admin', 'operations_manager'])
def route_detail(current_user, route_id):
    from models import SavedRoute, RouteStop
    route = SavedRoute.query.get_or_404(route_id)
    
    if request.method == 'GET':
        stops = route.stops.order_by(RouteStop.sequence_number).all()
        return jsonify({
            'id': route.id,
            'name': route.name,
            'status': route.status,
            'courier_id': route.courier_id,
            'stops': [{
                'id': s.id,
                'sequence': s.sequence_number,
                'address': s.address,
                'city': s.city,
                'street': s.street,
                'building_number': s.building_number,
                'floor': s.floor,
                'apartment': s.apartment,
                'note': s.note,
                'type': s.stop_type,
                'lat': s.latitude,
                'lng': s.longitude,
                'order_id': s.order_id,
                'contact_name': s.contact_name,
                'contact_phone': s.contact_phone
            } for s in stops]
        }), 200

    if request.method == 'PATCH':
        data = request.json
        if 'status' in data:
            route.status = data['status']
        if 'courier_id' in data:
            route.courier_id = data['courier_id']
        if 'name' in data:
            route.name = data['name']
            
        db.session.commit()
        return jsonify({'message': 'Route updated successfully'}), 200

    if request.method == 'DELETE':
        db.session.delete(route)
        db.session.commit()
        return jsonify({'message': 'Route deleted successfully'}), 200

@optimization_bp.route('/managed-routes/<int:route_id>/publish', methods=['POST'])
@token_required
@role_required(['admin', 'operations_manager'])
def publish_route(current_user, route_id):
    """
    Publish a route so it appears in the courier app.
    If courier_id is set, it becomes 'assigned'.
    Otherwise, it becomes 'published' (open to all).
    """
    from models import SavedRoute
    route = SavedRoute.query.get_or_404(route_id)
    
    if route.courier_id:
        route.status = 'assigned'
    else:
        route.status = 'published'
        
    db.session.commit()
    # TODO: Send Real-time notification via SocketIO/Firebase
    return jsonify({'message': f'Route is now {route.status}', 'status': route.status}), 200
@optimization_bp.route('/my-assigned-route', methods=['GET'])
@token_required
@role_required('courier')
def get_my_assigned_route(current_user):
    """
    Returns the latest route blueprint assigned to the current courier.
    """
    from models import SavedRoute, RouteStop
    courier = current_user.courier
    
    # Find the most recently assigned route that isn't completed
    route = SavedRoute.query.filter_by(
        courier_id=courier.id,
        status='assigned'
    ).order_by(SavedRoute.created_at.desc()).first()
    
    if not route:
        return jsonify({'message': 'No assigned route found'}), 404
        
    stops = route.stops.order_by(RouteStop.sequence_number).all()
    
    return jsonify({
        'id': route.id,
        'name': route.name,
        'date': route.date.isoformat() if route.date else None,
        'stops': [{
            'id': s.id,
            'sequence': s.sequence_number,
            'address': s.address,
            'city': s.city,
            'street': s.street,
            'building_number': s.building_number,
            'floor': s.floor,
            'apartment': s.apartment,
            'note': s.note,
            'type': s.stop_type,
            'lat': s.latitude,
            'lng': s.longitude,
            'contact_name': s.contact_name,
            'contact_phone': s.contact_phone,
            'order_id': s.order_id,
            'is_completed': s.is_completed
        } for s in stops]
    }), 200

@optimization_bp.route('/manual-run', methods=['POST'])
@token_required
@role_required('courier')
def manual_run_optimization(current_user):
    """
    Takes a list of manual stops from the mobile app and returns the optimal sequence.
    """
    try:
        data = request.json
        lat = data.get('lat')
        lng = data.get('lng')
        stops = data.get('stops', [])
        
        if lat is None or lng is None:
            return jsonify({'error': 'Starting GPS coordinates required.'}), 400
            
        if not stops:
            return jsonify({'message': 'No stops to optimize.', 'optimized_sequence': []}), 200
            
        # Run Optimization Engine
        optimization_result = RouteOptimizer.optimize_route(lat, lng, stops)
        
        return jsonify(optimization_result), 200
        
    except Exception as e:
        logging.error(f"Manual Route Optimization Error: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500
