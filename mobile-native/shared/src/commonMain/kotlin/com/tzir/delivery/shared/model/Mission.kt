
package com.tzir.delivery.shared.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class Mission(
    val id: Int,
    @SerialName("order_number")
    val orderNumber: String,
    val status: String,
    @SerialName("pickup_address")
    val pickupAddress: String,
    @SerialName("delivery_address")
    val deliveryAddress: String,
    @SerialName("package_description")
    val packageDescription: String = "",
    @SerialName("completed_at")
    val completedAt: String? = null,
    @SerialName("estimated_price")
    val estimatedPrice: Double,
    @SerialName("pickup_lat")
    val pickupLat: Double? = null,
    @SerialName("pickup_lng")
    val pickupLng: Double? = null,
    @SerialName("delivery_lat")
    val deliveryLat: Double? = null,
    @SerialName("delivery_lng")
    val deliveryLng: Double? = null,
    @SerialName("distance_km")
    val distanceKm: Double = 0.0,
    @SerialName("duration_mins")
    val durationMins: Int? = null,
    @SerialName("base_fare")
    val baseFare: Double = 0.0,
    val tip: Double = 0.0,
    @SerialName("otp_verified")
    val otpVerified: Boolean = false,
    @SerialName("is_otp_required")
    val isOtpRequired: Boolean = true
)
