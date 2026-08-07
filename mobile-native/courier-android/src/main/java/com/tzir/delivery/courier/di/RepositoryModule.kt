package com.tzir.delivery.courier.di

import android.content.Context
import com.tzir.delivery.courier.database.ContactDao
import com.tzir.delivery.courier.database.TzirDatabase
import com.tzir.delivery.courier.network.DeliveryApi
import com.tzir.delivery.courier.services.SyncManager
import com.tzir.delivery.courier.util.ConnectivityObserver
import dagger.hilt.android.qualifiers.ApplicationContext
import com.tzir.delivery.courier.repository.AuthRepository
import com.tzir.delivery.courier.repository.BusinessRepository
import com.tzir.delivery.courier.repository.CalendarRepository
import com.tzir.delivery.courier.repository.ContactRepository
import com.tzir.delivery.courier.repository.CourierRepository
import com.tzir.delivery.courier.repository.EarningsRepository
import com.tzir.delivery.courier.repository.ExpenseRepository
import com.tzir.delivery.courier.repository.PaymentRepository
import com.tzir.delivery.courier.repository.RatingRepository
import com.tzir.delivery.courier.repository.VehicleRepository
import com.tzir.delivery.courier.repository.NotificationRepository
import com.tzir.delivery.courier.database.VehicleDao
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object RepositoryModule {

    @Provides
    @Singleton
    fun provideAuthRepository(api: DeliveryApi): AuthRepository {
        return AuthRepository(api)
    }

    @Provides
    @Singleton
    fun provideCourierRepository(api: DeliveryApi, database: TzirDatabase, syncManager: SyncManager): CourierRepository {
        return CourierRepository(api, database, syncManager)
    }

    @Provides
    @Singleton
    fun provideConnectivityObserver(@ApplicationContext context: Context): ConnectivityObserver {
        return ConnectivityObserver(context)
    }

    @Provides
    @Singleton
    fun provideContactRepository(api: DeliveryApi, contactDao: ContactDao, connectivityObserver: ConnectivityObserver): ContactRepository {
        return ContactRepository(api, contactDao, connectivityObserver)
    }

    @Provides
    @Singleton
    fun provideVehicleRepository(api: DeliveryApi, vehicleDao: VehicleDao, connectivityObserver: ConnectivityObserver): VehicleRepository {
        return VehicleRepository(api, vehicleDao, connectivityObserver)
    }

    @Provides
    @Singleton
    fun provideRatingRepository(api: DeliveryApi): RatingRepository {
        return RatingRepository(api)
    }

    @Provides
    @Singleton
    fun provideEarningsRepository(api: DeliveryApi): EarningsRepository {
        return EarningsRepository(api)
    }

    @Provides
    @Singleton
    fun provideExpenseRepository(api: DeliveryApi): ExpenseRepository {
        return ExpenseRepository(api)
    }

    @Provides
    @Singleton
    fun provideBusinessRepository(api: DeliveryApi): BusinessRepository {
        return BusinessRepository(api)
    }

    @Provides
    @Singleton
    fun provideCalendarRepository(api: DeliveryApi): CalendarRepository {
        return CalendarRepository(api)
    }

    @Provides
    @Singleton
    fun providePaymentRepository(api: DeliveryApi): PaymentRepository {
        return PaymentRepository(api)
    }

    @Provides
    @Singleton
    fun provideNotificationRepository(api: DeliveryApi): NotificationRepository {
        return NotificationRepository(api)
    }
}
