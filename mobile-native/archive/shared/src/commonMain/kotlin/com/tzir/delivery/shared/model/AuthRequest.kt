
package com.tzir.delivery.shared.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class LoginRequest(
    val username: String? = null,
    val email: String? = null,
    val password: String
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
    // Courier specific
    @SerialName("vehicle_type")
    val vehicleType: String? = null,
    @SerialName("license_plate")
    val licensePlate: String? = null,
    // Customer specific
    @SerialName("company_name")
    val companyName: String? = null
)
