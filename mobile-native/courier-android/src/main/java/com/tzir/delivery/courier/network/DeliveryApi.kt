package com.tzir.delivery.courier.network

import com.tzir.delivery.courier.model.*
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.*
import io.ktor.http.*
import io.ktor.client.statement.bodyAsText
import io.ktor.client.request.forms.formData
import io.ktor.client.request.forms.submitFormWithBinaryData
import kotlinx.serialization.json.*

interface DeliveryApi {
    suspend fun login(request: LoginRequest): AuthResponse
    suspend fun loginVerifyMfa(mfaToken: String, code: String): AuthResponse
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

    // ── Tax forms API ──
    suspend fun getTaxForms(): JsonElement
    suspend fun generateTaxForm(formId: String, month: Int?, year: Int): ByteArray?
    suspend fun downloadBlankForm(formId: String): ByteArray?

    // ── Generated report history API ──
    suspend fun getReportHistory(): JsonElement
    suspend fun downloadReport(reportId: Int): ByteArray?
    suspend fun deleteReport(reportId: Int): Boolean

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

    // ── Academy Certifications API ──
    suspend fun getMyCertifications(): JsonElement
    suspend fun getCertificate(courseId: Int): JsonElement

    // ── Clients API ──
    suspend fun getMyClients(page: Int = 1, search: String? = null, filterVip: Boolean? = null, filterBusiness: Boolean? = null): ApiListResponse<CourierContact>
    suspend fun getClientOrders(clientId: Int): List<ClientOrder>
    suspend fun getClientTasks(clientId: Int): List<ClientTask>
    suspend fun createClientTask(clientId: Int, title: String, description: String? = null, dueDate: String? = null, priority: String = "medium"): ClientTask
    suspend fun createClient(name: String, company: String, phone: String, email: String, addresses: List<String>, isVIP: Boolean, isBusiness: Boolean, notes: String, tags: List<String>): CourierContact
    suspend fun updateClient(id: Int, name: String?, company: String?, phone: String?, email: String?, addresses: List<String>?, isVIP: Boolean?, isBusiness: Boolean?, notes: String?, tags: List<String>?): CourierContact
    suspend fun deleteClient(id: Int): Boolean
    suspend fun getDeliveryClients(): ApiListResponse<DeliveryClient>
    suspend fun logContactInteraction(clientId: Int, message: String, addDelivery: Boolean = false, addRevenue: Double = 0.0): Boolean
    suspend fun sendQuote(request: QuoteRequest): Boolean

    // ── Vehicles API ──
    suspend fun getMyVehicles(): ApiListResponse<CourierVehicle>
    suspend fun createVehicle(plate: String, type: String, insuranceExpiry: String? = null, testExpiry: String? = null, storageTypes: List<String>, isPrimary: Boolean = false): CourierVehicle
    suspend fun updateVehicle(id: Int, plate: String? = null, type: String? = null, insuranceExpiry: String? = null, testExpiry: String? = null, storageTypes: List<String>? = null): CourierVehicle
    suspend fun deleteVehicle(id: Int): Boolean
    suspend fun setPrimaryVehicle(id: Int): CourierVehicle

    // ── Ratings API ──
    suspend fun getMyRatingStats(): CourierRatingStats
    suspend fun getMyRatingFeedback(): ApiListResponse<RatingFeedback>

    // ── Wallet / Ledger API ──
    suspend fun getWalletBalance(): JsonElement
    suspend fun createWithdrawal(amount: Double, paymentDetails: String): JsonElement
    suspend fun getWalletHistory(): JsonElement
    suspend fun getWithdrawalHistory(): JsonElement
    suspend fun getPaymentMethods(): List<PaymentMethod>
    suspend fun addPaymentMethod(methodType: String, label: String, details: Map<String, String>, isDefault: Boolean = false): PaymentMethod?
    suspend fun setDefaultPaymentMethod(methodId: Int): Boolean
    suspend fun deletePaymentMethod(methodId: Int): Boolean

