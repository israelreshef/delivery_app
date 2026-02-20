
package com.tzir.delivery.shared.model

enum class VehicleType {
    MOTORCYCLE,
    SCOOTER,
    CAR,
    VAN, // Commercial B license
    TRUCK, // Commercial C license
    SEMI_TRAILER,
    BICYCLE,
    WALKER
}

data class Vehicle(
    val id: String,
    val type: VehicleType,
    val licensePlate: String,
    val model: String,
    val color: String,
    val capacityKg: Double? = null
)
