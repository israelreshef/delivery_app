package com.tzir.delivery.courier.repository

import com.tzir.delivery.courier.model.CourierStats
import com.tzir.delivery.courier.network.DeliveryApi
import com.tzir.delivery.courier.util.PricingCalculator
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class WeeklyChartData(
    val values: List<Float> = emptyList(),
    val labels: List<String> = emptyList()
)

data class PeakHourData(
    val range: String,
    val percentage: Float,
    val colorHex: Long
)

class EarningsRepository(
    private val api: DeliveryApi? = null
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    private val _weeklyChart = MutableStateFlow(WeeklyChartData())
    val weeklyChart: StateFlow<WeeklyChartData> = _weeklyChart.asStateFlow()

    private val _peakHours = MutableStateFlow<List<PeakHourData>>(emptyList())
    val peakHours: StateFlow<List<PeakHourData>> = _peakHours.asStateFlow()

    private val _isOffline = MutableStateFlow(false)
    val isOffline: StateFlow<Boolean> = _isOffline.asStateFlow()

    fun calculateFromStats(stats: CourierStats?) {
        val counts = listOf(
            (stats?.totalDeliveries?.div(7))?.coerceAtLeast(1) ?: 8,
            (stats?.totalDeliveries?.div(5))?.coerceAtLeast(2) ?: 12,
            (stats?.totalDeliveries?.div(4))?.coerceAtLeast(3) ?: 15,
            (stats?.totalDeliveries?.div(3))?.coerceAtLeast(4) ?: 20,
            (stats?.totalDeliveries?.div(4))?.coerceAtLeast(3) ?: 18,
            (stats?.totalDeliveries?.div(3))?.coerceAtLeast(4) ?: 22,
            stats?.totalDeliveries?.coerceAtLeast(5) ?: 25,
        )
        _weeklyChart.value = WeeklyChartData(
            values = PricingCalculator.estimateWeeklyChart(counts),
            labels = listOf("יום א", "יום ב", "יום ג", "יום ד", "יום ה", "יום ו", "שבת")
        )
        _peakHours.value = listOf(
            PeakHourData("08:00-10:00", 0.28f, 0xFFF59E0B),
            PeakHourData("12:00-14:00", 0.22f, 0xFF3B82F6),
            PeakHourData("17:00-19:00", 0.35f, 0xFFEF4444),
            PeakHourData("20:00-22:00", 0.15f, 0xFF8B5CF6),
        )
    }

    suspend fun refresh(userId: Int, stats: CourierStats?) {
        try {
            api?.let {
                // Future: call real API endpoint
            }
            calculateFromStats(stats)
            _isOffline.value = false
        } catch (e: Exception) {
            _isOffline.value = true
        }
    }
}
