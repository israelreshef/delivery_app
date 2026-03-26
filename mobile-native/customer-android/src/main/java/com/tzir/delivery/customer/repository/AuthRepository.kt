package com.tzir.delivery.customer.repository

import com.tzir.delivery.customer.model.*
import com.tzir.delivery.customer.network.DeliveryApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

class AuthRepository private constructor(private val api: DeliveryApi) {
    private val _currentUser = MutableStateFlow<User?>(null)
    val currentUser: StateFlow<User?> = _currentUser.asStateFlow()

    suspend fun login(request: LoginRequest): AuthResponse {
        val response = api.login(request)
        if (response.success && response.user != null) {
            _currentUser.value = response.user
        }
        return response
    }

    suspend fun register(request: RegisterRequest): AuthResponse {
        val response = api.register(request)
        if (response.success && response.user != null) {
            _currentUser.value = response.user
        }
        return response
    }

    fun logout() {
        _currentUser.value = null
    }

    companion object {
        var instance: AuthRepository? = null
            private set
        fun getInstance(api: DeliveryApi): AuthRepository {
            return instance ?: synchronized(this) {
                instance ?: AuthRepository(api).also { instance = it }
            }
        }
    }
}
