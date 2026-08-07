package com.tzir.delivery.courier.repository

import com.tzir.delivery.courier.model.CourierNotification
import com.tzir.delivery.courier.network.DeliveryApi
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class NotificationRepository(
    private val api: DeliveryApi? = null
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    private val _notifications = MutableStateFlow<List<CourierNotification>>(emptyList())
    val notifications: StateFlow<List<CourierNotification>> = _notifications.asStateFlow()

    private val _unreadCount = MutableStateFlow(0)
    val unreadCount: StateFlow<Int> = _unreadCount.asStateFlow()

    private val _isOffline = MutableStateFlow(false)
    val isOffline: StateFlow<Boolean> = _isOffline.asStateFlow()

    private val _loading = MutableStateFlow(false)
    val loading: StateFlow<Boolean> = _loading.asStateFlow()

    suspend fun refresh() {
        _loading.value = true
        try {
            api?.let {
                val response = it.getMyNotifications()
                _notifications.value = response.data
                val unread = response.data.count { !it.isRead }
                _unreadCount.value = unread
            }
            _isOffline.value = false
        } catch (e: Exception) {
            _isOffline.value = true
        } finally {
            _loading.value = false
        }
    }

    fun markRead(notificationId: Int) {
        scope.launch {
            try {
                api?.markNotificationRead(notificationId)
                _notifications.value = _notifications.value.map {
                    if (it.id == notificationId) it.copy(isRead = true) else it
                }
                _unreadCount.value = _notifications.value.count { !it.isRead }
            } catch (_: Exception) { }
        }
    }

    fun markAllRead() {
        scope.launch {
            try {
                api?.markAllNotificationsRead()
                _notifications.value = _notifications.value.map { it.copy(isRead = true) }
                _unreadCount.value = 0
            } catch (_: Exception) { }
        }
    }

    fun clear() {
        _notifications.value = emptyList()
        _unreadCount.value = 0
    }
}
