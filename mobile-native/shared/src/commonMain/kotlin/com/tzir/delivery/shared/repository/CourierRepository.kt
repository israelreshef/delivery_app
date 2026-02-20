
package com.tzir.delivery.shared.repository

import com.tzir.delivery.shared.db.TzirDatabase
import com.tzir.delivery.shared.model.Mission
import com.tzir.delivery.shared.model.CourierStats
import com.tzir.delivery.shared.network.DeliveryApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.datetime.Clock
import kotlinx.coroutines.launch

class CourierRepository(
    private val api: DeliveryApi,
    private val database: TzirDatabase
) {
    // Expose api for direct calls if absolutely needed, but better to wrap
    fun getApi() = api
    private val queries = database.tzirDatabaseQueries

    private val _availableMissions = MutableStateFlow<List<Mission>>(emptyList())
    val availableMissions: StateFlow<List<Mission>> = _availableMissions.asStateFlow()

    private val _activeMissions = MutableStateFlow<List<Mission>>(emptyList())
    val activeMissions: StateFlow<List<Mission>> = _activeMissions.asStateFlow()

    private val _missionHistory = MutableStateFlow<List<com.tzir.delivery.shared.model.Mission>>(emptyList())
    val missionHistory: StateFlow<List<com.tzir.delivery.shared.model.Mission>> = _missionHistory.asStateFlow()

    private val _stats = MutableStateFlow<CourierStats?>(null)
    val stats: StateFlow<CourierStats?> = _stats.asStateFlow()

    private val _isOffline = MutableStateFlow(false)
    val isOffline: StateFlow<Boolean> = _isOffline.asStateFlow()

    init {
        loadFromCache()
        kotlinx.coroutines.MainScope().launch {
            syncPendingUpdates()
        }
    }

    private fun loadFromCache() {
        _availableMissions.value = queries.getAvailableMissions().executeAsList().map { it.toMission() }
        _activeMissions.value = queries.getActiveMissions().executeAsList().map { it.toMission() }
        _missionHistory.value = queries.getHistory().executeAsList().map { it.toMission() }
    }

    suspend fun refreshAvailableMissions() {
        try {
            val missions = api.getAvailableOrders()
            _availableMissions.value = missions
            _isOffline.value = false
            
            queries.transaction {
                queries.clearAvailableMissions()
                missions.forEach { mission ->
                    queries.insertMission(
                        id = mission.id.toLong(),
                        orderNumber = mission.orderNumber,
                        status = mission.status,
                        pickupAddress = mission.pickupAddress,
                        deliveryAddress = mission.deliveryAddress,
                        estimatedPrice = mission.estimatedPrice.toString(),
                        packageDescription = mission.packageDescription,
                        isAvailable = 1L,
                        isActive = 0L,
                        distanceKm = mission.distanceKm,
                        durationMins = mission.durationMins?.toLong(),
                        baseFare = mission.baseFare,
                        tip = mission.tip
                    )
                }
            }
        } catch (e: Exception) {
            _isOffline.value = true
            e.printStackTrace()
        }
    }

    suspend fun refreshActiveMissions() {
        try {
            val mission = api.getActiveOrder()
            _activeMissions.value = if (mission != null) listOf(mission) else emptyList()
            _isOffline.value = false
            
            if (mission != null) {
                queries.insertMission(
                    id = mission.id.toLong(),
                    orderNumber = mission.orderNumber,
                    status = mission.status,
                    pickupAddress = mission.pickupAddress,
                    deliveryAddress = mission.deliveryAddress,
                    estimatedPrice = mission.estimatedPrice.toString(),
                    packageDescription = mission.packageDescription,
                    isAvailable = 0L,
                    isActive = 1L,
                    distanceKm = mission.distanceKm,
                    durationMins = mission.durationMins?.toLong(),
                    baseFare = mission.baseFare,
                    tip = mission.tip
                )
            }
        } catch (e: Exception) {
            _isOffline.value = true
            e.printStackTrace()
        }
    }

    suspend fun refreshMissionHistory() {
        try {
            val history = api.getMissionHistory()
            _missionHistory.value = history
            _isOffline.value = false
            
            queries.transaction {
                queries.clearHistory()
                history.forEach { item ->
                    queries.insertHistoryItem(
                        id = item.id.toLong(),
                        orderNumber = item.orderNumber,
                        completedAt = item.completedAt,
                        pickupAddress = item.pickupAddress,
                        deliveryAddress = item.deliveryAddress,
                        earning = item.estimatedPrice,
                        distanceKm = item.distanceKm,
                        durationMins = item.durationMins?.toLong(),
                        baseFare = item.baseFare,
                        tip = item.tip
                    )
                }
            }
        } catch (e: Exception) {
            _isOffline.value = true
            e.printStackTrace()
        }
    }

    suspend fun refreshStats(courierId: Int) {
        try {
            val newStats = api.getCourierStats(courierId)
            _stats.value = newStats
            _isOffline.value = false
            
            queries.insertStats(
                id = courierId.toLong(),
                balance = newStats.balance.toString(),
                totalDeliveries = newStats.totalDeliveries.toLong(),
                todayEarnings = newStats.todayEarnings.toString(),
                weeklyEarnings = newStats.weeklyEarnings.toString(),
                rating = newStats.rating,
                performanceIndex = newStats.performanceIndex,
                rankBadge = newStats.rankBadge
            )
        } catch (e: Exception) {
            _isOffline.value = true
            val cached = queries.getStats(courierId.toLong()).executeAsOneOrNull()
            if (cached != null) {
                _stats.value = CourierStats(
                    totalDeliveries = cached.totalDeliveries.toInt(),
                    balance = cached.balance.toDoubleOrNull() ?: 0.0,
                    todayEarnings = cached.todayEarnings.toDoubleOrNull() ?: 0.0,
                    weeklyEarnings = cached.weeklyEarnings.toDoubleOrNull() ?: 0.0,
                    rating = cached.rating,
                    performanceIndex = cached.performanceIndex,
                    rankBadge = cached.rankBadge
                )
            }
        }
    }

    suspend fun acceptMission(missionId: Int): Boolean {
        return try {
            val success = api.acceptOrder(missionId)
            if (success) {
                refreshAvailableMissions()
                refreshActiveMissions()
            }
            success
        } catch (e: Exception) {
            false
        }
    }

    suspend fun updateMissionStatus(
        missionId: Int, 
        status: String, 
        lat: Double? = null, 
        lng: Double? = null, 
        podSignature: String? = null,
        podImage: String? = null
    ): Boolean {
        return try {
            val success = api.updateStatus(missionId, status, lat, lng, podSignature, podImage)
            if (success) {
                refreshActiveMissions()
            } else {
                queueSync(missionId, status, podSignature, podImage)
            }
            success
        } catch (e: Exception) {
            queueSync(missionId, status, podSignature, podImage)
            false
        }
    }

    private fun queueSync(missionId: Int, status: String, podSignature: String?, podImage: String?) {
        queries.addToSyncQueue(
            missionId = missionId.toLong(),
            newStatus = status,
            podSignature = podSignature,
            podImage = podImage,
            timestamp = Clock.System.now().toEpochMilliseconds()
        )
    }

    suspend fun syncPendingUpdates() {
        val pending = queries.getSyncQueue().executeAsList()
        if (pending.isEmpty()) return
        
        pending.forEach { item ->
            try {
                val success = api.updateStatus(
                    orderId = item.missionId.toInt(), 
                    status = item.newStatus, 
                    podSignature = item.podSignature,
                    podImage = item.podImage
                )
                if (success) {
                    queries.deleteSyncItem(item.id)
                }
            } catch (e: Exception) {
                // Network still down
            }
        }
        refreshActiveMissions()
    }

    suspend fun uploadImage(imageBytes: ByteArray): String? {
        return try {
            api.uploadImage(imageBytes)
        } catch (e: Exception) {
            null
        }
    }

    suspend fun submitRating(orderId: Int, rating: Int, comment: String): Boolean {
        return try {
            api.submitRating(orderId, rating, comment)
        } catch (e: Exception) {
            false
        }
    }

    suspend fun exportEarnings(year: Int, month: Int): ByteArray? {
        return try {
            api.exportEarnings(year, month)
        } catch (e: Exception) {
            null
        }
    }

    suspend fun sendOTP(orderId: Int): Boolean {
        return api.sendOTP(orderId)
    }

    suspend fun verifyOTP(orderId: Int, code: String): Boolean {
        return api.verifyOTP(orderId, code)
    }

    suspend fun getDocuments(): List<Map<String, Any>> {
        return api.getDocuments()
    }

    suspend fun updateAvailability(isAvailable: Boolean): Boolean {
        return try {
            val success = api.updateAvailability(isAvailable)
            // If we're offline, we might want to cache this or retry later
            // For now, we just return success/failure
            success
        } catch (e: Exception) {
            false
        }
    }
}

// Extensions for mapping
private fun com.tzir.delivery.shared.db.CachedMission.toMission() = Mission(
    id = id.toInt(),
    orderNumber = orderNumber,
    status = status,
    pickupAddress = pickupAddress,
    deliveryAddress = deliveryAddress,
    packageDescription = packageDescription,
    estimatedPrice = estimatedPrice.toDoubleOrNull() ?: 0.0,
    distanceKm = distanceKm,
    durationMins = durationMins?.toInt(),
    baseFare = baseFare,
    tip = tip
)

private fun com.tzir.delivery.shared.db.CachedHistory.toMission() = Mission(
    id = id.toInt(),
    orderNumber = orderNumber,
    status = "COMPLETED",
    pickupAddress = pickupAddress,
    deliveryAddress = deliveryAddress,
    packageDescription = "", 
    completedAt = completedAt,
    estimatedPrice = earning,
    distanceKm = distanceKm,
    durationMins = durationMins?.toInt(),
    baseFare = baseFare,
    tip = tip
)
