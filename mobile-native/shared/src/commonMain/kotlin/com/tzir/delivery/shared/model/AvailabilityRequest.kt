package com.tzir.delivery.shared.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class AvailabilityRequest(
    @SerialName("is_available")
    val isAvailable: Boolean
)
