package com.tzir.delivery.courier.database

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query

@Dao
interface LocationUpdateDao {
    @Insert
    suspend fun insert(update: LocationUpdateEntity)

    @Query("SELECT * FROM location_updates WHERE synced = 0 ORDER BY timestamp ASC LIMIT 100")
    suspend fun getPending(): List<LocationUpdateEntity>

    @Query("UPDATE location_updates SET synced = 1 WHERE id IN (:ids)")
    suspend fun markSynced(ids: List<Int>)

    @Query("DELETE FROM location_updates WHERE synced = 1")
    suspend fun clearSynced()

    @Query("SELECT COUNT(*) FROM location_updates WHERE synced = 0")
    suspend fun getPendingCount(): Int
}
