package com.tzir.delivery.courier.services

import android.util.Log
import io.socket.client.IO
import io.socket.client.Socket
import io.socket.engineio.client.transports.WebSocket
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.launch
import java.net.URISyntaxException
import org.json.JSONObject

object SocketManager {
    private var mSocket: Socket? = null
    private val _routeUpdates = MutableSharedFlow<String>(replay = 1)
    val routeUpdates = _routeUpdates.asSharedFlow()
    
    private val _missionUpdates = MutableSharedFlow<Unit>(extraBufferCapacity = 1)
    val missionUpdates = _missionUpdates.asSharedFlow()
    
    private var currentAvailabilityStatus: Boolean = false
    private var currentCourierId: String? = null
    
    // Default emulator loopback host for testing
    private const val SOCKET_URL = "http://192.168.33.19:5000"
    private var mContext: android.content.Context? = null

    fun init(context: android.content.Context) {
        mContext = context.applicationContext
    }

    fun setAvailabilityStatus(isAvailable: Boolean, courierId: String) {
        currentAvailabilityStatus = isAvailable
        currentCourierId = courierId
        
        if (mSocket != null && mSocket!!.connected()) {
            emitAvailabilityChange(isAvailable, courierId)
        }
    }

    private fun emitAvailabilityChange(isAvailable: Boolean, courierId: String) {
        try {
            val data = JSONObject()
            data.put("courier_id", courierId)
            data.put("is_available", isAvailable)
            data.put("timestamp", System.currentTimeMillis().toString())
            mSocket?.emit("courier_availability_changed", data)
            Log.d("SocketManager", "Emitted courier_availability_changed: $isAvailable")
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    fun connect(courierId: String) {
        currentCourierId = courierId
        if (mSocket != null && mSocket!!.connected()) {
            return
        }

        try {
            val options = IO.Options()
            options.forceNew = true
            options.reconnection = true

            // Add authentication token for backend validation
            val currentToken = com.tzir.delivery.courier.network.TokenManager.token
            if (!currentToken.isNullOrEmpty()) {
                options.auth = mapOf("token" to currentToken)
                options.query = "token=$currentToken"
            }
            
            // Force WebSocket for reliable emulator -> host connection
            options.transports = arrayOf(WebSocket.NAME)
            
            mSocket = IO.socket(SOCKET_URL, options)

            mSocket?.on(Socket.EVENT_CONNECT) {
                Log.d("SocketManager", "Connected to WebSocket Server")
                // Try joining the room directly (or backend might auto-join on auth)
                try {
                    val joinData = JSONObject()
                    joinData.put("role", "courier")
                    joinData.put("id", courierId)
                    // Token is already in auth options, but some versions of delivery_events.py use it from data
                    val token = com.tzir.delivery.courier.network.TokenManager.token
                    if (token != null) {
                        joinData.put("token", token)
                    }
                    mSocket?.emit("join", joinData)
                    
                    // LAYER 3: Reconnect sync 
                    // Re-announce availability on reconnect
                    emitAvailabilityChange(currentAvailabilityStatus, courierId)
                    
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }

            // Listen to Dynamic Route recalculation triggers
            mSocket?.on("route_updated") { args ->
                if (args.isNotEmpty()) {
                    val data = args[0].toString()
                    Log.d("SocketManager", "Received route_updated event: $data")
                    CoroutineScope(Dispatchers.IO).launch {
                        _routeUpdates.emit(data)
                    }
                }
            }

            // Listen to Mission Assignments
            mSocket?.on("new_assignment") { args ->
                Log.d("SocketManager", "Received new_assignment event")
                CoroutineScope(Dispatchers.IO).launch {
                    _missionUpdates.emit(Unit)
                }
            }

            mSocket?.on("delivery_status_update") { args ->
                Log.d("SocketManager", "Received delivery_status_update event")
                CoroutineScope(Dispatchers.IO).launch {
                    _missionUpdates.emit(Unit)
                }
            }

            mSocket?.on(Socket.EVENT_DISCONNECT) {
                Log.d("SocketManager", "Disconnected from WebSocket Server")
            }

            mSocket?.on(Socket.EVENT_CONNECT_ERROR) { args ->
                val error = if (args.isNotEmpty()) args[0].toString() else "Unknown error"
                Log.e("SocketManager", "Socket Connection Error: $error")
            }

            mSocket?.on("error") { args ->
                val error = if (args.isNotEmpty()) args[0].toString() else "Unknown error"
                Log.e("SocketManager", "Socket Server Error: $error")
            }

            mSocket?.connect()
            Log.d("SocketManager", "Initiating socket connection to $SOCKET_URL for courier_$courierId...")

        } catch (e: URISyntaxException) {
            Log.e("SocketManager", "Socket URI Error: ${e.message}")
        }
    }

    fun disconnect() {
        mSocket?.disconnect()
        mSocket = null
        Log.d("SocketManager", "Socket connection terminated.")
    }

    /**
     * Send real-time location update via WebSockets
     */
    fun updateLocation(lat: Double, lng: Double, courierId: String, deliveryId: String? = null) {
        if (mSocket == null || !mSocket!!.connected()) {
            Log.w("SocketManager", "Cannot update location: Socket not connected")
            return
        }

        try {
            val data = JSONObject()
            data.put("courier_id", courierId)
            data.put("lat", lat)
            data.put("lng", lng)
            if (deliveryId != null) {
                data.put("delivery_id", deliveryId)
            }
            data.put("timestamp", System.currentTimeMillis().toString())
            
            Log.d("SocketManager", "📡 Emitting live location: $lat, $lng")
            mSocket?.emit("courier_location_update", data)
        } catch (e: Exception) {
            Log.e("SocketManager", "Error emitting location: ${e.message}")
        }
    }
}
