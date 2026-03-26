package com.tzir.delivery.courier.network

import android.content.Context
import android.util.Log
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

/**
 * Secure token storage using EncryptedSharedPreferences (AES256-GCM).
 * Tokens are encrypted at rest and never exposed in plain text.
 * Call TokenManager.init(context) once in Application.onCreate().
 */
object TokenManager {
    private const val PREFS_NAME = "secure_token_prefs"
    private const val KEY_ACCESS = "access_token"
    private const val KEY_REFRESH = "refresh_token"

    private var prefs: android.content.SharedPreferences? = null

    fun init(context: Context) {
        try {
            Log.d("TokenManager", "Initializing TokenManager...")
            println("TokenManager: Initializing TokenManager...")
            val masterKey = MasterKey.Builder(context)
                .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                .build()
            prefs = EncryptedSharedPreferences.create(
                context,
                PREFS_NAME,
                masterKey,
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
            )
            val hasToken = !token.isNullOrEmpty()
            Log.d("TokenManager", "TokenManager initialized successfully. Token present: $hasToken")
            println("TokenManager: Initialized successfully. Token present: $hasToken")
        } catch (e: Exception) {
            Log.e("TokenManager", "Failed to initialize TokenManager", e)
            println("TokenManager: FAILED to initialize: ${e.message}")
        }
    }

    /** Legacy in-memory accessor used during the session (not persisted after init). */
    var token: String?
        get() = prefs?.getString(KEY_ACCESS, null)
        set(value) { if (value != null) saveToken(value) else clearTokens() }

    fun saveToken(token: String) {
        Log.d("TokenManager", "Saving access token (length: ${token.length})")
        println("TokenManager: Saving access token (length: ${token.length})")
        prefs?.edit()?.putString(KEY_ACCESS, token)?.commit()
    }

    fun saveRefreshToken(token: String) {
        Log.d("TokenManager", "Saving refresh token")
        prefs?.edit()?.putString(KEY_REFRESH, token)?.commit()
    }

    fun getRefreshToken(): String? =
        prefs?.getString(KEY_REFRESH, null)

    fun clearTokens() {
        Log.d("TokenManager", "Clearing all tokens")
        prefs?.edit()?.clear()?.commit()
    }
}
