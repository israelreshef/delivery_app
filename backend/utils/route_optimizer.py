import requests
import math
import logging
from typing import List, Dict, Tuple
from ortools.constraint_solver import routing_enums_pb2
from ortools.constraint_solver import pywrapcp

def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0 # Radius of earth in km
    rlat1, rlon1 = math.radians(lat1), math.radians(lon1)
    rlat2, rlon2 = math.radians(lat2), math.radians(lon2)
    dlat, dlon = rlat2 - rlat1, rlon2 - rlon1
    a = math.sin(dlat / 2)**2 + math.cos(rlat1) * math.cos(rlat2) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def _point_in_polygon(lat: float, lng: float, polygon: List[Dict]) -> bool:
    """Ray casting algorithm for point in polygon (lat/lng Dicts)"""
    if not polygon or len(polygon) < 3:
        return True # No restriction if no valid polygon
        
    x, y = lng, lat
    inside = False
    n = len(polygon)
    p1x, p1y = polygon[0].get('lng', 0), polygon[0].get('lat', 0)
    for i in range(1, n + 1):
        p2x, p2y = polygon[i % n].get('lng', 0), polygon[i % n].get('lat', 0)
        if y > min(p1y, p2y):
            if y <= max(p1y, p2y):
                if x <= max(p1x, p2x):
                    if p1y != p2y:
                        xints = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                    if p1x == p2x or x <= xints:
                        inside = not inside
        p1x, p1y = p2x, p2y
    return inside

