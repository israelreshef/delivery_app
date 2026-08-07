package com.tzir.delivery.courier.database

import com.tzir.delivery.courier.model.CourierVehicle
import kotlinx.datetime.LocalDate

fun CourierVehicle.toEntity(): VehicleEntity {
    return VehicleEntity(
        id = id,
        courierId = courierId,
        plate = plate,
        type = type,
        insuranceExpiryDay = insuranceExpiry?.toEpochDays(),
        testExpiryDay = testExpiry?.toEpochDays(),
        isPrimary = isPrimary,
        storageTypes = if (storageTypes.isEmpty()) "[]" else org.json.JSONArray(storageTypes).toString()
    )
}

fun VehicleEntity.toModel(): CourierVehicle {
    fun dayToDate(day: Int?): LocalDate? = day?.let { LocalDate.fromEpochDays(it) }
    fun parseList(json: String): List<String> {
        return try {
            val arr = org.json.JSONArray(json)
            (0 until arr.length()).map { arr.getString(it) }
        } catch (e: Exception) { emptyList() }
    }
    return CourierVehicle(
        id = id,
        courierId = courierId,
        plate = plate,
        type = type,
        insuranceExpiry = dayToDate(insuranceExpiryDay),
        testExpiry = dayToDate(testExpiryDay),
        isPrimary = isPrimary,
        storageTypes = parseList(storageTypes)
    )
}
