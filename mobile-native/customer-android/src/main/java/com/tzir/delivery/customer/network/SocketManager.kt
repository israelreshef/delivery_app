package com.tzir.delivery.customer.network

import android.util.Log
import io.socket.client.IO
import io.socket.client.Socket
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.net.URISyntaxException

object SocketManager {
    private var mSocket: Socket? = null
    private val _courierLocationUpdates = MutableSharedFlow<JSONObject>(replay = 1)
    val courierLocationUpdates = _courierLocationUpdates.asSharedFlow()
    
    // Default emulator loopback host for testing
    private const val SOCKET_URL = "http://192.168.33.19:5000"

    fun connect(customerId: String) {
        if (mSocket != null && mSocket!!.connected()) return

        try {
            val options = IO.Options()
            options.forceNew = true
            options.reconnection = true

            val currentToken = TokenManager.token
            if (!currentToken.isNullOrEmpty()) {
                options.auth = mapOf("token" to currentToken)
                options.query = "token=$currentToken"
            }

            mSocket = IO.socket(SOCKET_URL, options)

            mSocket?.on(Socket.EVENT_CONNECT) {
                Log.d("SocketManager", "Customer connected to WebSocket")
                val joinData = JSONObject()
                joinData.put("role", "customer")
                joinData.put("customer_id", customerId)
                joinData.put("token", currentToken)
                mSocket?.emit("join", joinData)
            }

            // Listen for courier location updates sent to customer room
            mSocket?.on("courier_location") { args ->
                if (args.isNotEmpty()) {
                    val data = args[0] as JSONObject
                    Log.d("SocketManager", "Received courier_location: $data")
                    CoroutineScope(Dispatchers.IO).launch {
                        _courierLocationUpdates.emit(data)
                    }
                }
            }

            // Also listen for broad delivery location updates if the delivery ID is known
            mSocket?.on("delivery_location_update") { args ->
                if (args.isNotEmpty()) {
                    val data = args[0] as JSONObject
                    Log.d("SocketManager", "Received delivery_location_update: $data")
                    CoroutineScope(Dispatchers.IO).launch {
                        _courierLocationUpdates.emit(data)
                    }
                }
            }

            mSocket?.connect()
        } catch (e: URISyntaxException) {
            Log.e("SocketManager", "Socket URI Error: ${e.message}")
        }
    }

    fun disconnect() {
        mSocket?.disconnect()
        mSocket = null
    }

    /**
     * Join a specific delivery room for more granular tracking
     */
    fun trackDelivery(deliveryId: String) {
        val data = JSONObject()
        data.put("role", "delivery")
        data.put("id", deliveryId)
        mSocket?.emit("join", data)
        Log.d("SocketManager", "Joined delivery tracking room: delivery_$deliveryId")
    }
}
