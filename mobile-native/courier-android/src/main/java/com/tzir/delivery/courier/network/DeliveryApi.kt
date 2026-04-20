package com.tzir.delivery.courier.network

import com.tzir.delivery.courier.model.*
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.*
import io.ktor.http.*
import io.ktor.client.statement.bodyAsText
import io.ktor.client.request.forms.formData
import io.ktor.client.request.forms.submitFormWithBinaryData
import kotlinx.serialization.json.JsonElement

interface DeliveryApi {
    suspend fun login(request: LoginRequest): AuthResponse
    suspend fun register(request: RegisterRequest): AuthResponse
    suspend fun sendLocation(request: LocationRequest): Boolean
    suspend fun getAvailableOrders(): List<Mission>
    suspend fun acceptOrder(orderId: Int): Boolean
    suspend fun rejectOrder(orderId: Int): Boolean
    suspend fun optimizeRoute(lat: Double, lng: Double): RouteOptimizationResult
    suspend fun getStats(): CourierStats
    suspend fun updateStatus(orderId: Int, request: StatusUpdateRequest): Boolean
    suspend fun getActiveOrder(): Mission?
    suspend fun getMissionHistory(): List<Mission>
    suspend fun uploadImage(imageBytes: ByteArray): String?
    suspend fun submitRating(orderId: Int, request: RatingRequest): Boolean
    suspend fun sendOTP(orderId: Int): Boolean
    suspend fun verifyOTP(orderId: Int, request: OtpVerifyRequest): Boolean
    suspend fun updateFcmToken(request: FcmTokenRequest): Boolean
    suspend fun updateAvailability(request: AvailabilityRequest): Boolean
    suspend fun autocompleteAddress(query: String): List<AutocompleteSuggestion>
    suspend fun geocodeAddress(query: String? = null, placeId: String? = null): GeocodeResult?
    suspend fun startShift(request: ShiftStartRequest): MapsResult
    suspend fun getShiftStatus(): MapsResult
    suspend fun optimizeManualRoute(request: ManualRouteRequest): RouteOptimizationResult
    suspend fun getDocuments(): JsonElement
    suspend fun getProtocolSteps(orderId: Int): JsonElement
    suspend fun completeProtocolStep(orderId: Int, step: Int, actionData: Map<String, String>): Boolean
    suspend fun getGamificationProfile(): JsonElement
    suspend fun getGamificationLeaderboard(): JsonElement
    suspend fun getAcademyCourses(): JsonElement
    suspend fun getCourseDetails(courseId: Int): JsonElement
    suspend fun completeCourseQuiz(courseId: Int, score: Int = 100): JsonElement
    suspend fun getAcademyProtocolCourses(): JsonElement
    suspend fun getAcademyProtocolCourseContent(courseId: Int): JsonElement
    suspend fun getAcademyProtocolQuizQuestions(courseId: Int): JsonElement
    suspend fun submitAcademyProtocolQuiz(courseId: Int, answers: List<Map<String, Int>>): JsonElement
}

