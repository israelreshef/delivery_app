package com.tzir.delivery.courier.repository

import com.tzir.delivery.courier.database.AcademyCourseEntity
import com.tzir.delivery.courier.database.CourierStatsEntity
import com.tzir.delivery.courier.database.GamificationProfileEntity
import com.tzir.delivery.courier.database.MissionEntity
import com.tzir.delivery.courier.database.TzirDatabase
import com.tzir.delivery.courier.model.*
import com.tzir.delivery.courier.network.DeliveryApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.boolean
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.double
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.int
import kotlinx.serialization.json.intOrNull

class CourierRepository(
    private val api: DeliveryApi,
    private val database: TzirDatabase? = null
) {
    fun getApi() = api

    companion object {
        private var instance: CourierRepository? = null
        fun getInstance(api: DeliveryApi, database: TzirDatabase? = null): CourierRepository {
            return instance ?: synchronized(this) {
                instance ?: CourierRepository(api, database).also { instance = it }
            }
        }
    }

    private val _availableMissions = MutableStateFlow<List<Mission>>(emptyList())
    val availableMissions: StateFlow<List<Mission>> = _availableMissions.asStateFlow()

    private val _activeMissions = MutableStateFlow<List<Mission>>(emptyList())
    val activeMissions: StateFlow<List<Mission>> = _activeMissions.asStateFlow()

    private val _missionHistory = MutableStateFlow<List<Mission>>(emptyList())
    val missionHistory: StateFlow<List<Mission>> = _missionHistory.asStateFlow()

    private val _stats = MutableStateFlow<CourierStats?>(null)
    val stats: StateFlow<CourierStats?> = _stats.asStateFlow()

    private val _isOffline = MutableStateFlow(false)
    val isOffline: StateFlow<Boolean> = _isOffline.asStateFlow()

    private val _gamificationProfile = MutableStateFlow<Map<String, Any>?>(null)
    val gamificationProfile: StateFlow<Map<String, Any>?> = _gamificationProfile.asStateFlow()

    private val _shiftStatus = MutableStateFlow<MapsResult?>(null)
    val shiftStatus: StateFlow<MapsResult?> = _shiftStatus.asStateFlow()

    private val _academyCourses = MutableStateFlow<List<Map<String, Any>>>(emptyList())
    val academyCourses: StateFlow<List<Map<String, Any>>> = _academyCourses.asStateFlow()

    private val _academyProtocolCourses = MutableStateFlow<List<Map<String, Any>>>(emptyList())
    val academyProtocolCourses: StateFlow<List<Map<String, Any>>> = _academyProtocolCourses.asStateFlow()

    suspend fun refreshGamificationProfile() {
        try {
            val profile = jsonObjectToMap(api.getGamificationProfile().asJsonObject()).toMutableMap()
            val xp = (profile["xp"] as? Number)?.toInt() ?: 0
            val nextLevelXp = (profile["next_level_xp"] as? Number)?.toInt() ?: 1000
            profile["xp_progress"] = if (nextLevelXp > 0) xp.toFloat() / nextLevelXp.toFloat() else 0f
            _gamificationProfile.value = profile
            database?.gamificationProfileDao()?.upsert(GamificationProfileEntity.fromMap(profile))
        } catch (e: Exception) {
            _gamificationProfile.value = database?.gamificationProfileDao()?.getProfile()?.toMap()
            e.printStackTrace()
        }
    }

    suspend fun getDocuments(): List<Map<String, Any>> {
        return try {
            jsonArrayToListOfMaps(api.getDocuments().asJsonArray())
        } catch (e: Exception) {
            e.printStackTrace()
            emptyList()
        }
    }

    suspend fun refreshAcademyCourses() {
        try {
            val courses = jsonArrayToListOfMaps(api.getAcademyCourses().asJsonArray())
            _academyCourses.value = courses
            database?.academyCourseDao()?.clearCoursesByType("regular")
            database?.academyCourseDao()?.insertCourses(courses.map { AcademyCourseEntity.fromMap(it, "regular") })
        } catch (e: Exception) {
            _academyCourses.value = database?.academyCourseDao()?.getCoursesByType("regular")?.map { it.toMap() } ?: emptyList()
        }
    }

    suspend fun refreshAcademyProtocolCourses() {
        try {
            val courses = jsonArrayToListOfMaps(api.getAcademyProtocolCourses().asJsonArray())
            _academyProtocolCourses.value = courses
            database?.academyCourseDao()?.clearCoursesByType("protocol")
            database?.academyCourseDao()?.insertCourses(courses.map { AcademyCourseEntity.fromMap(it, "protocol") })
        } catch (e: Exception) {
            _academyProtocolCourses.value = database?.academyCourseDao()?.getCoursesByType("protocol")?.map { it.toMap() } ?: emptyList()
        }
    }

    suspend fun getAcademyProtocolCourseContent(id: Int): Map<String, Any>? {
        return try {
            jsonObjectToMap(api.getAcademyProtocolCourseContent(id).asJsonObject())
        } catch (e: Exception) {
            mapOf("error" to (e.message ?: "Unknown error"))
        }
    }

    suspend fun getCourseDetails(id: Int): Map<String, Any>? {
        return try {
            jsonObjectToMap(api.getCourseDetails(id).asJsonObject())
        } catch (e: Exception) {
            mapOf("error" to (e.message ?: "Unknown error"))
        }
    }

    suspend fun completeCourseQuiz(courseId: Int): Boolean {
        return try {
            val response = jsonObjectToMap(api.completeCourseQuiz(courseId).asJsonObject())
            refreshAcademyCourses()
            refreshGamificationProfile()
            response["success"] as? Boolean == true
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

    suspend fun getAcademyProtocolQuizQuestions(courseId: Int): List<Map<String, Any>> {
        return try {
            jsonArrayToListOfMaps(api.getAcademyProtocolQuizQuestions(courseId).asJsonArray())
        } catch (e: Exception) {
            e.printStackTrace()
            emptyList()
        }
    }

    suspend fun submitAcademyProtocolQuiz(courseId: Int, answers: List<Map<String, Any>>): Map<String, Any>? {
        return try {
            val payload = answers.mapNotNull { answer ->
                val questionId = (answer["question_id"] as? Number)?.toInt()
                val selectedOption = (answer["selected_option"] as? Number)?.toInt()
                if (questionId != null && selectedOption != null) {
                    mapOf("question_id" to questionId, "selected_option" to selectedOption)
                } else {
                    null
                }
            }
            val response = jsonObjectToMap(api.submitAcademyProtocolQuiz(courseId, payload).asJsonObject())
            refreshAcademyProtocolCourses()
            refreshGamificationProfile()
            response
        } catch (e: Exception) {
            e.printStackTrace()
            mapOf("error" to (e.message ?: "Unknown error"))
        }
    }

    suspend fun getGamificationLeaderboard(period: String = "weekly"): List<Map<String, Any>> {
        return try {
            jsonArrayToListOfMaps(api.getGamificationLeaderboard().asJsonArray()).mapIndexed { index, item ->
                item + ("rank" to (index + 1))
            }
        } catch (e: Exception) {
            e.printStackTrace()
            emptyList()
        }
    }
    suspend fun getProtocolSteps(missionId: Int): List<Map<String, Any>> {
        return try {
            jsonArrayToListOfMaps(api.getProtocolSteps(missionId).asJsonArray())
        } catch (e: Exception) {
            e.printStackTrace()
            emptyList()
        }
    }

    suspend fun completeProtocolStep(missionId: Int, stepId: Int, result: Map<String, Any>): Boolean {
        return try {
            val payload = result.mapNotNull { (key, value) ->
                when (value) {
                    null -> null
                    is String -> key to value
                    is Number, is Boolean -> key to value.toString()
                    else -> key to value.toString()
                }
            }.toMap()
            val success = api.completeProtocolStep(missionId, stepId, payload)
            if (success) {
                refreshActiveMissions()
            }
            success
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

    suspend fun optimizeRoute(lat: Double, lng: Double): RouteOptimizationResult {
        return api.optimizeRoute(lat, lng)
    }

    suspend fun refreshStats(filter: String? = null, timeRange: String? = null) {
        try {
            val s = api.getStats()
            _stats.value = s
            database?.courierStatsDao()?.upsert(CourierStatsEntity.fromModel(s))
            _isOffline.value = false
        } catch (e: Exception) {
            _isOffline.value = true
            val cachedStats = database?.courierStatsDao()?.getStats()?.toModel()
            if (cachedStats != null) {
                _stats.value = cachedStats
            }
            e.printStackTrace()
        }
    }

    suspend fun refreshAvailableMissions() {
        try {
            val missions = api.getAvailableOrders()
            _availableMissions.value = missions
            _isOffline.value = false
            database?.missionDao()?.insertMissions(missions.map { MissionEntity.fromModel(it) })
        } catch (e: Exception) {
            _isOffline.value = true
            _availableMissions.value = database?.missionDao()?.getMissionsByStatus("available")?.map { it.toModel() } ?: emptyList()
        }
    }

    suspend fun refreshActiveMissions() {
        try {
            val mission = api.getActiveOrder()
            _activeMissions.value = if (mission != null) listOf(mission) else emptyList()
            _isOffline.value = false
            mission?.let { database?.missionDao()?.insertMissions(listOf(MissionEntity.fromModel(it))) }
        } catch (e: Exception) {
            _isOffline.value = true
            _activeMissions.value = database?.missionDao()?.getMissionsByStatus("active")?.map { it.toModel() } ?: emptyList()
        }
    }

    suspend fun refreshMissionHistory() {
        try {
            val history = api.getMissionHistory()
            _missionHistory.value = history
            _isOffline.value = false
            database?.missionDao()?.insertMissions(history.map { MissionEntity.fromModel(it) })
        } catch (e: Exception) {
            _isOffline.value = true
            _missionHistory.value = database?.missionDao()?.getAllMissions()?.map { it.toModel() } ?: emptyList()
        }
    }


    suspend fun acceptMission(missionId: Int): Boolean {
        val success = api.acceptOrder(missionId)
        if (success) {
            refreshAvailableMissions()
            refreshActiveMissions()
        }
        return success
    }

    suspend fun updateMissionStatus(
        missionId: Int, 
        status: String, 
        lat: Double? = null, 
        lng: Double? = null, 
        podSignature: String? = null,
        podImage: String? = null
    ): Boolean {
        val request = StatusUpdateRequest(status, lat, lng, podSignature, podImage)
        val success = api.updateStatus(missionId, request)
        if (success) {
            refreshActiveMissions()
        }
        return success
    }

    suspend fun uploadImage(imageBytes: ByteArray): String? {
        return api.uploadImage(imageBytes)
    }

    suspend fun submitRating(orderId: Int, rating: Int, comment: String): Boolean {
        return api.submitRating(orderId, RatingRequest(rating, comment))
    }

    suspend fun sendOTP(orderId: Int): Boolean {
        return api.sendOTP(orderId)
    }

    suspend fun verifyOTP(orderId: Int, code: String): Boolean {
        return api.verifyOTP(orderId, OtpVerifyRequest(code))
    }

    suspend fun updateAvailability(isAvailable: Boolean): Boolean {
        return api.updateAvailability(AvailabilityRequest(isAvailable))
    }

    suspend fun startShift(vibe: String): MapsResult {
        return api.startShift(ShiftStartRequest(vibe))
    }

    suspend fun getShiftStatus(): MapsResult {
        return api.getShiftStatus()
    }

    suspend fun autocompleteAddress(query: String): List<AutocompleteSuggestion> {
        return api.autocompleteAddress(query)
    }

    suspend fun geocodeAddress(query: String? = null, placeId: String? = null): GeocodeResult? {
        return api.geocodeAddress(query, placeId)
    }

    suspend fun optimizeManualRoute(lat: Double, lng: Double, rawStops: List<Map<String, Any?>>): RouteOptimizationResult {
        val stops = rawStops.map {
            Stop(
                address = it["address"] as? String,
                lat = it["lat"] as? Double,
                lng = it["lng"] as? Double,
                type = it["stop_type"] as? String
            )
        }
        return api.optimizeManualRoute(ManualRouteRequest(lat, lng, stops))
    }

    private fun JsonElement.asJsonObject(): JsonObject = this as? JsonObject
        ?: throw IllegalStateException("Expected JsonObject response")

    private fun JsonElement.asJsonArray(): JsonArray = this as? JsonArray
        ?: throw IllegalStateException("Expected JsonArray response")

    private fun jsonArrayToListOfMaps(array: JsonArray): List<Map<String, Any>> {
        return array.mapNotNull { element ->
            (jsonToAny(element) as? Map<*, *>)?.mapNotNull { (key, value) ->
                if (key != null && value != null) key.toString() to value else null
            }?.toMap()
        }
    }

    private fun jsonObjectToMap(obj: JsonObject): Map<String, Any> {
        return obj.mapNotNull { (key, value) ->
            jsonToAny(value)?.let { key to it }
        }.toMap()
    }

    private fun jsonToAny(element: JsonElement): Any? {
        return when (element) {
            JsonNull -> null
            is JsonObject -> element.mapNotNull { (key, value) ->
                jsonToAny(value)?.let { key to it }
            }.toMap()
            is JsonArray -> element.mapNotNull { jsonToAny(it) }
            is JsonPrimitive -> when {
                element.isString -> element.content
                element.booleanOrNull != null -> element.boolean
                element.intOrNull != null -> element.int
                element.doubleOrNull != null -> element.double
                else -> element.content
            }
            else -> null
        }
    }
}
