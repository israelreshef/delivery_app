package com.tzir.delivery.courier

import android.app.Application
import com.google.android.libraries.places.api.Places
import android.util.Log

class TzirCourierApp : Application() {
    override fun onCreate() {
        super.onCreate()
        
        // Initialize Places SDK globally
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
