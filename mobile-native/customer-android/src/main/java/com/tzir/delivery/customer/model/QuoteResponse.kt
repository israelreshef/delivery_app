package com.tzir.delivery.customer.model

import kotlinx.serialization.Serializable

@Serializable
data class QuoteResponse(
    val success: Boolean,
    val distance_km: Double? = null,
    val duration_mins: Double? = null,
    val price: Double? = null,
    val currency: String? = null,
    val error: String? = null
)
