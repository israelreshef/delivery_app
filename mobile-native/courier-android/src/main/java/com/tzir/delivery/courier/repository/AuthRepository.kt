package com.tzir.delivery.courier.repository

import com.tzir.delivery.courier.model.*
import com.tzir.delivery.courier.network.DeliveryApi
import com.tzir.delivery.courier.network.TokenManager
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

class AuthRepository(private val api: DeliveryApi) {

    private val _currentUser = MutableStateFlow<User?>(null)
    val currentUser: StateFlow<User?> = _currentUser.asStateFlow()

    init {
        if (TokenManager.sessionInvalidated) {
            _currentUser.value = null
            TokenManager.sessionInvalidated = false
        }
    }

    suspend fun login(username: String, password: String): AuthResponse {
        val request = LoginRequest(username = username, password = password)
        val response = api.login(request)
        
        if (response.success && response.user != null) {
            _currentUser.value = response.user
            TokenManager.token = response.accessToken
            response.refreshToken?.let { TokenManager.saveRefreshToken(it) }
        } else if (response.requires2fa) {
            // 2FA pending - no session stored until OTP is verified
            TokenManager.token = null
            _currentUser.value = null
        }
        
        return response
    }

    suspend fun loginVerifyMfa(mfaToken: String, code: String): AuthResponse {
        val response = api.loginVerifyMfa(mfaToken, code)
        
        if (response.success && response.user != null) {
            _currentUser.value = response.user
            TokenManager.token = response.accessToken
            response.refreshToken?.let { TokenManager.saveRefreshToken(it) }
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
