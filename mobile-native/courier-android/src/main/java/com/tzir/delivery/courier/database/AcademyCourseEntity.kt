package com.tzir.delivery.courier.database

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "academy_courses")
data class AcademyCourseEntity(
    @PrimaryKey
    val id: Int,
    val title: String,
    val description: String,
    val progress: Double,
    val courseType: String = "regular" // "regular" or "protocol"
) {
    fun toMap() = mapOf(
        "id" to id,
        "title" to title,
        "description" to description,
        "progress" to progress
    )

    companion object {
        fun fromMap(map: Map<String, Any>, courseType: String = "regular") = AcademyCourseEntity(
            id = (map["id"] as? Number)?.toInt() ?: 0,
            title = map["title"] as? String ?: "",
            description = map["description"] as? String ?: "",
            progress = (map["progress"] as? Number)?.toDouble() ?: 0.0,
            courseType = courseType
        )
    }
}