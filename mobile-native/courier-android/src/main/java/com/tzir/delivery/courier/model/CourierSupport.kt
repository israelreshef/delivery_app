package com.tzir.delivery.courier.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class CourierSupportTicket(
    val id: Int = 0,
    @SerialName("ticket_number") val ticketNumber: String = "",
    val subject: String = "",
    val status: String = "open",
    val priority: String = "medium",
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("user_id") val userId: Int? = null,
    @SerialName("user_name") val userName: String? = null,
    @SerialName("first_message") val firstMessage: String? = null,
    @SerialName("message_count") val messageCount: Int = 0,
) {
    val isOpen: Boolean
        get() = status == "open" || status == "in_progress" || status == "waiting_for_customer"
}

@Serializable
data class CourierSupportMessage(
    val id: Int = 0,
    @SerialName("sender_id") val senderId: Int = 0,
    @SerialName("sender_name") val senderName: String = "",
    val message: String = "",
    @SerialName("is_internal") val isInternal: Boolean = false,
    @SerialName("attachments") val attachments: List<String> = emptyList(),
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("is_staff") val isStaff: Boolean = false,
)

@Serializable
data class CourierSupportDetail(
    val ticket: CourierSupportTicket = CourierSupportTicket(),
    val messages: List<CourierSupportMessage> = emptyList(),
)

@Serializable
data class CreateSupportTicketResponse(
    val message: String = "",
    val id: Int = 0,
    @SerialName("ticket_number") val ticketNumber: String = "",
)

@Serializable
data class AddSupportMessageResponse(
    val message: String = "",
    val id: Int = 0,
)

@Serializable
data class AddSupportMessageRequest(
    val message: String,
    @SerialName("is_internal") val isInternal: Boolean = false,
)
