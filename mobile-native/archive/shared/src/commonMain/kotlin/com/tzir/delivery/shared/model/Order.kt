
package com.tzir.delivery.shared.model

enum class OrderStatus {
    PENDING_APPROVAL, // Admin approval needed
    SEARCHING_COURIER, // Round Robin / Auto Dispatch
    ACCEPTED_BY_COURIER,
    PICKED_UP,
    DELIVERED,
    CANCELLED,
    RETURNED
}

enum class DeliveryUrgency {
    EXPRESS_IMMEDIATE,
    SAME_DAY,
    NEXT_DAY,
    SCHEDULED
}

data class Location(
    val latitude: Double,
    val longitude: Double,
    val addressString: String,
    val notes: String? = null
)


enum class DeliveryType {
    DOCUMENT,
    SMALL_PACKAGE,
    LARGE_PACKAGE,
    FOOD,
    SENSITIVE_ITEM,
    LEGAL_DOCUMENT
}

data class Order(
    val id: String,
    val customerId: String,
    val courierId: String? = null,
    val status: OrderStatus,
    val type: DeliveryType, // Added
    val protocolId: String? = null, // Added for specific handling instructions
    val pickupLocation: Location,
    val dropoffLocation: Location,
    val createdAt: Long, // Timestamp
    val scheduledTime: Long? = null,
    val price: Double,
    val urgency: DeliveryUrgency,
    val items: List<OrderItem>,
    val notes: String? = null,
    val requiresProofOfDelivery: Boolean = true
)

data class OrderItem(
    val name: String,
    val quantity: Int,
    val weightKg: Double? = null
)
