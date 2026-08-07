package com.tzir.delivery.courier.database

import androidx.room.Database
import androidx.room.RoomDatabase

@Database(
    entities = [MissionEntity::class, CourierStatsEntity::class, AcademyCourseEntity::class, GamificationProfileEntity::class, ContactEntity::class, VehicleEntity::class, PendingActionEntity::class, LocationUpdateEntity::class],
    version = 5,
    exportSchema = false
)
abstract class TzirDatabase : RoomDatabase() {
    abstract fun missionDao(): MissionDao
    abstract fun courierStatsDao(): CourierStatsDao
    abstract fun academyCourseDao(): AcademyCourseDao
    abstract fun gamificationProfileDao(): GamificationProfileDao
    abstract fun contactDao(): ContactDao
    abstract fun vehicleDao(): VehicleDao
    abstract fun pendingActionDao(): PendingActionDao
    abstract fun locationUpdateDao(): LocationUpdateDao
}
