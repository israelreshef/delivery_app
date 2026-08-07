package com.tzir.delivery.courier.services

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import com.tzir.delivery.courier.database.PendingActionDao
import com.tzir.delivery.courier.database.PendingActionEntity
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SyncManager @Inject constructor(
    private val pendingActionDao: PendingActionDao
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    private val _isSyncing = MutableStateFlow(false)
    val isSyncing: StateFlow<Boolean> = _isSyncing.asStateFlow()

    private val _pendingCount = MutableStateFlow(0)
    val pendingCount: StateFlow<Int> = _pendingCount.asStateFlow()

    private val actionHandlers = mutableMapOf<String, suspend (PendingActionEntity) -> Boolean>()

    fun registerHandler(actionType: String, handler: suspend (PendingActionEntity) -> Boolean) {
        actionHandlers[actionType] = handler
    }

    fun enqueue(actionType: String, endpoint: String, payloadJson: String, httpMethod: String) {
        scope.launch {
            pendingActionDao.insert(
                PendingActionEntity(
                    actionType = actionType,
                    endpoint = endpoint,
                    payloadJson = payloadJson,
                    httpMethod = httpMethod
                )
            )
            refreshCount()
        }
    }

    suspend fun processQueue(): Int {
        if (_isSyncing.value) return 0
        _isSyncing.value = true
        var processed = 0
        try {
            val pending = pendingActionDao.getPendingActions()
            for (action in pending) {
                val handler = actionHandlers[action.actionType]
                val success = handler?.invoke(action) ?: false
                if (success) {
                    pendingActionDao.delete(action)
                    processed++
                } else {
                    val newStatus = if (action.retryCount >= action.maxRetries) "failed" else "pending"
                    pendingActionDao.markAttempted(action.id, newStatus)
                }
            }
        } catch (_: Exception) {
        } finally {
            refreshCount()
            _isSyncing.value = false
        }
        return processed
    }

    suspend fun getPendingCount(): Int = pendingActionDao.getPendingCount()

    fun observeConnectivity(context: Context) {
        val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val callback = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) {
                scope.launch {
                    delay(2000)
                    processQueue()
                }
            }
        }
        val request = NetworkRequest.Builder()
            .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            .build()
        connectivityManager.registerNetworkCallback(request, callback)
    }

    private fun refreshCount() {
        scope.launch { _pendingCount.value = pendingActionDao.getPendingCount() }
    }
}
