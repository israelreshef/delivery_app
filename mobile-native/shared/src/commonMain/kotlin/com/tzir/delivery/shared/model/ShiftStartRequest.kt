package com.tzir.delivery.shared.model

import kotlinx.serialization.Serializable

@Serializable
data class ShiftStartRequest(
    val vibe: String
)
