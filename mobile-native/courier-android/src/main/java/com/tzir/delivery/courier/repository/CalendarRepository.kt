package com.tzir.delivery.courier.repository

import com.tzir.delivery.courier.model.ScheduleDelivery
import com.tzir.delivery.courier.network.DeliveryApi
import com.tzir.delivery.courier.ui.courier.CalendarDelivery
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class CalendarRepository(
    private val api: DeliveryApi? = null
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    private val _deliveries = MutableStateFlow<Map<Int, List<CalendarDelivery>>>(emptyMap())
    val deliveries: StateFlow<Map<Int, List<CalendarDelivery>>> = _deliveries.asStateFlow()

    private val _isOffline = MutableStateFlow(false)
    val isOffline: StateFlow<Boolean> = _isOffline.asStateFlow()

    private val _loading = MutableStateFlow(false)
    val loading: StateFlow<Boolean> = _loading.asStateFlow()

    fun setDayDeliveries(day: Int, items: List<CalendarDelivery>) {
        val updated = _deliveries.value.toMutableMap()
        updated[day] = items
        _deliveries.value = updated
    }

    fun getDeliveriesForDay(day: Int): List<CalendarDelivery> {
        return _deliveries.value[day] ?: emptyList()
    }

    suspend fun refresh(year: Int? = null, month: Int? = null) {
        _loading.value = true
        try {
            api?.let {
                val now = java.util.Calendar.getInstance()
                val y = year ?: now.get(java.util.Calendar.YEAR)
                val m = month ?: (now.get(java.util.Calendar.MONTH) + 1)
                val response = it.getMySchedule(y, m)
                val grouped = mutableMapOf<Int, MutableList<CalendarDelivery>>()
                for (sd in response.data) {
                    val cd = CalendarDelivery(
                        id = sd.id,
                        address = sd.address,
                        pickupAddress = sd.pickupAddress,
                        dropoffAddress = sd.dropoffAddress,
                        hour = sd.hour,
                        minute = sd.minute,
                        durationMin = sd.durationMin,
                        status = sd.status
                    )
                    grouped.getOrPut(sd.day) { mutableListOf() }.add(cd)
                }
                _deliveries.value = grouped
            }
            _isOffline.value = false
        } catch (e: Exception) {
            _isOffline.value = true
        } finally {
            _loading.value = false
        }
    }

    suspend fun createScheduleEntry(
        title: String,
        date: String,
        start: String,
        end: String? = null,
        pickupAddress: String = "",
        dropoffAddress: String = ""
    ): Boolean {
        return try {
            val ok = api?.createScheduleEntry(title, date, start, end, pickupAddress, dropoffAddress) ?: false
            if (ok) refresh()
            ok
        } catch (e: Exception) {
            false
        }
    }

    fun clear() {
        _deliveries.value = emptyMap()
    }
}