    // ── Notifications API ──
    suspend fun getMyNotifications(page: Int = 1, unreadOnly: Boolean = false): ApiListResponse<CourierNotification>
    suspend fun markNotificationRead(notificationId: Int): Boolean
    suspend fun markAllNotificationsRead(): Boolean

    // ── Schedule API ──
    suspend fun getMySchedule(year: Int, month: Int): ApiListResponse<ScheduleDelivery>
    suspend fun createScheduleEntry(title: String, date: String, start: String, end: String? = null, pickupAddress: String = "", dropoffAddress: String = ""): Boolean

    // ── Business API ──
    suspend fun getBusinessExpenses(year: Int? = null, month: Int? = null): ApiListResponse<BusinessExpense>
    suspend fun createBusinessExpense(category: String, description: String, amount: Double, paymentMethod: String? = null): Boolean
    suspend fun deleteBusinessExpense(id: Int): Boolean
    suspend fun getExpenseSummary(year: Int? = null, month: Int? = null): ExpenseSummary
    suspend fun getBusinessReceipts(year: Int? = null, month: Int? = null): ApiListResponse<CourierReceipt>
    suspend fun createReceipt(clientName: String, amount: Double, description: String? = null, paymentMethod: String? = null, clientTaxId: String? = null): CourierReceipt?
    suspend fun downloadReceiptDocument(id: Int, format: String): ByteArray?
    suspend fun getBusinessOverview(year: Int? = null, month: Int? = null): BusinessOverview
    suspend fun getMonthlyReport(year: Int? = null, month: Int? = null): MonthlyReport
    suspend fun getAnnualReport(year: Int? = null): AnnualReport

    // ── Support Tickets API ──
    suspend fun getSupportTickets(): List<CourierSupportTicket>
    suspend fun getSupportTicketDetail(ticketId: Int): CourierSupportDetail?
    suspend fun createSupportTicket(subject: String, message: String, priority: String = "medium"): CreateSupportTicketResponse?
    suspend fun addSupportTicketMessage(ticketId: Int, message: String): AddSupportMessageResponse?
}

