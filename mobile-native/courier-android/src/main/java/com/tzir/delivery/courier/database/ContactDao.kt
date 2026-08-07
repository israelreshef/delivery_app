package com.tzir.delivery.courier.database

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query

@Dao
interface ContactDao {
    @Query("SELECT * FROM courier_contacts ORDER BY updatedAt DESC")
    suspend fun getAll(): List<ContactEntity>

    @Query("SELECT * FROM courier_contacts WHERE id = :id")
    suspend fun getById(id: Int): ContactEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(contacts: List<ContactEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(contact: ContactEntity)

    @Query("DELETE FROM courier_contacts WHERE id = :id")
    suspend fun deleteById(id: Int)

    @Query("DELETE FROM courier_contacts")
    suspend fun clearAll()
}
