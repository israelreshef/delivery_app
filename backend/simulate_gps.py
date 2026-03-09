import socketio
import time
import random

# Connect to local server
sio = socketio.Client()

def simulate_movement():
    print(" Starting GPS Simulation for 3 couriers...")
    
    # Base location (Tel Aviv)
    lat = 32.0853
    lng = 34.7818
    
    couriers = [
        {'id': 1, 'lat': lat, 'lng': lng, 'speed_lat': 0.0001, 'speed_lng': 0.0001},
        {'id': 2, 'lat': 51.5074, 'lng': -0.1278, 'speed_lat': -0.0002, 'speed_lng': 0.0001}, # London
        {'id': 3, 'lat': lat - 0.01, 'lng': lng - 0.005, 'speed_lat': 0.0001, 'speed_lng': -0.0002}
    ]

    sio.connect('http://localhost:5001')

    try:
        while True:
            for c in couriers:
                # Update position
                c['lat'] += c['speed_lat'] + random.uniform(-0.00005, 0.00005)
                c['lng'] += c['speed_lng'] + random.uniform(-0.00005, 0.00005)
                
                # Emit event
                data = {
                    'courier_id': c['id'],
                    'lat': c['lat'],
                    'lng': c['lng'],
                    'timestamp': time.time()
                }
                sio.emit('courier_location_update', data)
                # print(f" Sent update for Courier {c['id']}")
            
            time.sleep(1) # Every second
            
    except KeyboardInterrupt:
        print(" Simulation stopped")
        sio.disconnect()

if __name__ == '__main__':
    simulate_movement()
