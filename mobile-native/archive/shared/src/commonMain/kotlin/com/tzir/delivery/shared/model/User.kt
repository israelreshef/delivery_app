
package com.tzir.delivery.shared.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
enum class UserRole {
    @SerialName("customer")
    CUSTOMER,
    @SerialName("courier")
    COURIER,
    @SerialName("admin")
    ADMIN,
    @SerialName("dispatcher")
    DISPATCHER,
    @SerialName("support")
    SUPPORT
}

@Serializable
data class User(
    val id: String, // Stringified ID from backend
    val username: String,
    val email: String,
    @SerialName("phone")
    val phoneNumber: String,
    @SerialName("user_type")
    val role: UserRole,
    @SerialName("access_token")
    val accessToken: String? = null, // Store token here for session
    @SerialName("is_active")
    val isActive: Boolean = true,
    
    // Optional Courier/Customer specific logic
    @SerialName("courier_id")
    val courierId: String? = null,
    @SerialName("customer_id")
    val customerId: String? = null,
    @SerialName("full_name")
    val fullName: String? = null
)
