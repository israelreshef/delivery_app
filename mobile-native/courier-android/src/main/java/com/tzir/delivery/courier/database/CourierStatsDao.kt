package com.tzir.delivery.courier.database

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query

@Dao
interface CourierStatsDao {
    @Query("SELECT * FROM courier_stats LIMIT 1")
    suspend fun getStats(): CourierStatsEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(stats: CourierStatsEntity)

    @Query("DELETE FROM courier_stats")
    suspend fun clear()
}
