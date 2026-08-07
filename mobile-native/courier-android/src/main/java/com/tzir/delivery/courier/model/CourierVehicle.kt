package com.tzir.delivery.courier.model

import kotlinx.datetime.LocalDate
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class CourierVehicle(
    val id: Int = 0,
    @SerialName("courier_id")
    val courierId: Int = 0,
    @SerialName("plate_number")
    val plate: String = "",
    @SerialName("vehicle_type")
    val type: String = "car",
    @SerialName("insurance_expiry")
    val insuranceExpiry: LocalDate? = null,
    @SerialName("test_expiry")
    val testExpiry: LocalDate? = null,
    @SerialName("is_primary")
    val isPrimary: Boolean = false,
    @SerialName("storage_types")
    val storageTypes: List<String> = emptyList()
)
