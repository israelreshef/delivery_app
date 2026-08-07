package com.tzir.delivery.courier.ui.courier

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tzir.delivery.courier.location.LocationManager
import com.tzir.delivery.courier.repository.CourierRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class DashboardViewModel @Inject constructor(
    private val repository: CourierRepository,
    private val locationManager: LocationManager
) : ViewModel() {

    val uiState: StateFlow<DashboardUiState> = combine(
        repository.availableMissions,
        repository.activeMissions,
        repository.stats,
        repository.isOffline,
        locationManager.currentLocation
    ) { available, active, stats, offline, location ->
        DashboardUiState(
            availableMissions = available,
            activeMissions = active,
            stats = stats,
            isOffline = offline,
            currentLocation = location
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), DashboardUiState())

    init {
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            repository.refreshStats()
            repository.refreshActiveMissions()
            repository.refreshAvailableMissions()
        }
    }

    fun acceptMission(missionId: Int) {
        viewModelScope.launch {
            repository.acceptMission(missionId)
        }
    }

    fun rejectMission(missionId: Int) {
        viewModelScope.launch {
            repository.rejectMission(missionId)
        }
    }
}
