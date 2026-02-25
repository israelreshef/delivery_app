
package com.tzir.delivery.shared.model

import kotlinx.serialization.Serializable

@Serializable
data class GeocodeResult(
    val lat: Double,
    val lng: Double,
    val formatted_address: String,
    val source: String
)
