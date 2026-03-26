package com.tzir.delivery.courier.database

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query

@Dao
interface MissionDao {
    @Query("SELECT * FROM missions ORDER BY id DESC")
    suspend fun getAllMissions(): List<MissionEntity>

    @Query("SELECT * FROM missions WHERE status = :status ORDER BY id DESC")
    suspend fun getMissionsByStatus(status: String): List<MissionEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertMissions(missions: List<MissionEntity>)

    @Query("DELETE FROM missions")
    suspend fun clearAll()
}
