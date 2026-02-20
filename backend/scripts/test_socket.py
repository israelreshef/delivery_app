import socketio
import asyncio
import sys

# Create a Socket.IO client
sio = socketio.AsyncClient()

@sio.event
async def connect():
    print("Connected to server")
    
@sio.event
async def connect_error(data):
    print(f"The connection failed: {data}")

@sio.event
async def disconnect():
    print("Disconnected from server")

@sio.event
async def courier_location(data):
    print(f"Received location update: {data}")

async def main():
    try:
        await sio.connect('http://localhost:8000', transports=['websocket', 'polling'])
        
        # Join room
        await sio.emit('join_room', {'room': 'tracking_courier_1'})
        
        # Send location update (mock courier 1)
        print("Sending location update...")
        await sio.emit('update_location', {
            'user_id': 1, # Assuming user 1 exists/is courier
            'lat': 32.0853,
            'lng': 34.7818
        })
        
        # Wait a bit to receive own echo if we subscribed to it (or if checking admin room logic)
        await asyncio.sleep(2)
        
        await sio.disconnect()
        
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == '__main__':
    asyncio.run(main())
