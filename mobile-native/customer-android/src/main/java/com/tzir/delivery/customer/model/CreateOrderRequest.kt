package com.tzir.delivery.customer.model

import kotlinx.serialization.Serializable

@Serializable
data class CreateOrderRequest(
    val sender: SenderData,
    val recipient: RecipientData,
    val package_data: PackageData, // Backend uses 'package' but Kotlin 'package' is reserved. Ktor will handle mapping if we use serial name or manual mapping
    val service: ServiceData
)

@Serializable
data class SenderData(
    val senderName: String,
    val senderPhone: String,
    val senderAddress: AddressData
)

@Serializable
data class RecipientData(
    val recipientName: String,
    val recipientPhone: String,
    val recipientAddress: AddressData
)

@Serializable
data class AddressData(
    val street: String,
    val city: String = "Unknown",
    val lat: Double,
    val lon: Double,
    val notes: String? = null
)

@Serializable
data class PackageData(
    val packageContent: String,
    val packageWeight: Double,
    val packageSize: String
)

@Serializable
data class ServiceData(
    val deliveryType: String,
    val urgency: String
)
