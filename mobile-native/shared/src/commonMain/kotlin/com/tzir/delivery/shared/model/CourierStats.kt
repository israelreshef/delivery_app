
package com.tzir.delivery.shared.model

import kotlinx.serialization.Serializable

@Serializable
data class CourierStats(
    val totalDeliveries: Int,
    val todayEarnings: Double,
    val weeklyEarnings: Double,
    val rating: Double,
    val balance: Double,
    val performanceIndex: Double = 0.0,
    val rankBadge: String = "Standard",
    val completionRate: Int = 96,
    val avgDeliveryMins: Int = 22
)
