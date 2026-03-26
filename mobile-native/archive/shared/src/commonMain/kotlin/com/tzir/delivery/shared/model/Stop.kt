package com.tzir.delivery.shared.model

import kotlinx.serialization.Serializable

@Serializable
data class Stop(
    val id: Int? = null,
    val address: String? = null,
    val lat: Double? = null,
    val lng: Double? = null,
    val type: String? = null
)
