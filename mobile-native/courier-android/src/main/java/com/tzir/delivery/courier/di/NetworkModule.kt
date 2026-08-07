package com.tzir.delivery.courier.di

import com.tzir.delivery.courier.network.DeliveryApi
import com.tzir.delivery.courier.network.DeliveryApiImpl
import com.tzir.delivery.courier.network.KtorClientFactory
import com.tzir.delivery.courier.repository.AuthRepository
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import io.ktor.client.HttpClient
import javax.inject.Provider
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    @Provides
    @Singleton
    fun provideHttpClient(authRepositoryProvider: Provider<AuthRepository>): HttpClient {
        return KtorClientFactory.createClient { authRepositoryProvider.get().logout() }
    }

    @Provides
    @Singleton
    fun provideDeliveryApi(client: HttpClient): DeliveryApi {
        return DeliveryApiImpl(client)
    }
}
