package com.tzir.delivery.courier.database

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query

@Dao
interface GamificationProfileDao {
    @Query("SELECT * FROM gamification_profile LIMIT 1")
    suspend fun getProfile(): GamificationProfileEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(profile: GamificationProfileEntity)

    @Query("DELETE FROM gamification_profile")
    suspend fun clear()
}
