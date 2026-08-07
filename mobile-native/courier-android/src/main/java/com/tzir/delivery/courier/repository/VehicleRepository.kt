package com.tzir.delivery.courier.repository

import com.tzir.delivery.courier.database.VehicleDao
import com.tzir.delivery.courier.database.toEntity
import com.tzir.delivery.courier.database.toModel
import com.tzir.delivery.courier.model.CourierVehicle
import com.tzir.delivery.courier.network.DeliveryApi
import com.tzir.delivery.courier.util.ConnectivityObserver
import com.tzir.delivery.courier.util.ConnectionState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class VehicleRepository(
    private val api: DeliveryApi,
    private val vehicleDao: VehicleDao? = null,
    connectivityObserver: ConnectivityObserver? = null
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    // ── Single Source of Truth ──
    // Room is the cache; the UI reads from this StateFlow which mirrors the
    // Room table. Any insert/delete into Room auto-updates the UI.
    val vehicles: StateFlow<List<CourierVehicle>> = (vehicleDao?.getAll() ?: kotlinx.coroutines.flow.flowOf(emptyList()))
        .map { list -> list.map { it.toModel() } }
        .stateIn(scope, SharingStarted.WhileSubscribed(5000), emptyList())

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
                        if (wasOffline && nowOnline) refresh()
                    }
                }
            }
    }

    suspend fun refresh() {
        try {
            val result = api.getMyVehicles().data
            vehicleDao?.let { dao ->
                dao.clearAll()
                dao.insertAll(result.map { it.toEntity() })
            }
            _isOffline.value = false
        } catch (e: Exception) {
            // Vehicles StateFlow already holds the last Room cache
            _isOffline.value = true
        }
    }

    suspend fun addVehicle(
        plate: String, type: String,
        insuranceExpiry: String? = null, testExpiry: String? = null,
        storageTypes: List<String>, isPrimary: Boolean = false
    ): CourierVehicle? {
        return try {
            val v = api.createVehicle(plate, type, insuranceExpiry, testExpiry, storageTypes, isPrimary)
            vehicleDao?.insert(v.toEntity()) // triggers StateFlow update
            _isOffline.value = false
            v
        } catch (e: Exception) {
            null
        }
    }

    suspend fun deleteVehicle(id: Int): Boolean {
        val ok = api.deleteVehicle(id)
        if (ok) vehicleDao?.deleteById(id)
        return ok
    }

    suspend fun setPrimary(id: Int): CourierVehicle? {
        return try {
            val v = api.setPrimaryVehicle(id)
            refresh() // refresh to update is_primary across all rows (server enforces single primary)
            v
        } catch (e: Exception) {
            null
        }
    }
}
