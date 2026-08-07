package com.tzir.delivery.courier.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class QuoteRequest(
    @SerialName("client_id")
    val clientId: Int,
    val description: String,
    val price: Double
)
