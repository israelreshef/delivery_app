
package com.tzir.delivery.shared.network

import com.tzir.delivery.shared.Platform
import com.tzir.delivery.shared.model.AuthResponse
import com.tzir.delivery.shared.model.LoginRequest
import com.tzir.delivery.shared.model.RegisterRequest
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.*
import io.ktor.client.request.forms.formData
import io.ktor.client.request.forms.submitFormWithBinaryData
import io.ktor.client.statement.bodyAsText
import io.ktor.http.*
import io.ktor.http.ContentType
import io.ktor.http.contentType

interface DeliveryApi {
    suspend fun login(request: LoginRequest): AuthResponse
    suspend fun register(request: RegisterRequest): AuthResponse
    suspend fun sendLocation(courierId: String, lat: Double, lng: Double): Boolean
    suspend fun getAvailableOrders(): List<com.tzir.delivery.shared.model.Mission>
    suspend fun acceptOrder(orderId: Int): Boolean
    suspend fun getCourierStats(courierId: Int): com.tzir.delivery.shared.model.CourierStats
    suspend fun updateStatus(
        orderId: Int, 
        status: String, 
        lat: Double? = null, 
        lng: Double? = null, 
        podSignature: String? = null,
        podImage: String? = null,
        recipientId: String? = null
    ): Boolean
    suspend fun getActiveOrder(): com.tzir.delivery.shared.model.Mission?
    suspend fun getMissionHistory(): List<com.tzir.delivery.shared.model.Mission>
    suspend fun uploadImage(imageBytes: ByteArray): String?
    suspend fun submitRating(orderId: Int, rating: Int, comment: String): Boolean
    suspend fun exportEarnings(year: Int, month: Int): ByteArray?
    suspend fun sendOTP(orderId: Int): Boolean
    suspend fun verifyOTP(orderId: Int, code: String): Boolean
    suspend fun getDocuments(): List<Map<String, Any>>
    suspend fun updateFcmToken(token: String): Boolean
    suspend fun updateAvailability(isAvailable: Boolean): Boolean
}

class DeliveryApiImpl(
    private val client: HttpClient,
    private val baseUrl: String = "http://10.0.2.2:5000" // Default to Android Emulator loopback
) : DeliveryApi {

    override suspend fun login(request: LoginRequest): AuthResponse {
        return try {
            client.post("$baseUrl/api/auth/login") {
                contentType(ContentType.Application.Json)
                setBody(request)
            }.body()
        } catch (e: Exception) {
            e.printStackTrace()
            AuthResponse(success = false, error = e.message ?: "Unknown network error")
        }
    }

    override suspend fun register(request: RegisterRequest): AuthResponse {
        return try {
            client.post("$baseUrl/api/auth/register") {
                contentType(ContentType.Application.Json)
                setBody(request)
            }.body()
        } catch (e: Exception) {
            e.printStackTrace()
            AuthResponse(success = false, error = e.message ?: "Unknown network error")
        }
    }

    override suspend fun sendLocation(courierId: String, lat: Double, lng: Double): Boolean {
        // Go Service runs on port 8080
        // Android Emulator Loopback to localhost:8080 is 10.0.2.2:8080
        val goServiceUrl = "http://10.0.2.2:8080"
        
        return try {
            val response = client.post("$goServiceUrl/location") {
                contentType(ContentType.Application.Json)
                setBody(mapOf(
                    "courier_id" to courierId,
                    "latitude" to lat,
                    "longitude" to lng
                ))
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

    override suspend fun getCourierStats(courierId: Int): com.tzir.delivery.shared.model.CourierStats {
        return try {
            client.get("$baseUrl/api/couriers/stats") {
                contentType(ContentType.Application.Json)
            }.body()
        } catch (e: Exception) {
            e.printStackTrace()
            // Return defaults from CourierStats data class
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

    override suspend fun updateStatus(
        orderId: Int,
        status: String,
        lat: Double?,
        lng: Double?,
        podSignature: String?,
        podImage: String?,
        recipientId: String?
    ): Boolean {
        return try {
            val response = client.post("$baseUrl/api/couriers/orders/$orderId/status") {
                contentType(ContentType.Application.Json)
                setBody(mapOf(
                    "status" to status,
                    "lat" to lat,
                    "lng" to lng,
                    "pod_signature" to podSignature,
                    "pod_image" to podImage,
                    "pod_recipient_id" to recipientId
                ))
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

    override suspend fun submitRating(orderId: Int, rating: Int, comment: String): Boolean {
        return try {
            val response = client.post("$baseUrl/api/couriers/orders/$orderId/rating") {
                contentType(ContentType.Application.Json)
                setBody(mapOf(
                    "rating" to rating,
                    "comment" to comment
                ))
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

    override suspend fun verifyOTP(orderId: Int, code: String): Boolean {
        return try {
            val response = client.post("$baseUrl/api/couriers/orders/$orderId/verify-otp") {
                contentType(ContentType.Application.Json)
                setBody(mapOf("otp_code" to code))
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

    override suspend fun updateFcmToken(token: String): Boolean {
        return try {
            val response = client.post("$baseUrl/api/auth/fcm-token") {
                contentType(ContentType.Application.Json)
                setBody(mapOf("fcm_token" to token))
            }
            response.status.value in 200..299
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

    override suspend fun updateAvailability(isAvailable: Boolean): Boolean {
        return try {
            val response = client.patch("$baseUrl/api/couriers/availability") {
                contentType(ContentType.Application.Json)
                setBody(mapOf("is_available" to isAvailable))
            }
            response.status.value in 200..299
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }
}
