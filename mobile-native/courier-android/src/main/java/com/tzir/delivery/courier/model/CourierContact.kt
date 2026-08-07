package com.tzir.delivery.courier.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class CourierContact(
    val id: Int = 0,
    @SerialName("courier_id")
    val courierId: Int = 0,
    val name: String = "",
    val company: String = "",
    val phone: String = "",
    val email: String = "",
    val addresses: List<String> = emptyList(),
    @SerialName("is_vip")
    val isVIP: Boolean = false,
    @SerialName("is_business")
    val isBusiness: Boolean = false,
    @SerialName("total_deliveries")
    val totalDeliveries: Int = 0,
    @SerialName("total_revenue")
    val totalRevenue: Double = 0.0,
    @SerialName("last_interaction")
    val lastInteraction: String = "",
    val notes: String = "",
    val tags: List<String> = emptyList(),
    @SerialName("created_at")
    val createdAt: String = "",
    @SerialName("updated_at")
    val updatedAt: String = ""
)
