
package com.tzir.delivery.shared.location

import com.tzir.delivery.shared.network.DeliveryApi
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
        var instance: LocationManager? = null
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
            // Tel Aviv Center coordinates
            var lat = 32.0853
            var lng = 34.7818

            while (isActive) {
                // Simulate small movement
                lat += (Random.nextDouble() - 0.5) * 0.001
                lng += (Random.nextDouble() - 0.5) * 0.001

                _currentLocation.value = lat to lng
                val success = api.sendLocation(courierId, lat, lng)
                println("Location update sent: $lat, $lng (Success: $success)")

                delay(3000) // Send every 3 seconds
            }
        }
    }

    fun stopTracking() {
        trackingJob?.cancel()
        trackingJob = null
        _currentLocation.value = null
    }
}
