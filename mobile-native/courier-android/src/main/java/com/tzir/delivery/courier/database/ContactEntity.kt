package com.tzir.delivery.courier.database

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.tzir.delivery.courier.model.CourierContact
import org.json.JSONArray

@Entity(tableName = "courier_contacts")
data class ContactEntity(
    @PrimaryKey val id: Int,
    val courierId: Int = 0,
    val name: String,
    val company: String = "",
    val phone: String = "",
    val email: String = "",
    val addresses: String = "[]",
    val isVIP: Boolean = false,
    val isBusiness: Boolean = false,
    val totalDeliveries: Int = 0,
    val totalRevenue: Double = 0.0,
    val lastInteraction: String = "",
    val notes: String = "",
    val tags: String = "[]",
    val createdAt: String = "",
    val updatedAt: String = ""
)

fun CourierContact.toEntity(): ContactEntity {
    return ContactEntity(
        id = id,
        courierId = courierId,
        name = name,
        company = company,
        phone = phone,
        email = email,
        addresses = JSONArray(addresses).toString(),
        isVIP = isVIP,
        isBusiness = isBusiness,
        totalDeliveries = totalDeliveries,
        totalRevenue = totalRevenue,
        lastInteraction = lastInteraction,
        notes = notes,
        tags = JSONArray(tags).toString(),
        createdAt = createdAt,
        updatedAt = updatedAt
    )
}

fun ContactEntity.toModel(): CourierContact {
    fun parseList(json: String): List<String> {
        return try {
            val arr = JSONArray(json)
            (0 until arr.length()).map { arr.getString(it) }
        } catch (e: Exception) { emptyList() }
    }
    return CourierContact(
        id = id,
        courierId = courierId,
        name = name,
        company = company,
        phone = phone,
        email = email,
        addresses = parseList(addresses),
        isVIP = isVIP,
        isBusiness = isBusiness,
        totalDeliveries = totalDeliveries,
        totalRevenue = totalRevenue,
        lastInteraction = lastInteraction,
        notes = notes,
        tags = parseList(tags),
        createdAt = createdAt,
        updatedAt = updatedAt
    )
}
