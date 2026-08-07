package com.tzir.delivery.courier.database

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "courier_vehicles")
data class VehicleEntity(
    @PrimaryKey val id: Int,
    val courierId: Int = 0,
    val plate: String,
    val type: String = "car",
    // Stored as epoch days (Int) for easy date math; null when missing
    val insuranceExpiryDay: Int? = null,
    val testExpiryDay: Int? = null,
    val isPrimary: Boolean = false,
    val storageTypes: String = "[]"
)
