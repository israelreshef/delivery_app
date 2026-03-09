package com.tzir.delivery.shared.model

import kotlinx.serialization.Serializable

@Serializable
data class ManualRouteRequest(
    val lat: Double,
    val lng: Double,
    val stops: List<Stop>
)
