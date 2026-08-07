package com.tzir.delivery.courier.di

import com.tzir.delivery.courier.database.LocationUpdateDao
import com.tzir.delivery.courier.location.LocationManager
import com.tzir.delivery.courier.network.DeliveryApi
import com.tzir.delivery.courier.services.SyncManager
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object LocationModule {

    @Provides
    @Singleton
    fun provideLocationManager(api: DeliveryApi, syncManager: SyncManager, locationUpdateDao: LocationUpdateDao): LocationManager {
        return LocationManager(api, syncManager, locationUpdateDao)
    }
}
