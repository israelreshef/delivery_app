package com.tzir.delivery.courier.database

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query

@Dao
interface AcademyCourseDao {
    @Query("SELECT * FROM academy_courses WHERE courseType = :courseType ORDER BY id DESC")
    suspend fun getCoursesByType(courseType: String): List<AcademyCourseEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertCourses(courses: List<AcademyCourseEntity>)

    @Query("DELETE FROM academy_courses WHERE courseType = :courseType")
    suspend fun clearCoursesByType(courseType: String)
}
