# Quick Start Script for Development
# This script runs the Flask server without Socket.IO for faster startup

from app import create_app

if __name__ == '__main__':
    print("🚀 Starting TZIR Delivery Backend (Development Mode)")
    print("=" * 60)
    
    app = create_app()
    
    print("\n✅ Server starting on http://localhost:5000")
    print("📝 Press CTRL+C to stop the server\n")
    print("=" * 60)
    
    # Run with Flask's built-in server (simpler, no gevent)
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=True,
        use_reloader=False  # Disable reloader to avoid double startup
    )
