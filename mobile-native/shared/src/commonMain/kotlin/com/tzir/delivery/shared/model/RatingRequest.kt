package com.tzir.delivery.shared.model

import kotlinx.serialization.Serializable

@Serializable
data class RatingRequest(
    val rating: Int,
    val comment: String
)
