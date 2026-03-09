package com.tzir.delivery.shared.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class StatusUpdateRequest(
    val status: String,
    val lat: Double? = null,
    val lng: Double? = null,
    @SerialName("pod_signature")
    val podSignature: String? = null,
    @SerialName("pod_image")
    val podImage: String? = null,
    @SerialName("pod_recipient_id")
    val podRecipientId: String? = null
)
