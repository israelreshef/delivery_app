package com.tzir.delivery.customer.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class LoginRequest(
    val email: String,
    val password: String,
    @SerialName("fcm_token")
    val fcmToken: String? = null
)

@Serializable
data class RegisterRequest(
    val email: String,
    val password: String,
    val username: String,
    val phone: String,
    @SerialName("user_type")
    val role: UserRole = UserRole.CUSTOMER,
    @SerialName("full_name")
    val fullName: String? = null,
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
    val user: User? = null,
    @SerialName("access_token")
    val accessToken: String? = null,
    val message: String? = null,
    val error: String? = null
)

@Serializable
data class TokenUpdateRequest(
    @SerialName("fcm_token")
    val fcmToken: String
)
