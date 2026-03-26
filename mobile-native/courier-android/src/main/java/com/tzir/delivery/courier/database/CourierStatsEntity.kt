package com.tzir.delivery.courier.database

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.tzir.delivery.courier.model.CourierStats

@Entity(tableName = "courier_stats")
data class CourierStatsEntity(
    @PrimaryKey
    val id: Int = 0,
    val totalDeliveries: Int,
    val todayEarnings: Double,
    val weeklyEarnings: Double,
    val rating: Double,
    val balance: Double,
    val performanceIndex: Double,
    val rankBadge: String,
    val completionRate: Double,
    val avgDeliveryMins: Int,
    val isAvailable: Boolean
) {
    fun toModel() = CourierStats(
        totalDeliveries = totalDeliveries,
        todayEarnings = todayEarnings,
        weeklyEarnings = weeklyEarnings,
        rating = rating,
        balance = balance,
        performanceIndex = performanceIndex,
        rankBadge = rankBadge,
        completionRate = completionRate,
        avgDeliveryMins = avgDeliveryMins,
        isAvailable = isAvailable
    )

    companion object {
        fun fromModel(stats: CourierStats) = CourierStatsEntity(
            totalDeliveries = stats.totalDeliveries,
            todayEarnings = stats.todayEarnings,
            weeklyEarnings = stats.weeklyEarnings,
            rating = stats.rating,
            balance = stats.balance,
            performanceIndex = stats.performanceIndex,
            rankBadge = stats.rankBadge,
            completionRate = stats.completionRate,
            avgDeliveryMins = stats.avgDeliveryMins,
            isAvailable = stats.isAvailable
        )
    }
}