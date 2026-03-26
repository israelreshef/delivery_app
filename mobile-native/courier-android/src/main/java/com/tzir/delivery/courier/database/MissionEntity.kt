package com.tzir.delivery.courier.database

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.tzir.delivery.courier.model.Mission

@Entity(tableName = "missions")
data class MissionEntity(
    @PrimaryKey
    val id: Int,
    val orderNumber: String,
    val status: String,
    val pickupAddress: String,
    val deliveryAddress: String,
    val packageDescription: String = "",
    val completedAt: String? = null,
    val estimatedPrice: Double,
    val pickupLat: Double? = null,
    val pickupLng: Double? = null,
    val deliveryLat: Double? = null,
    val deliveryLng: Double? = null,
    val distanceKm: Double = 0.0,
    val durationMins: Int? = null,
    val baseFare: Double = 0.0,
    val tip: Double = 0.0,
    val otpVerified: Boolean = false,
    val isOtpRequired: Boolean = true,
    val biometricVerificationRequired: Boolean = false,
    val deliveryType: String = "standard",
    val isUrgent: Boolean? = false,
    val scheduledAt: String? = null,
    val protocolSlug: String? = null
) {
    fun toModel() = Mission(
        id = id,
        orderNumber = orderNumber,
        status = status,
        pickupAddress = pickupAddress,
        deliveryAddress = deliveryAddress,
        packageDescription = packageDescription,
        completedAt = completedAt,
        estimatedPrice = estimatedPrice,
        pickupLat = pickupLat,
        pickupLng = pickupLng,
        deliveryLat = deliveryLat,
        deliveryLng = deliveryLng,
        distanceKm = distanceKm,
        durationMins = durationMins,
        baseFare = baseFare,
        tip = tip,
        otpVerified = otpVerified,
        isOtpRequired = isOtpRequired,
        biometricVerificationRequired = biometricVerificationRequired,
        deliveryType = deliveryType,
        isUrgent = isUrgent,
        scheduledAt = scheduledAt,
        protocolSlug = protocolSlug
    )

    companion object {
        fun fromModel(mission: Mission) = MissionEntity(
            id = mission.id,
            orderNumber = mission.orderNumber,
            status = mission.status,
            pickupAddress = mission.pickupAddress,
            deliveryAddress = mission.deliveryAddress,
            packageDescription = mission.packageDescription,
            completedAt = mission.completedAt,
            estimatedPrice = mission.estimatedPrice,
            pickupLat = mission.pickupLat,
            pickupLng = mission.pickupLng,
            deliveryLat = mission.deliveryLat,
            deliveryLng = mission.deliveryLng,
            distanceKm = mission.distanceKm,
            durationMins = mission.durationMins,
            baseFare = mission.baseFare,
            tip = mission.tip,
            otpVerified = mission.otpVerified,
            isOtpRequired = mission.isOtpRequired,
            biometricVerificationRequired = mission.biometricVerificationRequired,
            deliveryType = mission.deliveryType,
            isUrgent = mission.isUrgent,
            scheduledAt = mission.scheduledAt,
            protocolSlug = mission.protocolSlug
        )
    }
}