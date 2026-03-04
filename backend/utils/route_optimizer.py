import requests
import math
import logging
from typing import List, Dict, Tuple
from ortools.constraint_solver import routing_enums_pb2
from ortools.constraint_solver import pywrapcp

# Fallback Haversine for local TSP heuristic when OSRM is unavailable
def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0 # Radius of earth in km
    rlat1, rlon1 = math.radians(lat1), math.radians(lon1)
    rlat2, rlon2 = math.radians(lat2), math.radians(lon2)
    dlat, dlon = rlat2 - rlat1, rlon2 - rlon1
    a = math.sin(dlat / 2)**2 + math.cos(rlat1) * math.cos(rlat2) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

class RouteOptimizer:
    """
    Handles Route Optimization using OSRM API and Google OR-Tools PDP Solver
    """
    
    OSRM_TRIP_URL = "http://router.project-osrm.org/trip/v1/driving"
    OSRM_TABLE_URL = "http://router.project-osrm.org/table/v1/driving"
    
    @classmethod
    def optimize_route(cls, current_lat: float, current_lng: float, destinations: List[Dict]) -> Dict:
        """
        Organizes a list of destinations into their optimal driving sequence.
        Supports Pickup and Delivery constraints.
        """
        if not destinations:
            return {'optimized_sequence': [], 'total_distance_km': 0, 'total_duration_min': 0}

        try:
            return cls._solve_pdp(current_lat, current_lng, destinations)
        except Exception as e:
            logging.error(f"Advanced PDP Optimization failed ({e}). Falling back to simple heuristic.")
            return cls._nearest_neighbor_optimize(current_lat, current_lng, destinations)

    @classmethod
    def _fetch_distance_matrix(cls, points: List[Tuple[float, float]]) -> Dict:
        """Fetch driving distances and durations from OSRM Table API"""
        coord_string = ";".join([f"{lng},{lat}" for lat, lng in points])
        url = f"{cls.OSRM_TABLE_URL}/{coord_string}?annotations=distance,duration"
        
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        return response.json()

    @classmethod
    def _solve_pdp(cls, start_lat: float, start_lng: float, destinations: List[Dict]) -> Dict:
        """Solves the Pickup and Delivery Problem using Google OR-Tools"""
        # 1. Prepare data
        # Index 0 is the start location
        locations = [(start_lat, start_lng)]
        for d in destinations:
            locations.append((d['lat'], d['lng']))

        # Get distance matrix from OSRM
        data_matrix = cls._fetch_distance_matrix(locations)
        dist_matrix = data_matrix['distances']
        dur_matrix = data_matrix['durations'] # In seconds
        
        # Prepare Demands (Capacity) and Service Times
        # demands: positive for pickup, negative for delivery
        demands = [0] # Depot has 0 demand
        service_times = [0] # Depot has 0 service time
        for d in destinations:
            weight = d.get('packages', 1)
            demands.append(weight if d.get('type') == 'pickup' else -weight)
            # 5 minutes service time per stop by default
            service_times.append(d.get('service_time_min', 5) * 60)

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
        manager = pywrapcp.RoutingIndexManager(len(locations), 1, 0)
        routing = pywrapcp.RoutingModel(manager)

        # Distance Callback
        def distance_callback(from_index, to_index):
            from_node = manager.IndexToNode(from_index)
            to_node = manager.IndexToNode(to_index)
            return int(dist_matrix[from_node][to_node])

        transit_callback_index = routing.RegisterTransitCallback(distance_callback)
        routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

        # Add Distance dimension
        routing.AddDimension(
            transit_callback_index,
            0,  # null capacity slack
            3000000,  # maximum distance per vehicle (3000km)
            True,  # start cumulative to zero
            "Distance"
        )
        distance_dimension = routing.GetDimensionOrDie("Distance")

        # Add Time dimension (Duration + Service Time)
        def time_callback(from_index, to_index):
            from_node = manager.IndexToNode(from_index)
            to_node = manager.IndexToNode(to_index)
            # Time is travel time + service time at the FROM node
            return int(dur_matrix[from_node][to_node] + service_times[from_node])

        time_callback_index = routing.RegisterTransitCallback(time_callback)
        routing.AddDimension(
            time_callback_index,
            3600,  # allow waiting time (1 hour)
            86400,  # maximum time per vehicle (24 hours)
            False,  # Don't force start cumulative to zero (depends on time windows)
            "Time"
        )
        time_dimension = routing.GetDimensionOrDie("Time")

        # Add Capacity dimension
        def demand_callback(from_index):
            from_node = manager.IndexToNode(from_index)
            return demands[from_node]

        demand_callback_index = routing.RegisterUnaryTransitCallback(demand_callback)
        routing.AddDimension(
            demand_callback_index,
            0,  # null capacity slack
            30, # max capacity (e.g. 30 packages for a courier)
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
    def optimize_fleet(cls, depot_lat: float, depot_lng: float, destinations: List[Dict], num_vehicles: int) -> Dict:
        """
        Vehicle Routing Problem (VRP). Distributes destinations across multiple couriers.
        """
        if not destinations or num_vehicles <= 0:
            return {'error': 'No destinations or vehicles provided', 'routes': []}

        try:
            # 1. Prepare locations
            locations = [(depot_lat, depot_lng)]
            for d in destinations:
                locations.append((d['lat'], d['lng']))

            # 2. Get distance matrix (using Haversine for VRP scale speed if OSRM is slow, but we'll try OSRM)
            dist_matrix = []
            try:
                data_matrix = cls._fetch_distance_matrix(locations)
                dist_matrix = data_matrix['distances']
            except Exception as e:
                logging.warning(f"OSRM failed for VRP, using Haversine: {e}")
                for i in range(len(locations)):
                    row = []
                    for j in range(len(locations)):
                        dist = _haversine(locations[i][0], locations[i][1], locations[j][0], locations[j][1])
                        row.append(int(dist * 1000)) # in meters
                    dist_matrix.append(row)

            # 3. Create Routing Manager
            manager = pywrapcp.RoutingIndexManager(len(locations), num_vehicles, 0)
            routing = pywrapcp.RoutingModel(manager)

            def distance_callback(from_index, to_index):
                from_node = manager.IndexToNode(from_index)
                to_node = manager.IndexToNode(to_index)
                return dist_matrix[from_node][to_node]

            transit_callback_index = routing.RegisterTransitCallback(distance_callback)
            routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

            # Distance constraints
            routing.AddDimension(
                transit_callback_index,
                0,  
                500000, # 500km max per vehicle
                True,  
                "Distance"
            )

            # Search parameters
            search_parameters = pywrapcp.DefaultRoutingSearchParameters()
            search_parameters.first_solution_strategy = (
                routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
            )
            # Add a time limit so the server doesn't hang
            search_parameters.time_limit.seconds = 5

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
