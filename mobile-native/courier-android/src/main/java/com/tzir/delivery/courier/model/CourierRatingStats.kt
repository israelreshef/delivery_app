package com.tzir.delivery.courier.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class CourierRatingStats(
    @SerialName("average_rating")
    val averageRating: Double = 0.0,
    @SerialName("total_ratings")
    val totalRatings: Int = 0,
    @SerialName("service_quality")
    val serviceQuality: Float = 0.0f,
    @SerialName("delivery_time")
    val deliveryTime: Float = 0.0f,
    @SerialName("reliability")
    val reliability: Float = 0.0f
)

@Serializable
data class RatingFeedback(
    val id: Int = 0,
    val tag: String = "",
    val comment: String? = null,
    @SerialName("rating_value")
    val ratingValue: Int? = null,
    @SerialName("created_at")
    val createdAt: String = ""
)
