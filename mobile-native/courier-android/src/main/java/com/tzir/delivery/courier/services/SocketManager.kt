package com.tzir.delivery.courier.services

import android.util.Log
import com.tzir.delivery.courier.network.DeliveryApi
import com.tzir.delivery.courier.network.KtorClientFactory
import com.tzir.delivery.courier.network.TokenManager
import io.socket.client.IO
import io.socket.client.Socket
import io.socket.engineio.client.transports.WebSocket
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.long
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.net.URISyntaxException
import java.util.Base64

object SocketManager {
    private var mSocket: Socket? = null
    private val _routeUpdates = MutableSharedFlow<String>(replay = 1)
    val routeUpdates = _routeUpdates.asSharedFlow()
    
    private val _missionUpdates = MutableSharedFlow<Unit>(extraBufferCapacity = 1)
    val missionUpdates = _missionUpdates.asSharedFlow()
    
    private val _walletUpdates = MutableSharedFlow<String>(extraBufferCapacity = 1)
    val walletUpdates = _walletUpdates.asSharedFlow()
    
    private val _newOrderEvents = MutableSharedFlow<String>(extraBufferCapacity = 1)
    val newOrderEvents = _newOrderEvents.asSharedFlow()
    
    private val _connectionState = MutableStateFlow(false)
    val connectionState: StateFlow<Boolean> = _connectionState.asStateFlow()
    
    private val _joined = MutableStateFlow(false)
    val joined: StateFlow<Boolean> = _joined.asStateFlow()
    
    private var currentAvailabilityStatus: Boolean = false
    private var currentCourierId: String? = null
    
    private var syncCallback: (suspend () -> Unit)? = null
    
    private var _pendingRejoin = false
    
    private val json = Json { ignoreUnknownKeys = true }
    
    // Emulator reaches the host machine via 10.0.2.2 (not localhost/LAN IP)
    private val SOCKET_URL: String = KtorClientFactory.resolveBaseUrl()
    private var mContext: android.content.Context? = null

    interface MessageListener {
        fun onIncomingTicketMessage(ticketId: Int, text: String, isFromAgent: Boolean, senderName: String? = null)
    }

    private val messageListeners = mutableListOf<MessageListener>()

    fun init(context: android.content.Context) {
        mContext = context.applicationContext
    }

    /**
     * Subscribe the UI to realtime support messages. The listener is invoked for
     * every inbound message; the UI should filter by the ticket it is showing.
     */
    fun addMessageListener(listener: MessageListener) {
        messageListeners.add(listener)
    }

    fun removeMessageListener(listener: MessageListener) {
        messageListeners.remove(listener)
    }

    fun setMessageListener(listener: MessageListener) {
        messageListeners.clear()
        messageListeners.add(listener)
    }

    private fun notifyIncomingTicketMessage(ticketId: Int, text: String, isFromAgent: Boolean, senderName: String?) {
        if (messageListeners.isEmpty()) return
        CoroutineScope(Dispatchers.Main).launch {
            messageListeners.forEach { it.onIncomingTicketMessage(ticketId, text, isFromAgent, senderName) }
        }
    }

    /**
     * Join the realtime room of a specific support ticket so this client receives
     * inbound messages pushed by the backend.
     */
    fun joinSupportRoom(ticketId: Int, userId: String) {
        if (mSocket == null || !mSocket!!.connected()) {
            connect(userId)
        }
        try {
            val data = JSONObject()
            data.put("role", "courier")
            data.put("user_id", userId)
            data.put("ticket_id", ticketId)
            mSocket?.emit("join_support", data)
            mSocket?.emit("join_ticket_room", data)
            Log.d("SocketManager", "Joined support room for ticket $ticketId")
        } catch (e: Exception) {
            Log.e("SocketManager", "Failed to join support room: ${e.message}")
        }
    }

    fun leaveSupportRoom(ticketId: Int) {
        try {
            val data = JSONObject()
            data.put("ticket_id", ticketId)
            mSocket?.emit("leave_ticket_room", data)
        } catch (e: Exception) {
            Log.e("SocketManager", "Failed to leave support room: ${e.message}")
        }
    }