class DeliveryApiImpl(
    private val client: HttpClient,
    private val baseUrl: String = KtorClientFactory.resolveBaseUrl()
) : DeliveryApi {

    override suspend fun login(request: LoginRequest): AuthResponse {
        return try {
            val response: AuthResponse = client.post("$baseUrl/api/auth/login") {
                contentType(ContentType.Application.Json)
                setBody(request)
            }.body()
            if (response.success) {
                TokenManager.token = response.accessToken
                response.refreshToken?.let { TokenManager.saveRefreshToken(it) }
            }
            response
        } catch (e: Exception) {
            AuthResponse(success = false, error = e.message ?: "Unknown error")
        }
    }

    override suspend fun loginVerifyMfa(mfaToken: String, code: String): AuthResponse {
        return try {
            val response: AuthResponse = client.post("$baseUrl/api/auth/2fa/login-verify") {
                contentType(ContentType.Application.Json)
                setBody(MfaVerifyRequest(mfaToken = mfaToken, code = code))
            }.body()
            if (response.success) {
                TokenManager.token = response.accessToken
                response.refreshToken?.let { TokenManager.saveRefreshToken(it) }
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
                response.refreshToken?.let { TokenManager.saveRefreshToken(it) }
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

    override suspend fun getTaxForms(): JsonElement {
        return try {
            client.get("$baseUrl/api/courier/forms") {
                contentType(ContentType.Application.Json)
            }.body()
        } catch (e: Exception) {
            JsonNull
        }
    }

    override suspend fun generateTaxForm(formId: String, month: Int?, year: Int): ByteArray? {
        return try {
            val body = buildJsonObject {
                if (month != null) put("month", month)
                put("year", year)
            }
            val response = client.post("$baseUrl/api/courier/forms/$formId/generate") {
                contentType(ContentType.Application.Json)
                setBody(body)
            }
            if (response.status.value in 200..299) response.body<ByteArray>() else null
        } catch (e: Exception) {
            null
        }
    }

    override suspend fun downloadBlankForm(formId: String): ByteArray? {
        return try {
            val response = client.get("$baseUrl/api/courier/forms/$formId/blank")
            if (response.status.value in 200..299) response.body<ByteArray>() else null
        } catch (e: Exception) {
            null
        }
    }

    override suspend fun getReportHistory(): JsonElement {
        return try {
            client.get("$baseUrl/api/courier/forms/history") {
                contentType(ContentType.Application.Json)
            }.body()
        } catch (e: Exception) {
            JsonNull
        }
    }

    override suspend fun downloadReport(reportId: Int): ByteArray? {
        return try {
            val response = client.get("$baseUrl/api/courier/forms/history/$reportId/download")
            if (response.status.value in 200..299) response.body<ByteArray>() else null
        } catch (e: Exception) {
            null
        }
    }

    override suspend fun deleteReport(reportId: Int): Boolean {
        return try {
            val response = client.delete("$baseUrl/api/courier/forms/history/$reportId")
            response.status.value in 200..299
        } catch (e: Exception) {
            false
        }
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

    override suspend fun getMyCertifications(): JsonElement {
        return client.get("$baseUrl/api/academy/protocols/my-certifications") {
            contentType(ContentType.Application.Json)
        }.body()
    }

    override suspend fun getCertificate(courseId: Int): JsonElement {
        return client.get("$baseUrl/api/academy/courses/$courseId/certificate") {
            contentType(ContentType.Application.Json)
        }.body()
    }

    // ── Clients API Impl ──

    override suspend fun getClientOrders(clientId: Int): List<ClientOrder> {
        return try {
            client.get("$baseUrl/api/courier/my-clients/$clientId/orders") {
                contentType(ContentType.Application.Json)
            }.body()
        } catch (e: Exception) {
            emptyList()
        }
    }

    override suspend fun getClientTasks(clientId: Int): List<ClientTask> {
        return client.get("$baseUrl/api/courier/my-clients/$clientId/tasks").body()
    }

    override suspend fun createClientTask(clientId: Int, title: String, description: String?, dueDate: String?, priority: String): ClientTask {
        return client.post("$baseUrl/api/courier/my-clients/$clientId/tasks") {
            contentType(ContentType.Application.Json)
            setBody(mapOf(
                "title" to title,
                "description" to (description ?: ""),
                "due_date" to (dueDate ?: ""),
                "priority" to priority
            ))
        }.body()
    }

    override suspend fun getMyClients(page: Int, search: String?, filterVip: Boolean?, filterBusiness: Boolean?): ApiListResponse<CourierContact> {
        return try {
            client.get("$baseUrl/api/courier/my-clients") {
                contentType(ContentType.Application.Json)
                parameter("page", page)
                if (search != null) parameter("search", search)
                if (filterVip != null) parameter("vip", filterVip)
                if (filterBusiness != null) parameter("business", filterBusiness)
            }.body()
        } catch (e: Exception) {
            ApiListResponse()
        }
    }

    override suspend fun createClient(
        name: String, company: String, phone: String, email: String,
        addresses: List<String>, isVIP: Boolean, isBusiness: Boolean,
        notes: String, tags: List<String>
    ): CourierContact {
        return client.post("$baseUrl/api/courier/my-clients") {
            contentType(ContentType.Application.Json)
            setBody(mapOf(
                "name" to name,
                "company" to company,
                "phone" to phone,
                "email" to email,
                "addresses" to addresses,
                "is_vip" to isVIP,
                "is_business" to isBusiness,
                "notes" to notes,
                "tags" to tags
            ))
        }.body()
    }

    override suspend fun updateClient(
        id: Int, name: String?, company: String?, phone: String?, email: String?,
        addresses: List<String>?, isVIP: Boolean?, isBusiness: Boolean?,
        notes: String?, tags: List<String>?
    ): CourierContact {
        val body = mutableMapOf<String, Any>()
        name?.let { body["name"] = it }
        company?.let { body["company"] = it }
        phone?.let { body["phone"] = it }
        email?.let { body["email"] = it }
        addresses?.let { body["addresses"] = it }
        isVIP?.let { body["is_vip"] = it }
        isBusiness?.let { body["is_business"] = it }
        notes?.let { body["notes"] = it }
        tags?.let { body["tags"] = it }
        return client.put("$baseUrl/api/courier/my-clients/$id") {
            contentType(ContentType.Application.Json)
            setBody(body)
        }.body()
    }

    override suspend fun deleteClient(id: Int): Boolean {
        return try {
            val response = client.delete("$baseUrl/api/courier/my-clients/$id") {
                contentType(ContentType.Application.Json)
            }
            response.status.value in 200..299
        } catch (e: Exception) {
            false
        }
    }

    override suspend fun getDeliveryClients(): ApiListResponse<DeliveryClient> {
        return try {
            client.get("$baseUrl/api/courier/delivery-clients") {
                contentType(ContentType.Application.Json)
            }.body()
        } catch (e: Exception) {
            ApiListResponse()
        }
    }

    // ── Vehicles API Impl ──

    override suspend fun getMyVehicles(): ApiListResponse<CourierVehicle> {
        return try {
            client.get("$baseUrl/api/courier/vehicles") {
                contentType(ContentType.Application.Json)
            }.body()
        } catch (e: Exception) {
            ApiListResponse()
        }
    }

    override suspend fun createVehicle(
        plate: String, type: String, insuranceExpiry: String?, testExpiry: String?,
        storageTypes: List<String>, isPrimary: Boolean
    ): CourierVehicle {
        return client.post("$baseUrl/api/courier/vehicles") {
            contentType(ContentType.Application.Json)
            setBody(mapOf(
                "plate_number" to plate,
                "vehicle_type" to type,
                "insurance_expiry" to (insuranceExpiry ?: ""),
                "test_expiry" to (testExpiry ?: ""),
                "storage_types" to storageTypes,
                "is_primary" to isPrimary
            ))
        }.body()
    }

    override suspend fun updateVehicle(
        id: Int, plate: String?, type: String?, insuranceExpiry: String?,
        testExpiry: String?, storageTypes: List<String>?
    ): CourierVehicle {
        val body = mutableMapOf<String, Any>()
        plate?.let { body["plate_number"] = it }
        type?.let { body["vehicle_type"] = it }
        insuranceExpiry?.let { body["insurance_expiry"] = it }
        testExpiry?.let { body["test_expiry"] = it }
        storageTypes?.let { body["storage_types"] = it }
        return client.put("$baseUrl/api/courier/vehicles/$id") {
            contentType(ContentType.Application.Json)
            setBody(body)
        }.body()
    }

    override suspend fun deleteVehicle(id: Int): Boolean {
        return try {
            val response = client.delete("$baseUrl/api/courier/vehicles/$id") {
                contentType(ContentType.Application.Json)
            }
            response.status.value in 200..299
        } catch (e: Exception) {
            false
        }
    }

    override suspend fun setPrimaryVehicle(id: Int): CourierVehicle {
        return client.put("$baseUrl/api/courier/vehicles/$id/primary") {
            contentType(ContentType.Application.Json)
        }.body()
    }

    // ── Ratings API Impl ──

    override suspend fun getMyRatingStats(): CourierRatingStats {
        return try {
            val resp: ApiObjectResponse<CourierRatingStats> = client.get("$baseUrl/api/courier/rating/stats") {
                contentType(ContentType.Application.Json)
            }.body()
            resp.data ?: CourierRatingStats()
        } catch (e: Exception) {
            CourierRatingStats()
        }
    }

    override suspend fun getMyRatingFeedback(): ApiListResponse<RatingFeedback> {
        return try {
            client.get("$baseUrl/api/courier/rating/feedback") {
                contentType(ContentType.Application.Json)
            }.body()
        } catch (e: Exception) {
            ApiListResponse()
        }
    }

    override suspend fun logContactInteraction(clientId: Int, message: String, addDelivery: Boolean, addRevenue: Double): Boolean {
        return try {
            val response = client.post("$baseUrl/api/courier/my-clients/$clientId/contact-log") {
                contentType(ContentType.Application.Json)
                setBody(mapOf(
                    "message" to message,
                    "add_delivery" to addDelivery,
                    "add_revenue" to addRevenue
                ))
            }
            response.status.value in 200..299
        } catch (e: Exception) {
            false
        }
    }

    override suspend fun sendQuote(request: QuoteRequest): Boolean {
        return try {
            val response = client.post("$baseUrl/api/courier/my-clients/${request.clientId}/quote") {
                contentType(ContentType.Application.Json)
                setBody(request)
            }
            response.status.value in 200..299
        } catch (e: Exception) {
            false
        }
    }

    override suspend fun getWalletBalance(): JsonElement {
        val response = client.get("$baseUrl/api/courier/wallet")
        return response.body()
    }

    override suspend fun createWithdrawal(amount: Double, paymentDetails: String): JsonElement {
        val response = client.post("$baseUrl/api/courier/wallet/withdraw") {
            contentType(ContentType.Application.Json)
            setBody(mapOf("amount" to amount, "payment_details" to paymentDetails))
        }
        return response.body()
    }

    override suspend fun getWalletHistory(): JsonElement {
        val response = client.get("$baseUrl/api/courier/wallet/history")
        return response.body()
    }

    override suspend fun getWithdrawalHistory(): JsonElement {
        val response = client.get("$baseUrl/api/courier/wallet/withdrawals")
        return response.body()
    }

    override suspend fun getPaymentMethods(): List<PaymentMethod> {
        return try {
            val response = client.get("$baseUrl/api/courier/wallet/payment-methods")
            val json = response.body<JsonElement>().jsonObject
            json.get("payment_methods")?.jsonArray?.map { item ->
                val obj = item.jsonObject
                PaymentMethod(
                    id = obj["id"]?.jsonPrimitive?.int ?: 0,
                    methodType = obj["method_type"]?.jsonPrimitive?.content ?: "",
                    label = obj["label"]?.jsonPrimitive?.content ?: "",
                    details = obj["details"]?.jsonObject?.mapValues { it.value.jsonPrimitive.content } ?: emptyMap(),
                    isDefault = obj["is_default"]?.jsonPrimitive?.boolean ?: false,
                    createdAt = obj["created_at"]?.jsonPrimitive?.contentOrNull
                )
            } ?: emptyList()
        } catch (e: Exception) {
            emptyList()
        }
    }

    override suspend fun addPaymentMethod(methodType: String, label: String, details: Map<String, String>, isDefault: Boolean): PaymentMethod? {
        return try {
            val response = client.post("$baseUrl/api/courier/wallet/payment-methods") {
                contentType(ContentType.Application.Json)
                setBody(mapOf(
                    "method_type" to methodType,
                    "label" to label,
                    "details" to details,
                    "is_default" to isDefault
                ))
            }
            val json = response.body<JsonElement>().jsonObject
            PaymentMethod(
                id = json["id"]?.jsonPrimitive?.int ?: 0,
                methodType = json["method_type"]?.jsonPrimitive?.content ?: "",
                label = json["label"]?.jsonPrimitive?.content ?: "",
                details = json["details"]?.jsonObject?.mapValues { it.value.jsonPrimitive.content } ?: emptyMap(),
                isDefault = json["is_default"]?.jsonPrimitive?.boolean ?: false,
                createdAt = json["created_at"]?.jsonPrimitive?.contentOrNull
            )
        } catch (e: Exception) {
            null
        }
    }

    override suspend fun setDefaultPaymentMethod(methodId: Int): Boolean {
        return try {
            val response = client.put("$baseUrl/api/courier/wallet/payment-methods/$methodId/default")
            response.status.value in 200..299
        } catch (e: Exception) {
            false
        }
    }

    override suspend fun deletePaymentMethod(methodId: Int): Boolean {
        return try {
            val response = client.delete("$baseUrl/api/courier/wallet/payment-methods/$methodId")
            response.status.value in 200..299
        } catch (e: Exception) {
            false
        }
    }

    override suspend fun getMyNotifications(page: Int, unreadOnly: Boolean): ApiListResponse<CourierNotification> {
        return try {
            client.get("$baseUrl/api/courier/notifications") {
                parameter("page", page)
                parameter("unread_only", if (unreadOnly) "true" else "false")
            }.body()
        } catch (e: Exception) {
            ApiListResponse()
        }
    }

    override suspend fun markNotificationRead(notificationId: Int): Boolean {
        return try {
            val response = client.post("$baseUrl/api/courier/notifications/$notificationId/read")
            response.status.value in 200..299
        } catch (e: Exception) {
            false
        }
    }

    override suspend fun markAllNotificationsRead(): Boolean {
        return try {
            val response = client.post("$baseUrl/api/courier/notifications/read-all")
            response.status.value in 200..299
        } catch (e: Exception) {
            false
        }
    }

    override suspend fun getMySchedule(year: Int, month: Int): ApiListResponse<ScheduleDelivery> {
        return try {
            client.get("$baseUrl/api/courier/schedule") {
                parameter("year", year)
                parameter("month", month)
            }.body()
        } catch (e: Exception) {
            ApiListResponse()
        }
    }

    override suspend fun createScheduleEntry(
        title: String,
        date: String,
        start: String,
        end: String?,
        pickupAddress: String,
        dropoffAddress: String
    ): Boolean {
        return try {
            client.post("$baseUrl/api/courier/schedule") {
                contentType(ContentType.Application.Json)
                setBody(
                    CreateScheduleEntryRequest(
                        title = title,
                        date = date,
                        start = start,
                        end = end,
                        pickupAddress = pickupAddress,
                        dropoffAddress = dropoffAddress,
                    )
                )
            }.status.value in 200..299
        } catch (e: Exception) {
            false
        }
    }

    // ── Business API Impl ──

    override suspend fun getBusinessExpenses(year: Int?, month: Int?): ApiListResponse<BusinessExpense> {
        return try {
            client.get("$baseUrl/api/courier/business/expenses") {
                if (year != null) parameter("year", year)
                if (month != null) parameter("month", month)
            }.body()
        } catch (e: Exception) {
            ApiListResponse()
        }
    }

    override suspend fun createBusinessExpense(category: String, description: String, amount: Double, paymentMethod: String?): Boolean {
        return try {
            val body = mutableMapOf<String, Any>(
                "category" to category,
                "description" to description,
                "amount" to amount
            )
            paymentMethod?.let { body["payment_method"] = it }
            val response = client.post("$baseUrl/api/courier/business/expenses") {
                contentType(ContentType.Application.Json)
                setBody(body)
            }
            response.status.value in 200..299
        } catch (e: Exception) {
            false
        }
    }

    override suspend fun deleteBusinessExpense(id: Int): Boolean {
        return try {
            val response = client.delete("$baseUrl/api/courier/business/expenses/$id")
            response.status.value in 200..299
        } catch (e: Exception) {
            false
        }
    }

    override suspend fun getExpenseSummary(year: Int?, month: Int?): ExpenseSummary {
        return try {
            val resp: ApiObjectResponse<ExpenseSummary> = client.get("$baseUrl/api/courier/business/expenses/summary") {
                if (year != null) parameter("year", year)
                if (month != null) parameter("month", month)
            }.body()
            resp.data ?: ExpenseSummary()
        } catch (e: Exception) {
            ExpenseSummary()
        }
    }

    override suspend fun getBusinessReceipts(year: Int?, month: Int?): ApiListResponse<CourierReceipt> {
        return try {
            client.get("$baseUrl/api/courier/business/receipts") {
                if (year != null) parameter("year", year)
                if (month != null) parameter("month", month)
            }.body()
        } catch (e: Exception) {
            ApiListResponse()
        }
    }

    override suspend fun createReceipt(clientName: String, amount: Double, description: String?, paymentMethod: String?, clientTaxId: String?): CourierReceipt? {
        return try {
            val body = mutableMapOf<String, Any>(
                "client_name" to clientName,
                "amount" to amount
            )
            description?.let { body["description"] = it }
            paymentMethod?.let { body["payment_method"] = it }
            clientTaxId?.let { body["client_tax_id"] = it }
            val resp: ApiObjectResponse<CourierReceipt> = client.post("$baseUrl/api/courier/business/receipts") {
                contentType(ContentType.Application.Json)
                setBody(body)
            }.body()
            resp.data
        } catch (e: Exception) {
            null
        }
    }

    override suspend fun downloadReceiptDocument(id: Int, format: String): ByteArray? {
        return try {
            val response = client.get("$baseUrl/api/courier/business/receipts/$id/document") {
                parameter("format", format)
            }
            if (response.status.value in 200..299) response.body<ByteArray>() else null
        } catch (e: Exception) {
            null
        }
    }

    override suspend fun getBusinessOverview(year: Int?, month: Int?): BusinessOverview {
        return try {
            val resp: ApiObjectResponse<BusinessOverview> = client.get("$baseUrl/api/courier/business/overview") {
                if (year != null) parameter("year", year)
                if (month != null) parameter("month", month)
            }.body()
            resp.data ?: BusinessOverview()
        } catch (e: Exception) {
            BusinessOverview()
        }
    }

    override suspend fun getMonthlyReport(year: Int?, month: Int?): MonthlyReport {
        return try {
            val resp: ApiObjectResponse<MonthlyReport> = client.get("$baseUrl/api/courier/business/reports/monthly") {
                if (year != null) parameter("year", year)
                if (month != null) parameter("month", month)
            }.body()
            resp.data ?: MonthlyReport()
        } catch (e: Exception) {
            MonthlyReport()
        }
    }

    override suspend fun getAnnualReport(year: Int?): AnnualReport {
        return try {
            val resp: ApiObjectResponse<AnnualReport> = client.get("$baseUrl/api/courier/business/reports/annual") {
                if (year != null) parameter("year", year)
            }.body()
            resp.data ?: AnnualReport()
        } catch (e: Exception) {
            AnnualReport()
        }
    }

    // ── Support Tickets API Impl ──

    override suspend fun getSupportTickets(): List<CourierSupportTicket> {
        return try {
            client.get("$baseUrl/api/support/tickets").body()
        } catch (e: Exception) {
            emptyList()
        }
    }

    override suspend fun getSupportTicketDetail(ticketId: Int): CourierSupportDetail? {
        return try {
            client.get("$baseUrl/api/support/tickets/$ticketId").body()
        } catch (e: Exception) {
            null
        }
    }

    override suspend fun createSupportTicket(subject: String, message: String, priority: String): CreateSupportTicketResponse? {
        return try {
            client.post("$baseUrl/api/support/tickets") {
                contentType(ContentType.Application.Json)
                setBody(mapOf(
                    "subject" to subject,
                    "message" to message,
                    "priority" to priority
                ))
            }.body()
        } catch (e: Exception) {
            null
        }
    }

    override suspend fun addSupportTicketMessage(ticketId: Int, message: String): AddSupportMessageResponse? {
        return try {
            client.post("$baseUrl/api/support/tickets/$ticketId/messages") {
                contentType(ContentType.Application.Json)
                setBody(AddSupportMessageRequest(message = message))
            }.body()
        } catch (e: Exception) {
            null
        }
    }
}
