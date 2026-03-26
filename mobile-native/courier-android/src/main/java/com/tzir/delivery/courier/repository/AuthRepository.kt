package com.tzir.delivery.courier.repository

import com.tzir.delivery.courier.model.*
import com.tzir.delivery.courier.network.DeliveryApi
import com.tzir.delivery.courier.network.TokenManager
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

class AuthRepository(private val api: DeliveryApi) {
    
    companion object {
        var instance: AuthRepository? = null
            private set
        fun getInstance(api: DeliveryApi): AuthRepository {
            return instance ?: synchronized(this) {
                instance ?: AuthRepository(api).also { instance = it }
            }
        }
    }

    private val _currentUser = MutableStateFlow<User?>(null)
    val currentUser: StateFlow<User?> = _currentUser.asStateFlow()

    suspend fun login(username: String, password: String): AuthResponse {
        val request = LoginRequest(username = username, password = password)
        val response = api.login(request)
        
        if (response.success && response.user != null) {
            _currentUser.value = response.user
            TokenManager.token = response.accessToken
        }
        
        return response
    }

    suspend fun register(request: RegisterRequest): AuthResponse {
        return api.register(request)
    }

    fun logout() {
        _currentUser.value = null
        TokenManager.token = null
    }

    suspend fun updateFcmToken(token: String): Boolean {
        return api.updateFcmToken(FcmTokenRequest(token))
    }
}