    fun setAvailabilityStatus(isAvailable: Boolean, courierId: String) {
        currentAvailabilityStatus = isAvailable
        currentCourierId = courierId
        
        if (mSocket != null && mSocket!!.connected()) {
            emitAvailabilityChange(isAvailable, courierId)
        }
    }

    fun registerSyncCallback(callback: suspend () -> Unit) {
        syncCallback = callback
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

    /**
     * Decode the payload of a JWT and return the `exp` claim (epoch seconds), or null.
     */
    private fun getJwtExpiry(token: String): Long? {
        return try {
            val parts = token.split(".")
            if (parts.size < 2) return null
            val payload = String(Base64.getUrlDecoder().decode(parts[1]))
            val json = Json.parseToJsonElement(payload).jsonObject
            json["exp"]?.jsonPrimitive?.long
        } catch (e: Exception) {
            null
        }
    }

    fun connectForSupportChat(courierId: String, sessionId: String? = null) {
        currentCourierId = courierId
        connect(courierId)
        
        try {
            val joinData = JSONObject()
            joinData.put("role", "courier")
            joinData.put("user_id", courierId)
            joinData.put("session_id", sessionId)
            joinData.put("token", TokenManager.token)
            mSocket?.emit("join_chat", joinData)
            Log.d("SocketManager", "Joined support chat room for courier $courierId")
        } catch (e: Exception) {
            Log.e("SocketManager", "Failed to join support chat: ${e.message}")
        }
    }

    fun sendSupportMessage(sessionId: String, message: String) {
        try {
            val data = JSONObject()
            data.put("session_id", sessionId)
            data.put("sender_id", currentCourierId)
            data.put("message", message)
            mSocket?.emit("send_message", data)
            Log.d("SocketManager", "Sent support message: $message")
        } catch (e: Exception) {
            Log.e("SocketManager", "Failed to send support message: ${e.message}")
        }
    }

    /**
     * If the current access token is expired (or expires within 30 s), perform a
     * synchronous refresh call against the backend and persist the new tokens.
     * Returns `true` if a valid (fresh) token is available on exit.
     */
    @Synchronized
    private fun ensureFreshToken(): Boolean {
        val token = TokenManager.token
        if (!token.isNullOrEmpty()) {
            val exp = getJwtExpiry(token)
            if (exp != null && exp * 1000 > System.currentTimeMillis() + 30_000) {
                return true
            }
        }

        val refreshToken = TokenManager.getRefreshToken()
        if (refreshToken.isNullOrEmpty()) return false

        return try {
            val url = URL("${SOCKET_URL}/api/auth/refresh")
            val conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "POST"
            conn.setRequestProperty("Authorization", "Bearer $refreshToken")
            conn.setRequestProperty("Content-Type", "application/json")
            conn.doOutput = false
            conn.connectTimeout = 10_000
            conn.readTimeout = 10_000

            if (conn.responseCode == 200) {
                val body = conn.inputStream.bufferedReader().readText()
                val json = Json.parseToJsonElement(body).jsonObject
                val newAccess = json["access_token"]?.jsonPrimitive?.content ?: return false
                val newRefresh = json["refresh_token"]?.jsonPrimitive?.content ?: return false
                TokenManager.saveToken(newAccess)
                TokenManager.saveRefreshToken(newRefresh)
                true
            } else {
                Log.e("SocketManager", "Token refresh returned ${conn.responseCode}")
                false
            }
        } catch (e: Exception) {
            Log.e("SocketManager", "Token refresh call failed", e)
            false
        }
    }

    fun connect(courierId: String) {
        currentCourierId = courierId
        if (mSocket != null && mSocket!!.connected()) {
            return
        }

        ensureFreshToken()

        try {
            val options = IO.Options().apply {
                forceNew = true
                reconnection = true
                reconnectionAttempts = 10
                reconnectionDelay = 2000
                reconnectionDelayMax = 30000
                timeout = 10000

                val currentToken = TokenManager.token
                if (!currentToken.isNullOrEmpty()) {
                    auth = mapOf("token" to currentToken)
                }
                transports = arrayOf(WebSocket.NAME)
            }
            
            mSocket = IO.socket(SOCKET_URL, options)

            mSocket?.on(Socket.EVENT_CONNECT) {
                _connectionState.value = true
                _joined.value = false
                _pendingRejoin = false
                Log.d("SocketManager", "Connected to WebSocket Server")
                try {
                    val joinData = JSONObject()
                    joinData.put("role", "courier")
                    joinData.put("id", courierId)
                    val token = TokenManager.token
                    if (token != null) {
                        joinData.put("token", token)
                    }
                    mSocket?.emit("join", joinData)
                    
                    // Join support chat room
                    val chatData = JSONObject()
                    chatData.put("role", "courier")
                    chatData.put("courier_id", courierId)
                    chatData.put("token", token)
                    mSocket?.emit("join_chat", chatData)
                    
                    emitAvailabilityChange(currentAvailabilityStatus, courierId)
                    CoroutineScope(Dispatchers.IO).launch {
                        syncCallback?.invoke()
                    }
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }

            mSocket?.on("joined") {
                _joined.value = true
                _pendingRejoin = false
                Log.d("SocketManager", "Successfully joined courier room")
            }

            // Listen for chat messages from support agents
            mSocket?.on("new_message") { args ->
                args.firstOrNull()?.let { messageData ->
                    Log.d("SocketManager", "Received new_message: $messageData")
                    try {
                        val json = if (messageData is JSONObject) messageData else JSONObject(messageData.toString())
                        val text = json.optString("message", "")
                        val senderId = json.optString("sender_id", "")
                        val isAgent = senderId != currentCourierId
                        if (text.isNotBlank()) {
                            notifyIncomingTicketMessage(-1, text, isAgent, null)
                        }
                    } catch (e: Exception) {
                        Log.e("SocketManager", "Failed to parse new_message", e)
                    }
                    CoroutineScope(Dispatchers.IO).launch {
                        _missionUpdates.emit(Unit)
                    }
                }
            }

            // Listen for support-ticket messages (the modern realtime channel)
            mSocket?.on("ticket_message_added") { args ->
                args.firstOrNull()?.let { messageData ->
                    Log.d("SocketManager", "Received ticket_message_added: $messageData")
                    try {
                        val json = if (messageData is JSONObject) messageData else JSONObject(messageData.toString())
                        val ticketId = json.optInt("ticket_id", -1)
                        val text = json.optString("message", "")
                        val senderId = json.optString("sender_id", "")
                        val senderName = json.optString("sender_name", null)
                        val isStaff = json.optBoolean("is_staff", false)
                        val isAgent = isStaff || senderId != currentCourierId
                        if (ticketId > 0 && text.isNotBlank()) {
                            notifyIncomingTicketMessage(ticketId, text, isAgent, senderName)
                        }
                    } catch (e: Exception) {
                        Log.e("SocketManager", "Failed to parse ticket_message_added", e)
                    }
                }
            }

            // Listen for agent responses (legacy chat-session events)
            mSocket?.on("response_message") { args ->
                args.firstOrNull()?.let { responseData ->
                    Log.d("SocketManager", "Received response_message: $responseData")
                    try {
                        val json = if (responseData is JSONObject) responseData else JSONObject(responseData.toString())
                        val text = json.optString("message", "")
                        if (text.isNotBlank()) {
                            notifyIncomingTicketMessage(-1, text, true, json.optString("sender_name", null))
                        }
                    } catch (e: Exception) {
                        Log.e("SocketManager", "Failed to parse response_message", e)
                    }
                    CoroutineScope(Dispatchers.IO).launch {
                        _missionUpdates.emit(Unit)
                    }
                }
            }

            // Listen for agent join events
            mSocket?.on("admin_joined") { args ->
                args.firstOrNull()?.let { adminData ->
                    Log.d("SocketManager", "Received admin_joined: $adminData")
                    CoroutineScope(Dispatchers.IO).launch {
                        _missionUpdates.emit(Unit)
                    }
                }
            }

            // Listen for session created events
            mSocket?.on("session_created") { args ->
                args.firstOrNull()?.let { sessionData ->
                    Log.d("SocketManager", "Received session_created: $sessionData")
                    CoroutineScope(Dispatchers.IO).launch {
                        _missionUpdates.emit(Unit)
                    }
                }
            }

            mSocket?.on("route_updated") { args ->
                if (args.isNotEmpty()) {
                    val data = args[0].toString()
                    Log.d("SocketManager", "Received route_updated event: $data")
                    CoroutineScope(Dispatchers.IO).launch {
                        _routeUpdates.emit(data)
                    }
                }
            }

            mSocket?.on("new_assignment") {
                Log.d("SocketManager", "Received new_assignment event")
                CoroutineScope(Dispatchers.IO).launch {
                    _missionUpdates.emit(Unit)
                }
            }

            mSocket?.on("order_assigned_to_you") { args ->
                val data = if (args.isNotEmpty()) args[0].toString() else "{}"
                Log.d("SocketManager", "Received order_assigned_to_you event: $data")
                CoroutineScope(Dispatchers.IO).launch {
                    _missionUpdates.emit(Unit)
                }
            }

            mSocket?.on("new_order_available") { args ->
                val data = if (args.isNotEmpty()) args[0].toString() else ""
                Log.d("SocketManager", "Received new_order_available event")
                CoroutineScope(Dispatchers.IO).launch {
                    _newOrderEvents.emit(data)
                }
            }

            mSocket?.on("delivery_status_update") {
                Log.d("SocketManager", "Received delivery_status_update event")
                CoroutineScope(Dispatchers.IO).launch {
                    _missionUpdates.emit(Unit)
                }
            }

            mSocket?.on("wallet_update") { args ->
                val data = if (args.isNotEmpty()) args[0].toString() else "{}"
                Log.d("SocketManager", "Received wallet_update event: $data")
                CoroutineScope(Dispatchers.IO).launch {
                    _walletUpdates.emit(data)
                }
            }

            mSocket?.on(Socket.EVENT_DISCONNECT) {
                _connectionState.value = false
                _joined.value = false
                Log.d("SocketManager", "Disconnected from WebSocket Server")
            }

            mSocket?.on(Socket.EVENT_CONNECT_ERROR) { args ->
                val error = if (args.isNotEmpty()) args[0].toString() else "Unknown error"
                Log.e("SocketManager", "Socket Connection Error: $error")
            }

            mSocket?.on("error") { args ->
                val error = if (args.isNotEmpty()) args[0].toString() else "Unknown error"
                Log.e("SocketManager", "Socket Server Error: $error")
                if (error.contains("Authentication", ignoreCase = true) ||
                    error.contains("auth", ignoreCase = true) ||
                    error.contains("token", ignoreCase = true) ||
                    error.contains("expired", ignoreCase = true)) {
                    _pendingRejoin = true
                    rejoin()
                }
            }

            mSocket?.connect()
            Log.d("SocketManager", "Initiating socket connection to $SOCKET_URL for courier_$courierId...")

        } catch (e: URISyntaxException) {
            Log.e("SocketManager", "Socket URI Error: ${e.message}")
        }
    }

    fun rejoin() {
        if (!ensureFreshToken()) {
            Log.e("SocketManager", "Rejoin aborted — cannot obtain a fresh token")
            return
        }
        val token = TokenManager.token ?: return
        val courierId = currentCourierId ?: return
        try {
            val joinData = JSONObject()
            joinData.put("role", "courier")
            joinData.put("id", courierId)
            joinData.put("token", token)
            mSocket?.emit("join", joinData)
            Log.d("SocketManager", "Rejoining courier room with fresh token")
        } catch (e: Exception) {
            Log.e("SocketManager", "Rejoin error: ${e.message}")
        }
    }

    fun notifyTokenRefreshed() {
        if (_pendingRejoin && mSocket?.connected() == true) {
            Log.d("SocketManager", "Token refreshed, attempting rejoin")
            rejoin()
        }
    }

    fun disconnect() {
        mSocket?.disconnect()
        mSocket = null
        Log.d("SocketManager", "Socket connection terminated.")
    }

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
            
            Log.d("SocketManager", "Emitting live location: $lat, $lng")
            mSocket?.emit("courier_location_update", data)
        } catch (e: Exception) {
            Log.e("SocketManager", "Error emitting location: ${e.message}")
        }
    }
}
