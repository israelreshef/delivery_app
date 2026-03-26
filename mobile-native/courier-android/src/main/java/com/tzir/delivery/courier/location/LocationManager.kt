package com.tzir.delivery.courier.location

import com.tzir.delivery.courier.model.LocationRequest
import com.tzir.delivery.courier.network.DeliveryApi
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

class LocationManager(private val api: DeliveryApi) {
    companion object {
        private var instance: LocationManager? = null
        fun getInstance(api: DeliveryApi): LocationManager {
            return instance ?: synchronized(this) {
                instance ?: LocationManager(api).also { instance = it }
            }
        }
    }
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
            // Tel Aviv Center coordinates as default
            var lat = 32.0853
            var lng = 34.7818

            while (isActive) {
                // If we have a real location, use it instead of simulating
                val current = _currentLocation.value
                if (current != null) {
                    lat = current.first
                    lng = current.second
                } else {
                    // Simulate small movement if no real location
                    lat += (Random.nextDouble() - 0.5) * 0.001
                    lng += (Random.nextDouble() - 0.5) * 0.001
                }

                _currentLocation.value = lat to lng
                api.sendLocation(LocationRequest(courierId, lat, lng))

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
