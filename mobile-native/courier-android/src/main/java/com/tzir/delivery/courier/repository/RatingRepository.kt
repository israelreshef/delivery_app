package com.tzir.delivery.courier.repository

import com.tzir.delivery.courier.model.CourierRatingStats
import com.tzir.delivery.courier.model.RatingFeedback
import com.tzir.delivery.courier.network.DeliveryApi
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class RatingRepository(
    private val api: DeliveryApi
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    private val _stats = MutableStateFlow(CourierRatingStats())
    val stats: StateFlow<CourierRatingStats> = _stats.asStateFlow()

    private val _feedback = MutableStateFlow<List<RatingFeedback>>(emptyList())
    val feedback: StateFlow<List<RatingFeedback>> = _feedback.asStateFlow()

    private val _isOffline = MutableStateFlow(false)
    val isOffline: StateFlow<Boolean> = _isOffline.asStateFlow()

    // ── Single Source of Truth: API is truth, StateFlow is the UI mirror ──
    suspend fun refresh() {
        try {
            _stats.value = api.getMyRatingStats()
            _feedback.value = api.getMyRatingFeedback().data
            _isOffline.value = false
        } catch (e: Exception) {
            _isOffline.value = true
        }
    }
}
