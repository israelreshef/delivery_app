
package com.tzir.delivery.shared.network

import com.tzir.delivery.shared.model.*
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.*
import io.ktor.client.request.forms.formData
import io.ktor.client.request.forms.submitFormWithBinaryData
import io.ktor.client.statement.bodyAsText
import io.ktor.http.*
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement

interface DeliveryApi {
    // Auth
    suspend fun login(request: LoginRequest): AuthResponse
    suspend fun register(request: RegisterRequest): AuthResponse

    // Location
    suspend fun sendLocation(request: LocationRequest): Boolean

    // Orders
    suspend fun getAvailableOrders(): List<com.tzir.delivery.shared.model.Mission>
    suspend fun acceptOrder(orderId: Int): Boolean
    suspend fun optimizeRoute(lat: Double, lng: Double): MapsResult
    suspend fun getCourierStats(courierId: Int): com.tzir.delivery.shared.model.CourierStats
    suspend fun updateStatus(orderId: Int, request: StatusUpdateRequest): Boolean
    suspend fun getActiveOrder(): com.tzir.delivery.shared.model.Mission?
    suspend fun getMissionHistory(): List<com.tzir.delivery.shared.model.Mission>
    suspend fun uploadImage(imageBytes: ByteArray): String?
    suspend fun submitRating(orderId: Int, request: RatingRequest): Boolean
    suspend fun sendOTP(orderId: Int): Boolean
    suspend fun verifyOTP(orderId: Int, request: OtpVerifyRequest): Boolean
    suspend fun exportEarnings(year: Int, month: Int): ByteArray?
    suspend fun getDocuments(): List<Map<String, Any>>
    suspend fun updateFcmToken(request: FcmTokenRequest): Boolean
    suspend fun updateAvailability(request: AvailabilityRequest): Boolean
    suspend fun optimizeManualRoute(request: ManualRouteRequest): MapsResult
    suspend fun autocompleteAddress(query: String): List<com.tzir.delivery.shared.model.AutocompleteSuggestion>
    suspend fun geocodeAddress(query: String? = null, placeId: String? = null): com.tzir.delivery.shared.model.GeocodeResult?

    // Gamification & Shift Management (TZIR Academy)
    suspend fun startShift(request: ShiftStartRequest): MapsResult
    suspend fun getShiftStatus(): MapsResult
    suspend fun getGamificationProfile(): Map<String, Any>

    // Academy Endpoints
    suspend fun getAcademyCourses(): List<Map<String, Any>>
    suspend fun getCourseDetails(courseId: Int): Map<String, Any>
    suspend fun completeCourseQuiz(courseId: Int): Map<String, Any>
}

// Simple wrapper for generic json map until models are created
@Serializable
data class MapsResult(val success: Boolean, val data: JsonElement? = null)

