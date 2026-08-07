package com.tzir.delivery.courier.util

object PricingCalculator {
    const val BASE_RATE = 20.0
    const val RATE_PER_KM = 5.0
    const val RATE_PER_KG_OVER_5 = 2.0
    const val RATE_PER_WAIT_MINUTE = 0.5
    const val RUSH_HOUR_MULTIPLIER = 1.5
    const val NIGHT_MULTIPLIER = 1.25
    const val FREE_WEIGHT_KG = 5.0

    fun estimateEarnings(
        distanceKm: Double = 0.0,
        weightKg: Double = 0.0,
        waitMinutes: Double = 0.0,
        hour: Int = 12,
        isRushHour: Boolean? = null,
        isNight: Boolean? = null
    ): Double {
        val rush = isRushHour ?: isRushHour(hour)
        val night = isNight ?: isNightTime(hour)

        var total = BASE_RATE
        total += distanceKm * RATE_PER_KM
        total += maxOf(0.0, weightKg - FREE_WEIGHT_KG) * RATE_PER_KG_OVER_5
        total += waitMinutes * RATE_PER_WAIT_MINUTE

        if (rush) total *= RUSH_HOUR_MULTIPLIER
        if (night) total *= NIGHT_MULTIPLIER

        return total
    }

    fun estimateWeeklyChart(deliveryCounts: List<Int>): List<Float> {
        val avgPerDelivery = BASE_RATE + 5.0 * RATE_PER_KM
        return deliveryCounts.map { (it * avgPerDelivery).toFloat() }
    }

    fun isRushHour(hour: Int): Boolean = (hour in 8..10) || (hour in 17..19)
    fun isNightTime(hour: Int): Boolean = hour < 6 || hour >= 20
}
