package com.tzir.delivery.courier.ui.courier

import com.tzir.delivery.courier.model.CourierStats
import com.tzir.delivery.courier.model.Mission

data class DashboardUiState(
    val availableMissions: List<Mission> = emptyList(),
    val activeMissions: List<Mission> = emptyList(),
    val stats: CourierStats? = null,
    val isLoading: Boolean = false,
    val isOffline: Boolean = false,
    val currentLocation: Pair<Double, Double>? = null
)
