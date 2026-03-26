
package com.tzir.delivery.shared.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class AuthResponse(
    val success: Boolean = false,
    val message: String? = null,
    @SerialName("access_token")
    val accessToken: String? = null,
    val user: User? = null,
    val error: String? = null,
    
    // 2FA Fields
    @SerialName("requires_2fa")
    val requires2fa: Boolean = false,
    @SerialName("mfa_token")
    val mfaToken: String? = null
)
