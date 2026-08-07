package com.tzir.delivery.courier.repository

import com.tzir.delivery.courier.database.ContactDao
import com.tzir.delivery.courier.database.ContactEntity
import com.tzir.delivery.courier.database.toEntity
import com.tzir.delivery.courier.database.toModel
import com.tzir.delivery.courier.model.ClientOrder
import com.tzir.delivery.courier.model.ClientTask
import com.tzir.delivery.courier.model.CourierContact
import com.tzir.delivery.courier.model.DeliveryClient
import com.tzir.delivery.courier.model.QuoteRequest
import com.tzir.delivery.courier.network.DeliveryApi
import com.tzir.delivery.courier.util.ConnectivityObserver
import com.tzir.delivery.courier.util.ConnectionState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class ContactRepository(
    private val api: DeliveryApi,
    private val contactDao: ContactDao? = null,
    connectivityObserver: ConnectivityObserver? = null
) {
    private val scope = CoroutineScope(SupervisorJob())
    private val _myClients = MutableStateFlow<List<CourierContact>>(emptyList())
    val myClients: StateFlow<List<CourierContact>> = _myClients.asStateFlow()

    private val _deliveryClients = MutableStateFlow<List<DeliveryClient>>(emptyList())
    val deliveryClients: StateFlow<List<DeliveryClient>> = _deliveryClients.asStateFlow()

    private val _isOffline = MutableStateFlow(false)
    val isOffline: StateFlow<Boolean> = _isOffline.asStateFlow()

    init {
        connectivityObserver?.connectionState?.stateIn(scope, SharingStarted.Eagerly, ConnectionState.Unavailable)
            ?.let { connectionFlow ->
                scope.launch {
                    connectionFlow.collect { state ->
                        val wasOffline = _isOffline.value
                        val nowOnline = state is ConnectionState.Available
                        _isOffline.value = !nowOnline
                        if (wasOffline && nowOnline) {
                            refreshMyClients()
                            refreshDeliveryClients()
                        }
                    }
                }
            }
    }

    suspend fun refreshMyClients(search: String? = null) {
        try {
            val clients = api.getMyClients(search = search).data
            _myClients.value = clients
            _isOffline.value = false
            contactDao?.let { dao ->
                dao.clearAll()
                dao.insertAll(clients.map { it.toEntity() })
            }
        } catch (e: Exception) {
            _isOffline.value = true
            _myClients.value = contactDao?.getAll()?.map { it.toModel() } ?: emptyList()
        }
    }

    suspend fun createClient(
        name: String, company: String = "", phone: String = "", email: String = "",
        addresses: List<String> = emptyList(), isVIP: Boolean = false, isBusiness: Boolean = false,
        notes: String = "", tags: List<String> = emptyList()
    ): CourierContact? {
        return try {
            val client = api.createClient(name, company, phone, email, addresses, isVIP, isBusiness, notes, tags)
            refreshMyClients()
            client
        } catch (e: Exception) {
            null
        }
    }

    suspend fun updateClient(id: Int, fields: Map<String, Any?>): CourierContact? {
        return try {
            val client = api.updateClient(
                id = id,
                name = fields["name"] as? String,
                company = fields["company"] as? String,
                phone = fields["phone"] as? String,
                email = fields["email"] as? String,
                addresses = fields["addresses"] as? List<String>,
                isVIP = fields["is_vip"] as? Boolean,
                isBusiness = fields["is_business"] as? Boolean,
                notes = fields["notes"] as? String,
                tags = fields["tags"] as? List<String>
            )
            refreshMyClients()
            client
        } catch (e: Exception) {
            null
        }
    }

    suspend fun deleteClient(id: Int): Boolean {
        val success = api.deleteClient(id)
        if (success) refreshMyClients()
        return success
    }

    suspend fun refreshDeliveryClients() {
        try {
            _deliveryClients.value = api.getDeliveryClients().data
            _isOffline.value = false
        } catch (e: Exception) {
            _isOffline.value = true
        }
    }

    suspend fun logInteraction(clientId: Int, message: String, addDelivery: Boolean = false, addRevenue: Double = 0.0): Boolean {
        val success = api.logContactInteraction(clientId, message, addDelivery, addRevenue)
        if (success) refreshMyClients()
        return success
    }

    suspend fun sendQuote(clientId: Int, description: String, price: Double): Boolean {
        return api.sendQuote(QuoteRequest(clientId, description, price))
    }

    suspend fun getClientOrders(clientId: Int): List<ClientOrder> {
        val orders = api.getClientOrders(clientId)
        _isOffline.value = false
        return orders
    }

    suspend fun getClientTasks(clientId: Int): List<ClientTask> {
        return api.getClientTasks(clientId)
    }

    suspend fun createClientTask(clientId: Int, title: String, description: String? = null, dueDate: String? = null, priority: String = "medium"): ClientTask {
        return api.createClientTask(clientId, title, description, dueDate, priority)
    }
}
