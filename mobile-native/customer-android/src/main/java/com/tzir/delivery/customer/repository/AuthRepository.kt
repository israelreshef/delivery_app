package com.tzir.delivery.customer.repository

import com.tzir.delivery.customer.model.*
import com.tzir.delivery.customer.network.DeliveryApi
import com.tzir.delivery.customer.network.TokenManager
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

    /**
     * Restores an in-memory session from a persisted token (if present) without
     * forcing the user back to the login screen on every app/process restart.
     * Fetches the current profile so navigation has a valid User object.
     */
    suspend fun restoreSessionIfNeeded(api: DeliveryApi) {
        if (_currentUser.value != null) return
        if (TokenManager.token.isNullOrEmpty()) return
        try {
            _currentUser.value = api.getCustomerProfile()
        } catch (_: Exception) {
            // Token invalid/expired — leave currentUser null so login is shown.
            // Do NOT clear the token here to avoid logout loops.
        }
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
