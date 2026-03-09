package com.tzir.delivery.shared.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class LocationRequest(
    @SerialName("courier_id")
    val courierId: String,
    val lat: Double,
    val lng: Double
)
