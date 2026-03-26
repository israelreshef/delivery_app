package com.tzir.delivery.shared.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class OtpVerifyRequest(
    @SerialName("otp_code")
    val otpCode: String
)
