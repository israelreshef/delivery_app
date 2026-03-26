package com.tzir.delivery.courier.database

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "gamification_profile")
data class GamificationProfileEntity(
    @PrimaryKey
    val id: Int = 0,
    val level: Int,
    val xp: Int,
    val nextLevelXp: Int,
    val completedDeliveries: Int,
    val targetDeliveries: Int
) {
    fun toMap() = mapOf(
        "level" to level,
        "xp" to xp,
        "next_level_xp" to nextLevelXp,
        "daily_mission" to mapOf(
            "completed_deliveries" to completedDeliveries,
            "target_deliveries" to targetDeliveries
        )
    )

    companion object {
        fun fromMap(map: Map<String, Any>) = GamificationProfileEntity(
            level = (map["level"] as? Number)?.toInt() ?: 1,
            xp = (map["xp"] as? Number)?.toInt() ?: 0,
            nextLevelXp = (map["next_level_xp"] as? Number)?.toInt() ?: 1000,
            completedDeliveries = ((map["daily_mission"] as? Map<*, *>)?.get("completed_deliveries") as? Number)?.toInt() ?: 0,
            targetDeliveries = ((map["daily_mission"] as? Map<*, *>)?.get("target_deliveries") as? Number)?.toInt() ?: 10
        )
    }
}