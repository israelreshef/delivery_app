
package com.tzir.delivery.shared.repository

import com.tzir.delivery.shared.db.TzirDatabase
import com.tzir.delivery.shared.model.*
import com.tzir.delivery.shared.network.DeliveryApi
import io.ktor.client.HttpClient
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.datetime.Clock
import kotlinx.coroutines.launch
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonArray

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

    private val _academyProtocolCourses = MutableStateFlow<List<Map<String, Any>>>(emptyList())
    val academyProtocolCourses: StateFlow<List<Map<String, Any>>> = _academyProtocolCourses.asStateFlow()

    private val _myCertifications = MutableStateFlow<List<Map<String, Any>>>(emptyList())
    val myCertifications: StateFlow<List<Map<String, Any>>> = _myCertifications.asStateFlow()

    private val _shiftStatus = MutableStateFlow<JsonElement?>(null)
    val shiftStatus: StateFlow<JsonElement?> = _shiftStatus.asStateFlow()

    private val _gamificationProfile = MutableStateFlow<Map<String, Any>?>(null)
    val gamificationProfile: StateFlow<Map<String, Any>?> = _gamificationProfile.asStateFlow()

    private val _academyCourses = MutableStateFlow<List<Map<String, Any>>>(emptyList())
    val academyCourses: StateFlow<List<Map<String, Any>>> = _academyCourses.asStateFlow()

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
                        tip = mission.tip,
                        protocolSlug = mission.protocolSlug
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
                    tip = mission.tip,
                    protocolSlug = mission.protocolSlug
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
            } else {
                handleOfflineAcceptance(missionId)
            }
            success
        } catch (e: Exception) {
            handleOfflineAcceptance(missionId)
            false
        }
    }

    private fun handleOfflineAcceptance(missionId: Int) {
        val mission = _availableMissions.value.find { it.id == missionId }
        mission?.let {
            queueSync(missionId, "accepted", null, null)
            _activeMissions.value = listOf(
                Mission(
                    id = it.id,
                    orderNumber = it.orderNumber,
                    status = "accepted",
                    pickupAddress = it.pickupAddress,
                    deliveryAddress = it.deliveryAddress,
                    packageDescription = it.packageDescription,
                    estimatedPrice = it.estimatedPrice,
                    completedAt = it.completedAt,
                    distanceKm = it.distanceKm,
                    durationMins = it.durationMins,
                    baseFare = it.baseFare,
                    tip = it.tip
                )
            )
            _availableMissions.value = _availableMissions.value.filter { m -> m.id != missionId }
        }
    }

    suspend fun optimizeRoute(lat: Double, lng: Double): JsonElement? {
        return try {
            val result = api.optimizeRoute(lat, lng)
            if (result.success) result.data else null
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

    suspend fun optimizeManualRoute(lat: Double, lng: Double, stops: List<Map<String, Any?>>): JsonElement? {
        return try {
            val stopModels = stops.map { s ->
                Stop(
                    address = s["address"] as? String,
                    lat = s["lat"] as? Double,
                    lng = s["lng"] as? Double,
                    type = s["stop_type"] as? String
                )
            }
            val result = api.optimizeManualRoute(ManualRouteRequest(lat, lng, stopModels))
            if (result.success) result.data else null
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

    suspend fun autocompleteAddress(query: String): List<AutocompleteSuggestion> {
        println("DEBUG: CourierRepository - Querying autocomplete for: '$query'")
        return api.autocompleteAddress(query)
    }

    suspend fun geocodeAddress(query: String? = null, placeId: String? = null): GeocodeResult? {
        return api.geocodeAddress(query, placeId)
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
            val request = StatusUpdateRequest(status, lat, lng, podSignature, podImage)
            val success = api.updateStatus(missionId, request)
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
                val request = StatusUpdateRequest(
                    status = item.newStatus,
                    podSignature = item.podSignature,
                    podImage = item.podImage
                )
                val success = api.updateStatus(item.missionId.toInt(), request)
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
            api.submitRating(orderId, RatingRequest(rating, comment))
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
        return api.verifyOTP(orderId, OtpVerifyRequest(code))
    }

    suspend fun getDocuments(): List<Map<String, Any>> {
        return api.getDocuments()
    }

    suspend fun updateAvailability(isAvailable: Boolean): Boolean {
        return try {
            val success = api.updateAvailability(AvailabilityRequest(isAvailable))
            success
        } catch (e: Exception) {
            false
        }
    }

    suspend fun startShift(vibe: String): Boolean {
        return try {
            val result = api.startShift(ShiftStartRequest(vibe))
            if (result.success) {
                refreshShiftStatus()
            }
            result.success
        } catch (e: Exception) {
            false
        }
    }

    suspend fun refreshShiftStatus() {
        try {
            val result = api.getShiftStatus()
            if (result.success) {
                _shiftStatus.value = result.data
            }
        } catch (e: Exception) {
            // keep old state or handle error
        }
    }

    suspend fun refreshGamificationProfile() {
        try {
            val response = api.getGamificationProfile()
            _gamificationProfile.value = response
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    suspend fun getGamificationLeaderboard(): List<Map<String, Any>> {
        return try {
            api.getGamificationLeaderboard()
        } catch (e: Exception) {
            e.printStackTrace()
            emptyList()
        }
    }

    suspend fun refreshAcademyCourses() {
        try {
            val response = api.getAcademyCourses()
            _academyCourses.value = response
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    suspend fun getCourseDetails(courseId: Int): Map<String, Any> {
        return try {
            api.getCourseDetails(courseId)
        } catch (e: Exception) {
            e.printStackTrace()
            emptyMap()
        }
    }

    suspend fun completeCourseQuiz(courseId: Int): Boolean {
        return try {
            val response = api.completeCourseQuiz(courseId, 100) // Mock score 100
            // Refresh courses + gamification profile after completion
            refreshAcademyCourses()
            refreshGamificationProfile()
            response["success"] as? Boolean == true
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

    // --- New Protocol Methods ---
    
    suspend fun getProtocolSteps(orderId: Int): List<Map<String, Any>> {
        return api.getProtocolSteps(orderId)
    }

    suspend fun completeProtocolStep(orderId: Int, step: Int, actionData: Map<String, String>): Boolean {
        return api.completeProtocolStep(orderId, step, actionData)
    }

    // --- New Academy Protocol Methods ---

    suspend fun refreshAcademyProtocolCourses() {
        try {
            val response = api.getAcademyProtocolCourses()
            _academyProtocolCourses.value = response
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    suspend fun getAcademyProtocolCourseContent(courseId: Int): Map<String, Any> {
        return api.getAcademyProtocolCourseContent(courseId)
    }

    suspend fun getAcademyProtocolLesson(courseId: Int, lessonId: Int): Map<String, Any> {
        return api.getAcademyProtocolLesson(courseId, lessonId)
    }

    suspend fun getAcademyProtocolQuizQuestions(courseId: Int): List<Map<String, Any>> {
        return api.getAcademyProtocolQuizQuestions(courseId)
    }

    suspend fun submitAcademyProtocolQuiz(courseId: Int, answers: List<Map<String, Int>>): Map<String, Any> {
        return try {
            val response = api.submitAcademyProtocolQuiz(courseId, answers)
            refreshAcademyProtocolCourses()
            refreshGamificationProfile()
            response
        } catch (e: Exception) {
            mapOf("error" to (e.message ?: "Unknown error"))
        }
    }

    suspend fun refreshMyCertifications() {
        try {
            val response = api.getMyCertifications()
            _myCertifications.value = response
        } catch (e: Exception) {
            e.printStackTrace()
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
    tip = tip,
    protocolSlug = protocolSlug
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
    tip = tip,
    protocolSlug = null
)
