package com.tzir.delivery.courier.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class DeliveryClient(
    @SerialName("order_id")
    val orderId: Int = 0,
    val name: String = "",
    val phone: String = "",
    @SerialName("pickup_address")
    val pickupAddress: String = "",
    @SerialName("dropoff_address")
    val dropoffAddress: String = "",
    @SerialName("delivery_date")
    val deliveryDate: String = "",
    @SerialName("delivery_type")
    val deliveryType: String = "standard",
    val notes: String = ""
)