class DeliveryApiImpl(
    private val client: HttpClient,
    private val baseUrl: String = "http://10.0.2.2:5000" // Default to Android Emulator loopback
) : DeliveryApi {

    // NOTE: Auth token injection is handled globally by KtorClientFactory.defaultRequest
    // which reads from TokenManager.token. No manual header injection needed here.

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
            e.printStackTrace()
            AuthResponse(success = false, error = e.message ?: "Unknown network error")
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
            e.printStackTrace()
            AuthResponse(success = false, error = e.message ?: "Unknown network error")
        }
    }

    override suspend fun sendLocation(request: LocationRequest): Boolean {
        return try {
            val response = client.post("$baseUrl/api/couriers/location") {
                contentType(ContentType.Application.Json)
                setBody(request)
            }
            response.status.value in 200..299
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

    override suspend fun getAvailableOrders(): List<com.tzir.delivery.shared.model.Mission> {
        return try {
            client.post("$baseUrl/api/couriers/available-orders") {
                contentType(ContentType.Application.Json)
            }.body()
        } catch (e: Exception) {
            e.printStackTrace()
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
            e.printStackTrace()
            false
        }
    }

    override suspend fun optimizeRoute(lat: Double, lng: Double): MapsResult {
        return try {
            val response = client.post("$baseUrl/api/optimization/optimize-my-route") {
                contentType(ContentType.Application.Json)
                setBody(LocationRequest("", lat, lng)) // Reusing LocationRequest for simple lat/lng
            }
            MapsResult(success = response.status.value in 200..299)
        } catch (e: Exception) {
            e.printStackTrace()
            MapsResult(success = false)
        }
    }

    override suspend fun getCourierStats(courierId: Int): com.tzir.delivery.shared.model.CourierStats {
        return try {
            client.get("$baseUrl/api/couriers/stats") {
                contentType(ContentType.Application.Json)
            }.body()
        } catch (e: Exception) {
            e.printStackTrace()
            com.tzir.delivery.shared.model.CourierStats(
                totalDeliveries = 0,
                todayEarnings = 0.0,
                weeklyEarnings = 0.0,
                rating = 0.0,
                balance = 0.0,
                performanceIndex = 0.0,
                rankBadge = "Standard"
            )
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
            e.printStackTrace()
            false
        }
    }

    override suspend fun getActiveOrder(): com.tzir.delivery.shared.model.Mission? {
        return try {
            client.get("$baseUrl/api/couriers/active-order") {
                contentType(ContentType.Application.Json)
            }.body()
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

    override suspend fun getMissionHistory(): List<com.tzir.delivery.shared.model.Mission> {
        return try {
            client.get("$baseUrl/api/couriers/history") {
                contentType(ContentType.Application.Json)
            }.body()
        } catch (e: Exception) {
            e.printStackTrace()
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
                        append(HttpHeaders.ContentDisposition, "filename=\"signature.png\"")
                    })
                }
            )
            if (response.status.value in 200..299) {
                val body: Map<String, String> = response.body()
                body["url"]
            } else null
        } catch (e: Exception) {
            e.printStackTrace()
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
            e.printStackTrace()
            false
        }
    }

    override suspend fun sendOTP(orderId: Int): Boolean {
        return try {
            val response = client.post("$baseUrl/api/couriers/orders/$orderId/send-otp")
            response.status.value in 200..299
        } catch (e: Exception) {
            e.printStackTrace()
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
            e.printStackTrace()
            false
        }
    }

    override suspend fun exportEarnings(year: Int, month: Int): ByteArray? {
        return try {
            val response = client.get("$baseUrl/api/couriers/earnings/export") {
                parameter("year", year)
                parameter("month", month)
            }
            if (response.status.value in 200..299) {
                response.bodyAsText().encodeToByteArray()
            } else null
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

    override suspend fun getDocuments(): List<Map<String, Any>> {
        return try {
            client.get("$baseUrl/api/couriers/documents") {
                contentType(ContentType.Application.Json)
            }.body()
        } catch (e: Exception) {
            e.printStackTrace()
            emptyList()
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
            e.printStackTrace()
            false
        }
    }

    override suspend fun updateAvailability(request: AvailabilityRequest): Boolean {
        return try {
            val response = client.patch("$baseUrl/api/couriers/availability") {
                contentType(ContentType.Application.Json)
                setBody(request)
            }
            response.status.value in 200..299
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

    override suspend fun optimizeManualRoute(request: ManualRouteRequest): MapsResult {
        return try {
            val response = client.post("$baseUrl/api/optimization/manual-run") {
                contentType(ContentType.Application.Json)
                setBody(request)
            }
            MapsResult(success = response.status.value in 200..299)
        } catch (e: Exception) {
            e.printStackTrace()
            MapsResult(success = false)
        }
    }

    override suspend fun autocompleteAddress(query: String): List<com.tzir.delivery.shared.model.AutocompleteSuggestion> {
        return try {
            client.get("$baseUrl/api/addresses/autocomplete") {
                parameter("q", query)
            }.body()
        } catch (e: Exception) {
            e.printStackTrace()
            emptyList()
        }
    }

    override suspend fun geocodeAddress(query: String?, placeId: String?): com.tzir.delivery.shared.model.GeocodeResult? {
        return try {
            client.get("$baseUrl/api/addresses/geocode") {
                if (placeId != null) parameter("place_id", placeId)
                else parameter("q", query)
            }.body()
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

    override suspend fun startShift(request: ShiftStartRequest): MapsResult {
        return try {
            val response = client.post("$baseUrl/api/couriers/shift/start") {
                contentType(ContentType.Application.Json)
                setBody(request)
            }
            MapsResult(success = response.status.value in 200..299)
        } catch (e: Exception) {
            e.printStackTrace()
            MapsResult(success = false)
        }
    }

    override suspend fun getShiftStatus(): MapsResult {
        return try {
            val response = client.get("$baseUrl/api/couriers/shift/status") {
                contentType(ContentType.Application.Json)
            }
            MapsResult(success = response.status.value in 200..299)
        } catch (e: Exception) {
            e.printStackTrace()
            MapsResult(success = false)
        }
    }

    override suspend fun getGamificationProfile(): Map<String, Any> {
        return try {
            client.get("$baseUrl/api/couriers/gamification/profile") {
                contentType(ContentType.Application.Json)
            }.body()
        } catch (e: Exception) {
            e.printStackTrace()
            emptyMap()
        }
    }

    override suspend fun getAcademyCourses(): List<Map<String, Any>> {
        return try {
            client.get("$baseUrl/api/academy/courses") {
                contentType(ContentType.Application.Json)
            }.body()
        } catch (e: Exception) {
            e.printStackTrace()
            emptyList()
        }
    }

    override suspend fun getCourseDetails(courseId: Int): Map<String, Any> {
        return try {
            client.get("$baseUrl/api/academy/courses/$courseId") {
                contentType(ContentType.Application.Json)
            }.body()
        } catch (e: Exception) {
            e.printStackTrace()
            emptyMap()
        }
    }

    override suspend fun completeCourseQuiz(courseId: Int): Map<String, Any> {
        return try {
            client.post("$baseUrl/api/academy/courses/$courseId/complete-quiz") {
                contentType(ContentType.Application.Json)
            }.body()
        } catch (e: Exception) {
            e.printStackTrace()
            emptyMap()
        }
    }
}
