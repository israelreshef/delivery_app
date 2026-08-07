package com.tzir.delivery.customer.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class CustomerSupportTicket(
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
data class CustomerSupportMessage(
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
data class CustomerSupportDetail(
    val ticket: CustomerSupportTicket = CustomerSupportTicket(),
    val messages: List<CustomerSupportMessage> = emptyList(),
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
