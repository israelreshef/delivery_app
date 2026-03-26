package com.tzir.delivery.customer

import android.app.Application
import android.util.Log

class CustomerApp : Application() {
    override fun onCreate() {
        super.onCreate()
        Log.d("CustomerApp", "App started — address autocomplete via backend API")
    }
}
