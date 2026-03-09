# Quick Start Script for Development
# This script runs the Flask server without Socket.IO for faster startup

from app import create_app
from extensions import socketio

if __name__ == '__main__':
    print(" Starting TZIR Delivery Backend (Development Mode)")
    print("=" * 60)
    
    app = create_app()
    
    print("\n Server starting on http://localhost:5001")
    print(" Press CTRL+C to stop the server\n")
    print("=" * 60)
    
    # Run with Socket.IO enabled
    socketio.run(
        app,
        host='0.0.0.0',
        port=5001,
        debug=True,
        use_reloader=False
    )
