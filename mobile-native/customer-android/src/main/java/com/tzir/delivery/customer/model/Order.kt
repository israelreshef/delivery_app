package com.tzir.delivery.customer.model

import kotlinx.serialization.Serializable

@Serializable
enum class OrderStatus {
    PENDING_APPROVAL,
    SEARCHING_COURIER,
    ACCEPTED_BY_COURIER,
    PICKED_UP,
    DELIVERED,
    CANCELLED,
    RETURNED
}

@Serializable
enum class DeliveryUrgency {
    EXPRESS_IMMEDIATE,
    SAME_DAY,
    NEXT_DAY,
    SCHEDULED
}

@Serializable
data class Location(
    val latitude: Double,
    val longitude: Double,
    val addressString: String,
    val notes: String? = null
)

@Serializable
enum class DeliveryType {
    DOCUMENT,
    SMALL_PACKAGE,
    LARGE_PACKAGE,
    FOOD,
    SENSITIVE_ITEM,
    LEGAL_DOCUMENT
}

@Serializable
data class Order(
    val id: String,
    val customerId: String,
    val courierId: String? = null,
    val status: OrderStatus,
    val type: DeliveryType,
    val protocolId: String? = null,
    val pickupLocation: Location,
    val dropoffLocation: Location,
    val createdAt: Long,
    val scheduledTime: Long? = null,
    val price: Double,
    val urgency: DeliveryUrgency,
    val items: List<OrderItem>,
    val notes: String? = null,
    val requiresProofOfDelivery: Boolean = true
)

@Serializable
data class OrderItem(
    val name: String,
    val quantity: Int,
    val weightKg: Double? = null
)
