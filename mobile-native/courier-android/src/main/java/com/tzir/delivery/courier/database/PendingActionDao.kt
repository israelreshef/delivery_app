package com.tzir.delivery.courier.database

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query

@Dao
interface PendingActionDao {
    @Query("SELECT * FROM pending_actions WHERE status = 'pending' ORDER BY created_at ASC")
    suspend fun getPendingActions(): List<PendingActionEntity>

    @Query("SELECT * FROM pending_actions ORDER BY created_at DESC LIMIT 50")
    suspend fun getAllRecent(): List<PendingActionEntity>

    @Query("SELECT COUNT(*) FROM pending_actions WHERE status = 'pending'")
    suspend fun getPendingCount(): Int

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(action: PendingActionEntity)

    @Delete
    suspend fun delete(action: PendingActionEntity)

    @Query("DELETE FROM pending_actions WHERE id = :id")
    suspend fun deleteById(id: Int)

    @Query("DELETE FROM pending_actions WHERE status = 'completed'")
    suspend fun clearCompleted()

    @Query("UPDATE pending_actions SET status = :status, retry_count = retry_count + 1, last_attempted_at = :lastAttemptedAt WHERE id = :id")
    suspend fun markAttempted(id: Int, status: String, lastAttemptedAt: Long = System.currentTimeMillis())
}
