package com.tzir.delivery.courier

import android.app.Application
import com.google.android.libraries.places.api.Places
import com.google.firebase.crashlytics.FirebaseCrashlytics
import com.tzir.delivery.courier.network.TokenManager
import android.util.Log
import dagger.hilt.android.HiltAndroidApp

@HiltAndroidApp
class TzirCourierApp : Application() {
    override fun onCreate() {
        super.onCreate()

        TokenManager.init(this)
        val hasAccessToken = TokenManager.token != null
        val hasRefreshToken = TokenManager.getRefreshToken() != null
        if (hasAccessToken && !hasRefreshToken) {
            Log.w("TzirCourierApp", "Stale session without refresh token — forcing re-login")
            TokenManager.clearTokens()
        }

        try {
            FirebaseCrashlytics.getInstance().apply {
                setCrashlyticsCollectionEnabled(true)
                log("TzirCourierApp started")
            }
        } catch (e: Exception) {
            Log.e("TzirCourierApp", "FirebaseCrashlytics not available", e)
        }

        val apiKey = getString(R.string.google_maps_key)
        if (apiKey.isNotEmpty() && !apiKey.startsWith("AIza")) {
             Log.e("TzirCourierApp", "Places API Key seems invalid or is a placeholder")
        }

        try {
            Places.initialize(applicationContext, apiKey)
            Log.d("TzirCourierApp", "Places SDK initialized successfully")
        } catch (e: Exception) {
            Log.e("TzirCourierApp", "Error initializing Places SDK", e)
        }
    }
}
