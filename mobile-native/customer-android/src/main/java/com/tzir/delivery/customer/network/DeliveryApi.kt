package com.tzir.delivery.customer.network

import android.util.Log
import com.tzir.delivery.customer.model.*
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.*
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.contentType
import org.json.JSONObject

interface DeliveryApi {
    suspend fun login(request: LoginRequest): AuthResponse
    suspend fun register(request: RegisterRequest): AuthResponse
    suspend fun getActiveOrders(): List<Order>
    suspend fun getOrderHistory(): List<Order>
    suspend fun getCustomerProfile(): User
    suspend fun updateProfile(user: User): Boolean
    suspend fun createOrder(request: CreateOrderRequest): String?
    suspend fun getOrderQuote(pLat: Double, pLng: Double, dLat: Double, dLng: Double): QuoteResponse?
    /**
     * Returns the full URL string to download the PDF invoice for a given order.
     * Returns null if no invoice found.
     */
    suspend fun getInvoiceDownloadUrl(orderId: String): String?
}

class DeliveryApiImpl(
    private val client: HttpClient,
    private val baseUrl: String = "http://192.168.33.19:5000"
) : DeliveryApi {

    private fun formatError(e: Exception): String {
        return when (e) {
            is java.net.ConnectException -> "שגיאת תקשורת: השרת אינו זמין או שגיאת חיבור"
            is java.net.SocketTimeoutException -> "שגיאת רשת: חריגות זמן המתנה"
            is io.ktor.client.plugins.ClientRequestException -> {
                if (e.response.status.value == 401) {
                    TokenManager.clearTokens()
                    "ההתחברות פגה, אנא התחבר מחדש"
                } else {
                    "שגיאת שרת: ${e.response.status.description}"
                }
            }
            else -> e.message ?: "Unknown error"
        }
    }

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
            AuthResponse(success = false, error = formatError(e))
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
            AuthResponse(success = false, error = formatError(e))
        }
    }

    override suspend fun getActiveOrders(): List<Order> {
        return try {
            client.get("$baseUrl/api/orders/active").body()
        } catch (e: Exception) {
            emptyList()
        }
    }

    override suspend fun getOrderHistory(): List<Order> {
        return try {
            client.get("$baseUrl/api/orders/history").body()
        } catch (e: Exception) {
            emptyList()
        }
    }

    override suspend fun getCustomerProfile(): User {
         return client.get("$baseUrl/api/auth/me").body()
    }

    override suspend fun updateProfile(user: User): Boolean {
        return try {
            val resp = client.put("$baseUrl/api/auth/profile") {
                contentType(ContentType.Application.Json)
                setBody(user)
            }
            resp.status.value in 200..299
        } catch (e: Exception) {
            false
        }
    }

    override suspend fun createOrder(request: CreateOrderRequest): String? {
        return try {
            val resp = client.post("$baseUrl/api/orders/create") {
                contentType(ContentType.Application.Json)
                header("Authorization", "Bearer ${TokenManager.token ?: ""}")
                setBody(request)
            }
            if (resp.status.value in 200..299) {
                val bodyText = resp.bodyAsText()
                Log.d("DeliveryApi", "createOrder response: $bodyText")
                val json = JSONObject(bodyText)
                val orderNumber = json.optString("order_number", "")
                    .ifEmpty { json.optInt("id", 0).takeIf { it > 0 }?.toString() }
                    ?: json.optString("id", "").ifEmpty { null }
                orderNumber
            } else {
                Log.e("DeliveryApi", "createOrder failed: ${resp.status}")
                null
            }
        } catch (e: Exception) {
            Log.e("DeliveryApi", "createOrder exception: ${e.message}")
            null
        }
    }

    override suspend fun getOrderQuote(pLat: Double, pLng: Double, dLat: Double, dLng: Double): QuoteResponse? {
        return try {
            client.get("$baseUrl/api/pricing/quote?p_lat=$pLat&p_lng=$pLng&d_lat=$dLat&d_lng=$dLng").body()
        } catch (e: Exception) {
            Log.e("DeliveryApi", "getOrderQuote exception", e)
            null
        }
    }

    override suspend fun getInvoiceDownloadUrl(orderId: String): String? {
        return try {
            // Check if invoice exists for this order
            val resp = client.get("$baseUrl/api/invoices/by-order/$orderId") {
                header("Authorization", "Bearer ${TokenManager.token ?: ""}")
            }
            if (resp.status.value in 200..299) {
                // Return the full URL to the download endpoint that the Intent can open
                "$baseUrl/api/invoices/by-order/$orderId/download?token=${TokenManager.token ?: ""}"
            } else {
                Log.e("DeliveryApi", "Invoice not found for order $orderId")
                null
            }
        } catch (e: Exception) {
            Log.e("DeliveryApi", "getInvoiceDownloadUrl exception", e)
            null
        }
    }
}
