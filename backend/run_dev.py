# Quick Start Script for Development
# This script runs the Flask server without Socket.IO for faster startup

from app import create_app, _tls_context
from extensions import socketio

if __name__ == '__main__':
    print(" Starting TZIR Delivery Backend (Development Mode)")
    print("=" * 60)
    
    app = create_app()
    
    ssl_context = _tls_context()
    scheme = "https" if ssl_context else "http"
    print(f"\n Server starting on {scheme}://localhost:5001")
    print(" Press CTRL+C to stop the server\n")
    print("=" * 60)
    
    # Run with Socket.IO enabled. NOTE: gevent's WSGIServer crashes when
    # ssl_context is passed as None, so only include the kwarg when TLS is on.
    run_kwargs = {}
    if ssl_context is not None:
        run_kwargs["ssl_context"] = ssl_context
    socketio.run(
        app,
        host='0.0.0.0',
        port=5001,
        debug=True,
        use_reloader=False,
        **run_kwargs
    )
