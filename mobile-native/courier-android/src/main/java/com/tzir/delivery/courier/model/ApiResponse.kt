package com.tzir.delivery.courier.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class ApiListResponse<T>(
    val data: List<T> = emptyList(),
    val total: Int = 0,
    val pages: Int = 0,
    @SerialName("current_page")
    val currentPage: Int = 1,
    @SerialName("per_page")
    val perPage: Int = 0
)

@Serializable
data class ApiObjectResponse<T>(
    val data: T? = null,
    val message: String? = null,
    val error: String? = null
)
