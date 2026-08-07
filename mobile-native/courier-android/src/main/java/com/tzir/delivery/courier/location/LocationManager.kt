package com.tzir.delivery.courier.location

import com.tzir.delivery.courier.database.LocationUpdateDao
import com.tzir.delivery.courier.database.LocationUpdateEntity
import com.tzir.delivery.courier.model.LocationRequest
import com.tzir.delivery.courier.network.DeliveryApi
import com.tzir.delivery.courier.services.SyncManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlin.random.Random

class LocationManager(
    private val api: DeliveryApi,
    private val syncManager: SyncManager? = null,
    private val locationUpdateDao: LocationUpdateDao? = null
) {
    private var trackingJob: Job? = null
    private val scope = CoroutineScope(Dispatchers.Default)

    private val _currentLocation = MutableStateFlow<Pair<Double, Double>?>(null)
    val currentLocation: StateFlow<Pair<Double, Double>?> = _currentLocation.asStateFlow()

    fun updateRealLocation(lat: Double, lng: Double) {
        _currentLocation.value = lat to lng
    }

    fun startTracking(courierId: String) {
        if (trackingJob?.isActive == true) return

        trackingJob = scope.launch {
            var lat = 32.0853
            var lng = 34.7818

            while (isActive) {
                val current = _currentLocation.value
                if (current != null) {
                    lat = current.first
                    lng = current.second
                } else {
                    lat += (Random.nextDouble() - 0.5) * 0.001
                    lng += (Random.nextDouble() - 0.5) * 0.001
                }

                _currentLocation.value = lat to lng
                try {
                    api.sendLocation(LocationRequest(courierId, lat, lng))
                } catch (e: Exception) {
                    locationUpdateDao?.insert(LocationUpdateEntity(latitude = lat, longitude = lng))
                    syncManager?.enqueue("SEND_LOCATION", "/api/couriers/location",
                        """{"courier_id": "$courierId", "lat": $lat, "lng": $lng}""", "POST")
                }

                delay(3000)
            }
        }
    }

    fun stopTracking() {
        trackingJob?.cancel()
        trackingJob = null
        _currentLocation.value = null
    }
}
