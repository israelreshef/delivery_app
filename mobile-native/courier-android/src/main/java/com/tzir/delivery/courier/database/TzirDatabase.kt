package com.tzir.delivery.courier.database

import androidx.room.Database
import androidx.room.RoomDatabase

@Database(
    entities = [MissionEntity::class, CourierStatsEntity::class, AcademyCourseEntity::class, GamificationProfileEntity::class],
    version = 1,
    exportSchema = false
)
abstract class TzirDatabase : RoomDatabase() {
    abstract fun missionDao(): MissionDao
    abstract fun courierStatsDao(): CourierStatsDao
    abstract fun academyCourseDao(): AcademyCourseDao
    abstract fun gamificationProfileDao(): GamificationProfileDao
}
