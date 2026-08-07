package com.tzir.delivery.courier.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class PaymentMethod(
    val id: Int = 0,
    @SerialName("method_type") val methodType: String = "",
    val label: String = "",
    val details: Map<String, String> = emptyMap(),
    @SerialName("is_default") val isDefault: Boolean = false,
    @SerialName("created_at") val createdAt: String? = null
)
