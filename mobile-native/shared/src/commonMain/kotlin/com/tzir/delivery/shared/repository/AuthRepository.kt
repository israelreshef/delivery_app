
package com.tzir.delivery.shared.repository

import com.tzir.delivery.shared.model.AuthResponse
import com.tzir.delivery.shared.model.LoginRequest
import com.tzir.delivery.shared.model.RegisterRequest
import com.tzir.delivery.shared.model.User
import com.tzir.delivery.shared.network.DeliveryApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

class AuthRepository(private val api: DeliveryApi) {
    
    companion object {
        var instance: AuthRepository? = null
    }

    private val _currentUser = MutableStateFlow<User?>(null)
    val currentUser: StateFlow<User?> = _currentUser.asStateFlow()



    suspend fun login(username: String, password: String): AuthResponse {
        val request = LoginRequest(username = username, password = password)
        val response = api.login(request)
        
        if (response.success && response.user != null) {
            _currentUser.value = response.user
            com.tzir.delivery.shared.network.TokenManager.token = response.accessToken
        }
        
        return response
    }

    suspend fun register(request: RegisterRequest): AuthResponse {
        val response = api.register(request)
        // Note: Registration usually doesn't return user/token immediately in all flows, 
        // but checking response success is key.
        return response
    }

    fun logout() {
        _currentUser.value = null
        com.tzir.delivery.shared.network.TokenManager.token = null
    }

    suspend fun updateFcmToken(token: String): Boolean {
        return api.updateFcmToken(token)
    }
}