class RouteOptimizer:
    """
    Handles Route Optimization using OSRM API and Google OR-Tools PDP Solver
    """
    
    OSRM_TRIP_URL = "http://router.project-osrm.org/trip/v1/driving"
    OSRM_TABLE_URL = "http://router.project-osrm.org/table/v1/driving"
    
    @classmethod
    def optimize_route(cls, current_lat: float, current_lng: float, destinations: List[Dict], courier: Dict = None) -> Dict:
        """
        Organizes a list of destinations into their optimal driving sequence.
        Supports Pickup and Delivery constraints.
        If courier is provided, utilizes capacity and shift data.
        """
        if not destinations:
            return {'optimized_sequence': [], 'total_distance_km': 0, 'total_duration_min': 0}

        try:
            return cls._solve_pdp(current_lat, current_lng, destinations, couriers=[courier] if courier else None)
        except Exception as e:
            logging.error(f"Advanced PDP Optimization failed ({e}). Falling back to simple heuristic.")
            return cls._nearest_neighbor_optimize(current_lat, current_lng, destinations)

    @classmethod
    def _fetch_distance_matrix(cls, points: List[Tuple[float, float]], avoid_tolls: bool = False) -> Dict:
        """Fetch driving distances and durations from OSRM Table API"""
        coord_string = ";".join([f"{lng},{lat}" for lat, lng in points])
        url = f"{cls.OSRM_TABLE_URL}/{coord_string}?annotations=distance,duration"
        
        if avoid_tolls:
            url += "&exclude=toll"
            
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        return response.json()

    @classmethod
    def _solve_pdp(cls, start_lat: float, start_lng: float, destinations: List[Dict], couriers: List[Dict] = None) -> Dict:
        """Solves the Pickup and Delivery Problem using Google OR-Tools"""
        # 1. Prepare data
        # Index 0 is the start location (Depot)
        locations = [(start_lat, start_lng)]
        for d in destinations:
            locations.append((d['lat'], d['lng']))

        num_vehicles = len(couriers) if couriers else 1
        
        # Build Vehicle Capacities, Types, and Working Zones
        vehicle_capacities = []
        vehicle_speed_factors = []
        vehicle_zones = []
        for i in range(num_vehicles):
            if couriers and couriers[i]:
                c = couriers[i]
                vehicle_capacities.append(c.get('capacity', 30)) # default 30 packages
                # Speed factor: scooter=1.2 (faster in traffic), van=0.9
                v_type = c.get('vehicle_type', 'car')
                factor = 1.3 if v_type in ['motorcycle', 'scooter'] else (0.8 if v_type == 'van' else 1.0)
                vehicle_speed_factors.append(factor)
                vehicle_zones.append(c.get('working_zone_polygon', []))
            else:
                vehicle_capacities.append(30)
                vehicle_speed_factors.append(1.0)
                vehicle_zones.append([])

        # Group Toll preferences (if any courier avoids tolls, the matrix must reflect it for now, 
        # or ideally we'd need asymmetric matrices per vehicle, but we use one for the VRP)
        any_avoid_tolls = any(c.get('avoid_tolls', False) for c in couriers) if couriers else False

        # Get distance matrix from OSRM
        data_matrix = cls._fetch_distance_matrix(locations, avoid_tolls=any_avoid_tolls)
        dist_matrix = data_matrix['distances']
        dur_matrix = data_matrix['durations'] # In seconds
        
        # Prepare Demands, Service Times, and Time Windows
        # demands: positive for pickup, negative for delivery
        demands = [0] # Depot has 0 demand
        service_times = [0] # Depot has 0 service time
        time_windows = [(0, 86400)] # Depot window (24h)
        penalties = [None] # Depot cannot be dropped
        
        for d in destinations:
            weight = d.get('packages', 1)
            demands.append(weight if d.get('type') == 'pickup' else -weight)
            
            # Service time personalized per courier (coming from spec phase 2)
            base_st = d.get('service_time_min', 3) # Spec base is 3 mins
            service_times.append(base_st * 60)
            
            # Time Windows (seconds from 00:00 of the planning day for simplicity, or relative)
            tw_start = d.get('time_window_start', 0)
            tw_end = d.get('time_window_end', 86400)
            time_windows.append((tw_start, tw_end))
            
            # VIP penalty - if 'is_vip', the penalty to drop this node is huge
            is_vip = d.get('priority') == 'urgent' or d.get('is_vip', False)
            penalties.append(1000000 if is_vip else 50000)

        # Map order_id to (pickup_index, delivery_index)
        # Remember index in locations is destinations index + 1
        pdp_pairs = []
        pickup_map = {}
        delivery_map = {}

        for i, d in enumerate(destinations):
            idx = i + 1
            if d.get('order_id'):
                if d['type'] == 'pickup':
                    pickup_map[d['order_id']] = idx
                elif d['type'] == 'delivery':
                    delivery_map[d['order_id']] = idx

        for order_id, p_idx in pickup_map.items():
            if order_id in delivery_map:
                pdp_pairs.append((p_idx, delivery_map[order_id]))

        # Create the routing index manager. (num_locations, num_vehicles, depot)
        manager = pywrapcp.RoutingIndexManager(len(locations), num_vehicles, 0)
        routing = pywrapcp.RoutingModel(manager)

        # Distance Callback dynamically handling Soft Zones
        def generate_distance_callback(vehicle_id):
            zone_polygon = vehicle_zones[vehicle_id]
            
            def distance_callback(from_index, to_index):
                from_node = manager.IndexToNode(from_index)
                to_node = manager.IndexToNode(to_index)
                
                base_dist = int(dist_matrix[from_node][to_node])
                
                # Check soft zoning constraint for 'to_node'
                # If the node is outside the courier's polygon, add a huge penalty
                if from_node != 0 and to_node != 0 and zone_polygon:
                    lat, lng = locations[to_node]
                    if not _point_in_polygon(lat, lng, zone_polygon):
                        return base_dist + 5000000 # 5,000 km penalty for leaving zone
                
                return base_dist
            return distance_callback

        distance_callback_indices = [routing.RegisterTransitCallback(generate_distance_callback(i)) 
                                     for i in range(num_vehicles)]
        
        # Set arc costs per vehicle
        for vehicle_id, callback_index in enumerate(distance_callback_indices):
            routing.SetArcCostEvaluatorOfVehicle(callback_index, vehicle_id)

        # Add Distance dimension
        routing.AddDimensionWithVehicleTransits(
            distance_callback_indices,
            0,  # null capacity slack
            3000000,  # maximum distance per vehicle (3000km)
            True,  # start cumulative to zero
            "Distance"
        )
        distance_dimension = routing.GetDimensionOrDie("Distance")

        # Add Time dimension (Duration + Service Time)
        def generate_time_callback(vehicle_id):
            speed_factor = vehicle_speed_factors[vehicle_id]
            def time_callback(from_index, to_index):
                from_node = manager.IndexToNode(from_index)
                to_node = manager.IndexToNode(to_index)
                # Apply vehicle speed factor to OSRM base time, add service time
                travel_time = dur_matrix[from_node][to_node] / speed_factor
                return int(travel_time + service_times[from_node])
            return time_callback

        time_callback_indices = [routing.RegisterTransitCallback(generate_time_callback(i)) 
                                 for i in range(num_vehicles)]

        routing.AddDimensionWithVehicleTransits(
            time_callback_indices,
            3600,  # allow waiting time (1 hour slack for bounds)
            86400,  # maximum time per vehicle (24 hours schedule)
            False,  # Don't force start cumulative to zero
            "Time"
        )
        time_dimension = routing.GetDimensionOrDie("Time")

        # Add Time Window Constraints for each location
        for location_idx, time_window in enumerate(time_windows):
            if location_idx == 0:
                continue # Skip depot as its time might be dynamic based on shift
            index = manager.NodeToIndex(location_idx)
            time_dimension.CumulVar(index).SetRange(time_window[0], time_window[1])

        # Allow dropped nodes with penalties (Soft Constraints)
        for node in range(1, len(locations)):
            penalty = penalties[node]
            if penalty:
                routing.AddDisjunction([manager.NodeToIndex(node)], penalty)

        # Add Capacity dimension
        def demand_callback(from_index):
            from_node = manager.IndexToNode(from_index)
            return demands[from_node]

        demand_callback_index = routing.RegisterUnaryTransitCallback(demand_callback)
        routing.AddDimensionWithVehicleCapacity(
            demand_callback_index,
            0,  # null capacity slack
            vehicle_capacities, # Array of max capacities array per vehicle
            True,  # start cumulative to zero
            "Capacity"
        )

        # Add Pickup and Delivery constraints
        for pickup, delivery in pdp_pairs:
            pickup_index = manager.NodeToIndex(pickup)
            delivery_index = manager.NodeToIndex(delivery)
            routing.AddPickupAndDelivery(pickup_index, delivery_index)
            routing.solver().Add(
                routing.VehicleVar(pickup_index) == routing.VehicleVar(delivery_index)
            )
            routing.solver().Add(
                distance_dimension.CumulVar(pickup_index) <= distance_dimension.CumulVar(delivery_index)
            )

        # Search parameters
        search_parameters = pywrapcp.DefaultRoutingSearchParameters()
        search_parameters.first_solution_strategy = (
            routing_enums_pb2.FirstSolutionStrategy.PARALLEL_CHEAPEST_INSERTION
        )

        # Solve
        solution = routing.SolveWithParameters(search_parameters)

        if not solution:
            raise Exception("No PDP solution found")

        # Parse solution
        index = routing.Start(0)
        optimized_sequence = []
        total_dist = 0
        total_dur = 0
        
        # Skip the first (depot) point
        index = solution.Value(routing.NextVar(index))
        
        seq_order = 1
        while not routing.IsEnd(index):
            node_index = manager.IndexToNode(index)
            dest_idx = node_index - 1
            dest = destinations[dest_idx]
            dest['sequence_order'] = seq_order
            optimized_sequence.append(dest)
            
            previous_index = index
            index = solution.Value(routing.NextVar(index))
            
            # Add to totals
            from_node = manager.IndexToNode(previous_index)
            to_node = manager.IndexToNode(index)
            if not routing.IsEnd(index): # Don't add if we are returning to depot (though we use roundtrip=false logic effectively)
                 pass 

            seq_order += 1

        # 5. Get Precise Route Polyline and Totals for the optimized sequence
        final_coords = [f"{start_lng},{start_lat}"]
        for s in optimized_sequence:
            final_coords.append(f"{s['lng']},{s['lat']}")
            
        route_url = f"http://router.project-osrm.org/route/v1/driving/{';'.join(final_coords)}?overview=full&geometries=geojson"
        
        try:
            route_res = requests.get(route_url, timeout=5)
            route_res.raise_for_status()
            route_data = route_res.json()
            
            if route_data.get('code') == 'Ok':
                main_route = route_data['routes'][0]
                return {
                    'optimized_sequence': optimized_sequence,
                    'total_distance_km': round(main_route['distance'] / 1000.0, 2),
                    'total_duration_min': round(main_route['duration'] / 60.0, 1),
                    'route_geometry': main_route['geometry']['coordinates'], # GeoJSON coordinates: [lng, lat]
                    'provider': 'ortools_pdp'
                }
        except Exception as e:
            logging.warning(f"OSRM Route polyline fetch failed: {e}")

        # Fallback to matrix totals if Route API fails
        final_dist_m = solution.ObjectiveValue()
        return {
            'optimized_sequence': optimized_sequence,
            'total_distance_km': round(final_dist_m / 1000.0, 2),
            'total_duration_min': round((final_dist_m / 1000.0 / 30.0) * 60, 1),
            'provider': 'ortools_pdp'
        }

    @classmethod
    def optimize_fleet(cls, depot_lat: float, depot_lng: float, destinations: List[Dict], couriers: List[Dict]) -> Dict:
        """
        Vehicle Routing Problem (VRP). Distributes destinations across multiple couriers.
        """
        num_vehicles = len(couriers) if couriers else 0
        if not destinations or num_vehicles <= 0:
            return {'error': 'No destinations or couriers provided', 'routes': []}

        try:
            # 1. Prepare locations
            locations = [(depot_lat, depot_lng)]
            for d in destinations:
                locations.append((d['lat'], d['lng']))

            # 2. Get distance matrix (using Haversine for VRP scale speed if OSRM is slow, but we'll try OSRM)
            dist_matrix = []
            dur_matrix = []
            any_avoid_tolls = any(c.get('avoid_tolls', False) for c in couriers) if couriers else False
            try:
                data_matrix = cls._fetch_distance_matrix(locations, avoid_tolls=any_avoid_tolls)
                dist_matrix = data_matrix['distances']
                dur_matrix = data_matrix['durations']
            except Exception as e:
                logging.warning(f"OSRM failed for VRP, using Haversine: {e}")
                for i in range(len(locations)):
                    row_dist = []
                    row_dur = []
                    for j in range(len(locations)):
                        dist = _haversine(locations[i][0], locations[i][1], locations[j][0], locations[j][1])
                        row_dist.append(int(dist * 1000)) # in meters
                        # Avg urban speed 30km/h -> 8.33 m/s
                        row_dur.append(int(dist * 1000 / 8.33))
                    dist_matrix.append(row_dist)
                    dur_matrix.append(row_dur)

            # Build Vehicle Capacities, Types, & Working Zones
            vehicle_capacities = []
            vehicle_speed_factors = []
            vehicle_zones = []
            for i in range(num_vehicles):
                c = couriers[i] if couriers else {}
                vehicle_capacities.append(c.get('capacity', 30))
                v_type = c.get('vehicle_type', 'car')
                factor = 1.3 if v_type in ['motorcycle', 'scooter'] else (0.8 if v_type == 'van' else 1.0)
                vehicle_speed_factors.append(factor)
                vehicle_zones.append(c.get('working_zone_polygon', []))
                
            # Prepare Demands and Service Times
            demands = [0] # Depot
            service_times = [0] # Depot
            time_windows = [(0, 86400)]
            penalties = [None]
            for d in destinations:
                demands.append(d.get('packages', 1))
                service_times.append(d.get('service_time_min', 5) * 60)
                time_windows.append((d.get('time_window_start', 0), d.get('time_window_end', 86400)))
                is_vip = d.get('priority') == 'urgent' or d.get('is_vip', False)
                penalties.append(1000000 if is_vip else 50000)

            # 3. Create Routing Manager
            manager = pywrapcp.RoutingIndexManager(len(locations), num_vehicles, 0)
            routing = pywrapcp.RoutingModel(manager)

            def generate_distance_callback(vehicle_id):
                zone_polygon = vehicle_zones[vehicle_id]
                def distance_callback(from_index, to_index):
                    from_node = manager.IndexToNode(from_index)
                    to_node = manager.IndexToNode(to_index)
                    base_dist = dist_matrix[from_node][to_node]
                    
                    if from_node != 0 and to_node != 0 and zone_polygon:
                        lat, lng = locations[to_node]
                        if not _point_in_polygon(lat, lng, zone_polygon):
                            return base_dist + 5000000 # huge penalty
                            
                    return base_dist
                return distance_callback

            distance_callback_indices = [routing.RegisterTransitCallback(generate_distance_callback(i)) 
                                         for i in range(num_vehicles)]
            
            for vehicle_id, callback_index in enumerate(distance_callback_indices):
                routing.SetArcCostEvaluatorOfVehicle(callback_index, vehicle_id)

            # Distance constraints
            routing.AddDimensionWithVehicleTransits(
                distance_callback_indices,
                0,  
                500000, # 500km max per vehicle
                True,  
                "Distance"
            )
            
            # Minimize Fleet Size (Cost per vehicle used)
            # By setting a high fixed cost, the solver will try to use as few vehicles as possible
            routing.SetFixedCostOfAllVehicles(100000)
            
            # Add Time Dimension with Mode Speed Logic
            def generate_time_callback(vehicle_id):
                speed_factor = vehicle_speed_factors[vehicle_id]
                def time_callback(from_index, to_index):
                    from_node = manager.IndexToNode(from_index)
                    to_node = manager.IndexToNode(to_index)
                    return int((dur_matrix[from_node][to_node] / speed_factor) + service_times[from_node])
                return time_callback

            time_callback_indices = [routing.RegisterTransitCallback(generate_time_callback(i)) 
                                     for i in range(num_vehicles)]

            routing.AddDimensionWithVehicleTransits(
                time_callback_indices,
                3600,  # 1 hour wait
                86400,  # 24 hours max
                False,  
                "Time"
            )

            # Add Capacity dimension
            def demand_callback(from_index):
                from_node = manager.IndexToNode(from_index)
                return demands[from_node]

            demand_callback_index = routing.RegisterUnaryTransitCallback(demand_callback)
            routing.AddDimensionWithVehicleCapacity(
                demand_callback_index,
                0,  # null capacity slack
                vehicle_capacities, # Array of custom max capacities array per vehicle
                True,  # start cumulative to zero
                "Capacity"
            )

            # Search parameters - focus on global cost reduction, not load balancing
            search_parameters = pywrapcp.DefaultRoutingSearchParameters()
            
            # Use PATH_CHEAPEST_ARC for initial, but use Guided Local Search for metaheuristic
            search_parameters.first_solution_strategy = (
                routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
            )
            search_parameters.local_search_metaheuristic = (
                routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
            )
            
            # Add a time limit so the server doesn't hang (allocate more time for better clustering)
            search_parameters.time_limit.seconds = 10

            solution = routing.SolveWithParameters(search_parameters)

            if not solution:
                return {'error': 'No VRP solution found', 'routes': []}

            # 4. Parse routes for each vehicle
            routes = []
            for vehicle_id in range(num_vehicles):
                index = routing.Start(vehicle_id)
                vehicle_route = []
                route_distance = 0
                
                # Skip depot
                index = solution.Value(routing.NextVar(index))
                
                while not routing.IsEnd(index):
                    node_index = manager.IndexToNode(index)
                    dest_idx = node_index - 1
                    vehicle_route.append(destinations[dest_idx])
                    
                    previous_index = index
                    index = solution.Value(routing.NextVar(index))
                    
                    route_distance += dist_matrix[manager.IndexToNode(previous_index)][manager.IndexToNode(index)]
                
                if vehicle_route: # Only add if vehicle has assignments
                    routes.append({
                        'vehicle_id': vehicle_id,
                        'sequence': vehicle_route,
                        'distance_km': round(route_distance / 1000.0, 2)
                    })
                    
            return {'routes': routes, 'provider': 'ortools_vrp'}
            
        except Exception as e:
            logging.error(f"Fleet optimization failed: {e}", exc_info=True)
            return {'error': str(e), 'routes': []}

    @classmethod
    def _nearest_neighbor_optimize(cls, start_lat: float, start_lng: float, destinations: List[Dict]) -> Dict:
        """
        Greedy fallback TSP algorithm.
        O(n^2) time complexity, fine for < 50 stops.
        """
        unvisited = list(destinations) # Clone
        optimized_sequence = []
        current_loc = (start_lat, start_lng)
        
        total_distance = 0.0
        
        step = 1
        while unvisited:
            # Find nearest
            nearest_dest = None
            min_dist = float('inf')
            
            for dest in unvisited:
                dist = _haversine(current_loc[0], current_loc[1], dest['lat'], dest['lng'])
                if dist < min_dist:
                    min_dist = dist
                    nearest_dest = dest
                    
            unvisited.remove(nearest_dest)
            
            nearest_dest['sequence_order'] = step
            optimized_sequence.append(nearest_dest)
            
            total_distance += min_dist
            current_loc = (nearest_dest['lat'], nearest_dest['lng'])
            step += 1
            
        # Estimate duration (assuming average urban speed of 30 km/h)
        avg_speed_kmh = 30.0
        duration_hours = total_distance / avg_speed_kmh
        duration_mins = duration_hours * 60.0
        
        return {
            'optimized_sequence': optimized_sequence,
            'total_distance_km': round(total_distance, 2),
            'total_duration_min': round(duration_mins, 1),
            'provider': 'heuristic_fallback'
        }