class DeliveryApiImpl(
    private val client: HttpClient,
    private val baseUrl: String = "http://192.168.33.19:5000"
) : DeliveryApi {

    override suspend fun login(request: LoginRequest): AuthResponse {
        return try {
            val response: AuthResponse = client.post("$baseUrl/api/auth/login") {
                contentType(ContentType.Application.Json)
                setBody(request)
            }.body()
            if (response.success) {
                TokenManager.token = response.accessToken
            }
            response
        } catch (e: Exception) {
            AuthResponse(success = false, error = e.message ?: "Unknown error")
        }
    }

    override suspend fun register(request: RegisterRequest): AuthResponse {
        return try {
            val response: AuthResponse = client.post("$baseUrl/api/auth/register") {
                contentType(ContentType.Application.Json)
                setBody(request)
            }.body()
            if (response.success) {
                TokenManager.token = response.accessToken
            }
            response
        } catch (e: Exception) {
            AuthResponse(success = false, error = e.message ?: "Unknown error")
        }
    }

    override suspend fun sendLocation(request: LocationRequest): Boolean {
        return try {
            val response = client.post("$baseUrl/api/couriers/location") {
                contentType(ContentType.Application.Json)
                setBody(request)
            }
            if (response.status.value == 401) {
                android.util.Log.e("DeliveryApi", "sendLocation 401 Unauthorized - Token may be missing or invalid")
            }
            response.status.value in 200..299
        } catch (e: Exception) {
            android.util.Log.e("DeliveryApi", "sendLocation Exception", e)
            false
        }
    }

    override suspend fun getAvailableOrders(): List<Mission> {
        return try {
            client.post("$baseUrl/api/couriers/available-orders") {
                contentType(ContentType.Application.Json)
            }.body()
        } catch (e: Exception) {
            emptyList()
        }
    }

    override suspend fun acceptOrder(orderId: Int): Boolean {
        return try {
            val response = client.post("$baseUrl/api/couriers/orders/$orderId/accept") {
                contentType(ContentType.Application.Json)
            }
            response.status.value in 200..299
        } catch (e: Exception) {
            false
        }
    }

    override suspend fun rejectOrder(orderId: Int): Boolean {
        return try {
            val response = client.post("$baseUrl/api/couriers/orders/$orderId/reject") {
                contentType(ContentType.Application.Json)
            }
            response.status.value in 200..299
        } catch (e: Exception) {
            false
        }
    }

    override suspend fun optimizeRoute(lat: Double, lng: Double): RouteOptimizationResult {
        return try {
            client.post("$baseUrl/api/optimization/optimize-my-route") {
                contentType(ContentType.Application.Json)
                setBody(LocationRequest("", lat, lng))
            }.body()
        } catch (e: Exception) {
            RouteOptimizationResult(error = e.message ?: "Failed to optimize route")
        }
    }

    override suspend fun getStats(): CourierStats {
        return try {
            val response = client.get("$baseUrl/api/couriers/stats") {
                contentType(ContentType.Application.Json)
            }
            if (response.status.value == 401) {
                android.util.Log.e("DeliveryApi", "getStats 401 Unauthorized - Token may be missing or invalid")
                println("DeliveryApi: getStats 401 Unauthorized")
            }
            response.body()
        } catch (e: Exception) {
            android.util.Log.e("DeliveryApi", "getStats Exception", e)
            println("DeliveryApi: getStats Exception: ${e.message}")
            CourierStats(0, 0.0, 0.0, 0.0, 0.0, 0.0, "Standard")
        }
    }

    override suspend fun updateStatus(orderId: Int, request: StatusUpdateRequest): Boolean {
        return try {
            val response = client.post("$baseUrl/api/couriers/orders/$orderId/status") {
                contentType(ContentType.Application.Json)
                setBody(request)
            }
            response.status.value in 200..299
        } catch (e: Exception) {
            false
        }
    }

    override suspend fun getActiveOrder(): Mission? {
        return try {
            client.get("$baseUrl/api/couriers/active-order") {
                contentType(ContentType.Application.Json)
            }.body()
        } catch (e: Exception) {
            null
        }
    }

    override suspend fun getMissionHistory(): List<Mission> {
        return try {
            client.get("$baseUrl/api/couriers/history") {
                contentType(ContentType.Application.Json)
            }.body()
        } catch (e: Exception) {
            emptyList()
        }
    }

    override suspend fun uploadImage(imageBytes: ByteArray): String? {
        return try {
            val response: io.ktor.client.statement.HttpResponse = client.submitFormWithBinaryData(
                url = "$baseUrl/api/couriers/upload",
                formData = formData {
                    append("file", imageBytes, Headers.build {
                        append(HttpHeaders.ContentType, "image/png")
                        append(HttpHeaders.ContentDisposition, "filename=\"pod.png\"")
                    })
                }
            )
            if (response.status.value in 200..299) {
                val body: Map<String, String> = response.body()
                body["url"]
            } else null
        } catch (e: Exception) {
            null
        }
    }

    override suspend fun submitRating(orderId: Int, request: RatingRequest): Boolean {
        return try {
            val response = client.post("$baseUrl/api/couriers/orders/$orderId/rating") {
                contentType(ContentType.Application.Json)
                setBody(request)
            }
            response.status.value in 200..299
        } catch (e: Exception) {
            false
        }
    }

    override suspend fun sendOTP(orderId: Int): Boolean {
        return try {
            val response = client.post("$baseUrl/api/couriers/orders/$orderId/send-otp")
            response.status.value in 200..299
        } catch (e: Exception) {
            false
        }
    }

    override suspend fun verifyOTP(orderId: Int, request: OtpVerifyRequest): Boolean {
        return try {
            val response = client.post("$baseUrl/api/couriers/orders/$orderId/verify-otp") {
                contentType(ContentType.Application.Json)
                setBody(request)
            }
            response.status.value in 200..299
        } catch (e: Exception) {
            false
        }
    }

    override suspend fun updateFcmToken(request: FcmTokenRequest): Boolean {
        return try {
            val response = client.post("$baseUrl/api/auth/fcm-token") {
                contentType(ContentType.Application.Json)
                setBody(request)
            }
            response.status.value in 200..299
        } catch (e: Exception) {
            false
        }
    }

    override suspend fun updateAvailability(request: AvailabilityRequest): Boolean {
        return try {
            val response = client.patch("$baseUrl/api/couriers/availability") {
                contentType(ContentType.Application.Json)
                setBody(request)
            }
            if (response.status.value == 401) {
                android.util.Log.e("DeliveryApi", "updateAvailability 401 Unauthorized - Token may be missing. Current local token: ${TokenManager.token?.take(10)}...")
                println("DeliveryApi: updateAvailability 401 Unauthorized. Local token prefix: ${TokenManager.token?.take(10)}")
            }
            response.status.value in 200..299
        } catch (e: Exception) {
            android.util.Log.e("DeliveryApi", "updateAvailability Exception", e)
            println("DeliveryApi: updateAvailability Exception: ${e.message}")
            false
        }
    }

    override suspend fun autocompleteAddress(query: String): List<AutocompleteSuggestion> {
        return try {
            client.get("$baseUrl/api/addresses/autocomplete") {
                parameter("q", query)
            }.body()
        } catch (e: Exception) {
            emptyList()
        }
    }

    override suspend fun geocodeAddress(query: String?, placeId: String?): GeocodeResult? {
        return try {
            client.get("$baseUrl/api/addresses/geocode") {
                if (query != null) parameter("q", query)
                if (placeId != null) parameter("place_id", placeId)
            }.body()
        } catch (e: Exception) {
            null
        }
    }

    override suspend fun startShift(request: ShiftStartRequest): MapsResult {
        return try {
            client.post("$baseUrl/api/couriers/shift/start") {
                contentType(ContentType.Application.Json)
                setBody(request)
            }.body()
        } catch (e: Exception) {
            MapsResult(success = false)
        }
    }

    override suspend fun getShiftStatus(): MapsResult {
        return try {
            client.get("$baseUrl/api/couriers/shift/status") {
                contentType(ContentType.Application.Json)
            }.body()
        } catch (e: Exception) {
            MapsResult(success = false)
        }
    }

    override suspend fun optimizeManualRoute(request: ManualRouteRequest): RouteOptimizationResult {
        return try {
            client.post("$baseUrl/api/optimization/manual-run") {
                contentType(ContentType.Application.Json)
                setBody(request)
            }.body()
        } catch (e: Exception) {
            RouteOptimizationResult(error = e.message ?: "Failed to optimize manual route")
        }
    }

    override suspend fun getDocuments(): JsonElement {
        return client.get("$baseUrl/api/couriers/documents") {
            contentType(ContentType.Application.Json)
        }.body()
    }

    override suspend fun getProtocolSteps(orderId: Int): JsonElement {
        return client.get("$baseUrl/api/orders/$orderId/protocol-steps") {
            contentType(ContentType.Application.Json)
        }.body()
    }

    override suspend fun completeProtocolStep(orderId: Int, step: Int, actionData: Map<String, String>): Boolean {
        return try {
            val response = client.post("$baseUrl/api/orders/$orderId/protocol-steps/$step/complete") {
                contentType(ContentType.Application.Json)
                setBody(actionData)
            }
            response.status.value in 200..299
        } catch (e: Exception) {
            false
        }
    }

    override suspend fun getGamificationProfile(): JsonElement {
        return client.get("$baseUrl/api/couriers/gamification/profile") {
            contentType(ContentType.Application.Json)
        }.body()
    }

    override suspend fun getGamificationLeaderboard(): JsonElement {
        return client.get("$baseUrl/api/couriers/gamification/leaderboard") {
            contentType(ContentType.Application.Json)
        }.body()
    }

    override suspend fun getAcademyCourses(): JsonElement {
        return client.get("$baseUrl/api/academy/courses") {
            contentType(ContentType.Application.Json)
        }.body()
    }

    override suspend fun getCourseDetails(courseId: Int): JsonElement {
        return client.get("$baseUrl/api/academy/courses/$courseId") {
            contentType(ContentType.Application.Json)
        }.body()
    }

    override suspend fun completeCourseQuiz(courseId: Int, score: Int): JsonElement {
        return client.post("$baseUrl/api/academy/courses/$courseId/complete-quiz") {
            contentType(ContentType.Application.Json)
            setBody(mapOf("score" to score))
        }.body()
    }

    override suspend fun getAcademyProtocolCourses(): JsonElement {
        return client.get("$baseUrl/api/academy/protocols") {
            contentType(ContentType.Application.Json)
        }.body()
    }

    override suspend fun getAcademyProtocolCourseContent(courseId: Int): JsonElement {
        return client.get("$baseUrl/api/academy/protocols/$courseId") {
            contentType(ContentType.Application.Json)
        }.body()
    }

    override suspend fun getAcademyProtocolQuizQuestions(courseId: Int): JsonElement {
        return client.get("$baseUrl/api/academy/protocols/$courseId/quiz/questions") {
            contentType(ContentType.Application.Json)
        }.body()
    }

    override suspend fun submitAcademyProtocolQuiz(courseId: Int, answers: List<Map<String, Int>>): JsonElement {
        return client.post("$baseUrl/api/academy/protocols/$courseId/quiz/submit") {
            contentType(ContentType.Application.Json)
            setBody(mapOf("answers" to answers))
        }.body()
    }
}
