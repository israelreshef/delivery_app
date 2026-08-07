package com.tzir.delivery.courier.database

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface VehicleDao {
    @Query("SELECT * FROM courier_vehicles ORDER BY isPrimary DESC, id DESC")
    fun getAll(): Flow<List<VehicleEntity>>

    @Query("SELECT * FROM courier_vehicles WHERE id = :id")
    suspend fun getById(id: Int): VehicleEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(vehicles: List<VehicleEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(vehicle: VehicleEntity)

    @Query("DELETE FROM courier_vehicles WHERE id = :id")
    suspend fun deleteById(id: Int)

    @Query("DELETE FROM courier_vehicles")
    suspend fun clearAll()
}
