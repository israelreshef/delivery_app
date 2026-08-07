package com.tzir.delivery.courier.di

import android.content.Context
import androidx.room.Room
import com.tzir.delivery.courier.database.ContactDao
import com.tzir.delivery.courier.database.LocationUpdateDao
import com.tzir.delivery.courier.database.PendingActionDao
import com.tzir.delivery.courier.database.TzirDatabase
import com.tzir.delivery.courier.database.VehicleDao
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): TzirDatabase {
        return Room.databaseBuilder(
            context,
            TzirDatabase::class.java,
            "tzir_courier_db"
        ).fallbackToDestructiveMigration().build()
    }

    @Provides
    fun provideContactDao(database: TzirDatabase): ContactDao = database.contactDao()

    @Provides
    fun provideVehicleDao(database: TzirDatabase): VehicleDao = database.vehicleDao()

    @Provides
    fun providePendingActionDao(database: TzirDatabase): PendingActionDao = database.pendingActionDao()

    @Provides
    fun provideLocationUpdateDao(database: TzirDatabase): LocationUpdateDao = database.locationUpdateDao()
}
