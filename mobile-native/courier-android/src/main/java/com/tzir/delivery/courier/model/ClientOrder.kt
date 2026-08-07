package com.tzir.delivery.courier.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class ClientOrder(
    val id: Int = 0,
    @SerialName("order_number")
    val orderNumber: String = "",
    val status: String = "",
    @SerialName("delivery_fee")
    val deliveryFee: Double = 0.0,
    @SerialName("package_description")
    val packageDescription: String = "",
    @SerialName("pickup_address")
    val pickupAddress: String = "",
    @SerialName("dropoff_address")
    val dropoffAddress: String = "",
    @SerialName("created_at")
    val createdAt: String? = null,
    @SerialName("delivered_at")
    val deliveredAt: String? = null
)
