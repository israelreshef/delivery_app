package com.tzir.delivery.courier.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonNames
import kotlinx.serialization.json.JsonElement

@Serializable
data class LocationRequest(
    val id: String,
    val lat: Double,
    val lng: Double,
    val status: String? = null
)

@Serializable
data class StatusUpdateRequest(
    val status: String,
    val lat: Double? = null,
    val lng: Double? = null,
    @SerialName("pod_signature")
    val podSignature: String? = null,
    @SerialName("pod_image")
    val podImage: String? = null
)

@Serializable
data class CourierStats(
    @SerialName("total_deliveries")
    val totalDeliveries: Int,
    @SerialName("today_earnings")
    val todayEarnings: Double,
    @SerialName("weekly_earnings")
    val weeklyEarnings: Double,
    val rating: Double,
    val balance: Double,
    @SerialName("performance_index")
    val performanceIndex: Double,
    @SerialName("rank_badge")
    val rankBadge: String,
    @SerialName("completion_rate")
    val completionRate: Double = 0.0,
    @SerialName("avg_delivery_mins")
    val avgDeliveryMins: Int = 0,
    @SerialName("is_available")
    val isAvailable: Boolean = false
)

@Serializable
data class AvailabilityRequest(
    @SerialName("is_available")
    val isAvailable: Boolean
)

@Serializable
data class Stop(
    val address: String? = null,
    val lat: Double? = null,
    val lng: Double? = null,
    val type: String? = null
)

@Serializable
data class ManualRouteRequest(
    val lat: Double,
    val lng: Double,
    val stops: List<Stop>
)

@Serializable
data class OptimizedRouteStop(
    val id: String? = null,
    @SerialName("delivery_id")
    val deliveryId: Int? = null,
    @SerialName("order_id")
    val orderId: Int? = null,
    @JsonNames("type", "stop_type")
    val type: String? = null,
    val lat: Double? = null,
    val lng: Double? = null,
    val address: String? = null,
    @SerialName("sequence_order")
    val sequenceOrder: Int? = null
)

@Serializable
data class RouteOptimizationResult(
    @SerialName("optimized_sequence")
    val optimizedSequence: List<OptimizedRouteStop> = emptyList(),
    @SerialName("total_distance_km")
    val totalDistanceKm: Double = 0.0,
    @SerialName("total_duration_min")
    val totalDurationMin: Double = 0.0,
    @SerialName("route_geometry")
    val routeGeometry: List<List<Double>> = emptyList(),
    val provider: String? = null,
    val message: String? = null,
    val error: String? = null
)

@Serializable
data class AutocompleteSuggestion(
    val description: String,
    @SerialName("full_address")
    val fullAddress: String = "",
    @SerialName("place_id")
    val placeId: String,
    val source: String = "google"
)

@Serializable
data class GeocodeResult(
    val lat: Double,
    val lng: Double,
    val address: String,
    @SerialName("formatted_address")
    val formattedAddress: String = ""
)

@Serializable
data class ShiftStartRequest(
    val vibe: String
)

@Serializable
data class RatingRequest(
    val rating: Int,
    val comment: String
)

@Serializable
data class OtpVerifyRequest(
    val code: String
)

@Serializable
data class FcmTokenRequest(
    val token: String
)

@Serializable
data class MapsResult(
    val success: Boolean,
    val data: JsonElement? = null
)
