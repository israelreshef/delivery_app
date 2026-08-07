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

    private var currentCustomerId: String? = null

    // Emulator reaches the host machine via 10.0.2.2 (not localhost/LAN IP)
    private val SOCKET_URL = KtorClientFactory.resolveBaseUrl()

    interface MessageListener {
        fun onIncomingTicketMessage(ticketId: Int, text: String, isFromAgent: Boolean, senderName: String? = null)
    }

    private val messageListeners = mutableListOf<MessageListener>()

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
    fun joinSupportRoom(ticketId: Int, customerId: String) {
        if (mSocket == null || !mSocket!!.connected()) {
            connect(customerId)
        }
        try {
            val data = JSONObject()
            data.put("role", "customer")
            data.put("user_id", customerId)
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

    fun connect(customerId: String) {
        currentCustomerId = customerId
        if (mSocket != null && mSocket!!.connected()) return

        try {
            val options = IO.Options()
            options.forceNew = true
            options.reconnection = true

            val currentToken = TokenManager.token
            if (!currentToken.isNullOrEmpty()) {
                options.auth = mapOf("token" to currentToken)
            }

            mSocket = IO.socket(SOCKET_URL, options)

            mSocket?.on(Socket.EVENT_CONNECT) {
                Log.d("SocketManager", "Customer connected to WebSocket")
                val joinData = JSONObject()
                joinData.put("role", "customer")
                joinData.put("customer_id", customerId)
                joinData.put("token", currentToken)
                mSocket?.emit("join", joinData)

                // Customer joins support chat room
                val chatData = JSONObject()
                chatData.put("role", "customer")
                chatData.put("user_id", customerId)
                chatData.put("token", currentToken)
                mSocket?.emit("join_chat", chatData)
                mSocket?.emit("join_support", chatData)
            }

            // Listen for chat messages from support agents
            mSocket?.on("new_message") { args ->
                if (args.isNotEmpty()) {
                    val data = args[0] as JSONObject
                    Log.d("SocketManager", "Received new_message: $data")
                    try {
                        val text = data.optString("message", "")
                        val senderId = data.optString("sender_id", "")
                        if (text.isNotBlank()) {
                            notifyIncomingTicketMessage(-1, text, senderId != currentCustomerId, null)
                        }
                    } catch (e: Exception) {
                        Log.e("SocketManager", "Failed to parse new_message", e)
                    }
                    CoroutineScope(Dispatchers.IO).launch {
                        _courierLocationUpdates.emit(data)
                    }
                }
            }

            // Listen for support-ticket messages (the modern realtime channel)
            mSocket?.on("ticket_message_added") { args ->
                if (args.isNotEmpty()) {
                    val data = args[0] as JSONObject
                    Log.d("SocketManager", "Received ticket_message_added: $data")
                    try {
                        val ticketId = data.optInt("ticket_id", -1)
                        val text = data.optString("message", "")
                        val senderId = data.optString("sender_id", "")
                        val senderName = data.optString("sender_name", null)
                        val isStaff = data.optBoolean("is_staff", false)
                        if (ticketId > 0 && text.isNotBlank()) {
                            notifyIncomingTicketMessage(ticketId, text, isStaff || senderId != currentCustomerId, senderName)
                        }
                    } catch (e: Exception) {
                        Log.e("SocketManager", "Failed to parse ticket_message_added", e)
                    }
                }
            }

            // Listen for response messages
            mSocket?.on("response_message") { args ->
                if (args.isNotEmpty()) {
                    val data = args[0] as JSONObject
                    Log.d("SocketManager", "Received response_message: $data")
                    try {
                        val text = data.optString("message", "")
                        if (text.isNotBlank()) {
                            notifyIncomingTicketMessage(-1, text, true, data.optString("sender_name", null))
                        }
                    } catch (e: Exception) {
                        Log.e("SocketManager", "Failed to parse response_message", e)
                    }
                    CoroutineScope(Dispatchers.IO).launch {
                        _courierLocationUpdates.emit(data)
                    }
                }
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

    fun sendChatMessage(sessionId: String, message: String) {
        try {
            val data = JSONObject()
            data.put("session_id", sessionId)
            data.put("sender_id", currentCustomerId ?: "")
            data.put("message", message)
            mSocket?.emit("send_message", data)
            Log.d("SocketManager", "Sent chat message: $message")
        } catch (e: Exception) {
            Log.e("SocketManager", "Failed to send message: ${e.message}")
        }
    }

    /**
     * Join the realtime tracking room for a specific delivery so the customer
     * receives courier location updates for that delivery.
     */
    fun trackDelivery(deliveryId: String) {
        currentCustomerId?.let { connect(it) }
        try {
            val data = JSONObject()
            data.put("delivery_id", deliveryId)
            data.put("token", TokenManager.token)
            mSocket?.emit("join_delivery_room", data)
            Log.d("SocketManager", "Joined delivery tracking room: $deliveryId")
        } catch (e: Exception) {
            Log.e("SocketManager", "Failed to join delivery room: ${e.message}")
        }
    }

    fun startChatSession(customerId: String) {
        try {
            val data = JSONObject()
            data.put("role", "customer")
            data.put("user_id", customerId)
            data.put("token", TokenManager.token)
            mSocket?.emit("start_session", data)
            Log.d("SocketManager", "Started chat session")
        } catch (e: Exception) {
            Log.e("SocketManager", "Failed to start chat session: ${e.message}")
        }
    }

    fun joinChat(sessionId: String) {
        try {
            val data = JSONObject()
            data.put("role", "customer")
            data.put("user_id", currentCustomerId ?: "")
            data.put("session_id", sessionId)
            data.put("token", TokenManager.token)
            mSocket?.emit("join_chat", data)
            Log.d("SocketManager", "Joined chat session: $sessionId")
        } catch (e: Exception) {
            Log.e("SocketManager", "Failed to join chat session: ${e.message}")
        }
    }

    fun disconnect() {
        mSocket?.disconnect()
        mSocket = null
    }
}
