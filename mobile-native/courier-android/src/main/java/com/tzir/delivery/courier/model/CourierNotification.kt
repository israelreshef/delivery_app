package com.tzir.delivery.courier.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class CourierNotification(
    val id: Int = 0,
    val type: String = "push",
    val title: String = "",
    val message: String = "",
    @SerialName("is_read") val isRead: Boolean = false,
    @SerialName("delivery_id") val deliveryId: Int? = null,
    @SerialName("sent_at") val sentAt: String? = null,
)

@Serializable
data class ScheduleDelivery(
    val id: Int = 0,
    @SerialName("order_number") val orderNumber: String = "",
    val address: String = "",
    @SerialName("pickup_address") val pickupAddress: String = "",
    @SerialName("dropoff_address") val dropoffAddress: String = "",
    val day: Int = 0,
    val hour: Int = 0,
    val minute: Int = 0,
    @SerialName("duration_min") val durationMin: Int = 45,
    val status: String = "",
    @SerialName("delivery_fee") val deliveryFee: Double = 0.0,
)

@Serializable
data class CreateScheduleEntryRequest(
    val title: String,
    val date: String,
    val start: String,
    val end: String? = null,
    @SerialName("pickup_address") val pickupAddress: String = "",
    @SerialName("dropoff_address") val dropoffAddress: String = "",
)
