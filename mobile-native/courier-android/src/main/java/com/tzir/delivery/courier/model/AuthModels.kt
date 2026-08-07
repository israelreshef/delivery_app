package com.tzir.delivery.courier.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class LoginRequest(
    val username: String? = null,
    val email: String? = null,
    val password: String
)

@Serializable
data class MfaVerifyRequest(
    @SerialName("mfa_token")
    val mfaToken: String,
    val code: String
)

@Serializable
data class RegisterRequest(
    val username: String,
    val email: String,
    val password: String,
    val phone: String,
    @SerialName("user_type")
    val userType: UserRole,
    @SerialName("full_name")
    val fullName: String,
    @SerialName("vehicle_type")
    val vehicleType: String? = null,
    @SerialName("license_plate")
    val licensePlate: String? = null,
    @SerialName("company_name")
    val companyName: String? = null
)

@Serializable
data class AuthResponse(
    val success: Boolean = false,
    val message: String? = null,
    @SerialName("access_token")
    val accessToken: String? = null,
    @SerialName("refresh_token")
    val refreshToken: String? = null,
    val user: User? = null,
    val error: String? = null,
    @SerialName("requires_2fa")
    val requires2fa: Boolean = false,
    @SerialName("mfa_token")
    val mfaToken: String? = null
)

@Serializable
data class RefreshTokenResponse(
    @SerialName("access_token")
    val accessToken: String,
    @SerialName("refresh_token")
    val refreshToken: String
)
