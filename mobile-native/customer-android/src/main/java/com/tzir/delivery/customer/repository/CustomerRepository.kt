package com.tzir.delivery.customer.repository

import com.tzir.delivery.customer.model.*
import com.tzir.delivery.customer.network.DeliveryApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

class CustomerRepository private constructor(private val api: DeliveryApi) {
    private val _activeOrders = MutableStateFlow<List<Order>>(emptyList())
    val activeOrders: StateFlow<List<Order>> = _activeOrders.asStateFlow()

    private val _orderHistory = MutableStateFlow<List<Order>>(emptyList())
    val orderHistory: StateFlow<List<Order>> = _orderHistory.asStateFlow()

    suspend fun refreshActiveOrders() {
        try {
            _activeOrders.value = api.getActiveOrders()
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    suspend fun refreshOrderHistory() {
        try {
            _orderHistory.value = api.getOrderHistory()
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    suspend fun createOrder(request: CreateOrderRequest): String? {
        return api.createOrder(request)
    }

    suspend fun getOrderQuote(pLat: Double, pLng: Double, dLat: Double, dLng: Double): QuoteResponse? {
        return api.getOrderQuote(pLat, pLng, dLat, dLng)
    }

    /**
     * Returns the full URL to download the PDF invoice for a given order ID.
     * Backend: GET /api/invoices/by-order/<orderId>/download
     * Returns null if no invoice is found.
     */
    suspend fun getInvoiceDownloadUrl(orderId: String): String? {
        return try {
            api.getInvoiceDownloadUrl(orderId)
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

    // ── Support Tickets ──

    suspend fun getSupportTickets(): List<CustomerSupportTicket> =
        try {
            api.getSupportTickets()
        } catch (e: Exception) {
            e.printStackTrace()
            emptyList()
        }

    suspend fun getSupportTicketDetail(ticketId: Int): CustomerSupportDetail? =
        try {
            api.getSupportTicketDetail(ticketId)
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }

    suspend fun createSupportTicket(subject: String, message: String, priority: String = "medium"): CreateSupportTicketResponse? =
        try {
            api.createSupportTicket(subject, message, priority)
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }

    suspend fun addSupportTicketMessage(ticketId: Int, message: String): AddSupportMessageResponse? =
        try {
            api.addSupportTicketMessage(ticketId, message)
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }

    companion object {
        private var instance: CustomerRepository? = null
        fun getInstance(api: DeliveryApi): CustomerRepository {
            return instance ?: synchronized(this) {
                instance ?: CustomerRepository(api).also { instance = it }
            }
        }
    }
}
