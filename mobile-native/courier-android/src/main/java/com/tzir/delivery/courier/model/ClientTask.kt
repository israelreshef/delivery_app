package com.tzir.delivery.courier.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class ClientTask(
    val id: Int = 0,
    val title: String = "",
    val description: String = "",
    @SerialName("due_date")
    val dueDate: String? = null,
    val priority: String = "medium",
    val status: String = "open",
    @SerialName("created_at")
    val createdAt: String? = null,
    val source: String? = null,
    @SerialName("source_id")
    val sourceId: String? = null
)
