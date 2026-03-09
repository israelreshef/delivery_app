package com.tzir.delivery.android.utils

import android.content.Context
import android.os.Build
import android.provider.Settings
import com.google.android.play.core.integrity.IntegrityManagerFactory
import com.google.android.play.core.integrity.IntegrityTokenRequest
import java.io.File

object TamperDetection {

    /**
     * Implementation of Phase 2 Mobile Hardening:
     * - Google Play Integrity API
     * - Root & Debugger Detection
     * - Emulator Detection (Fail-fast in production)
     */
    fun checkIntegrity(context: Context, callback: (Boolean) -> Unit) {
        if (isRooted() || isDebuggerConnected() || isEmulator()) {
            callback(false)
            return
        }

        // Google Play Integrity API
        val integrityManager = IntegrityManagerFactory.create(context)
        val nonce = "simulated_nonce_from_server" // In prod, fetch from backend
        
        val integrityTokenRequest = IntegrityTokenRequest.builder()
            .setCloudProjectNumber(123456789) // Placeholder
            .setNonce(nonce)
            .build()

        integrityManager.requestIntegrityToken(integrityTokenRequest)
            .addOnSuccessListener { response ->
                val token = response.token()
                // Send token to backend for verification
                callback(true) 
            }
            .addOnFailureListener {
                callback(false)
            }
    }

    private fun isRooted(): Boolean {
        val paths = arrayOf(
            "/system/app/Superuser.apk", "/sbin/su", "/system/bin/su",
            "/system/xbin/su", "/data/local/xbin/su", "/data/local/bin/su",
            "/system/sd/xbin/su", "/system/bin/failsafe/su", "/data/local/su"
        )
        for (path in paths) {
            if (File(path).exists()) return true
        }
        return Build.TAGS != null && Build.TAGS.contains("test-keys")
    }

    private fun isDebuggerConnected(): Boolean {
        return android.os.Debug.isDebuggerConnected()
    }

    private fun isEmulator(): Boolean {
        return (Build.BRAND.startsWith("generic") && Build.DEVICE.startsWith("generic"))
                || Build.FINGERPRINT.startsWith("generic")
                || Build.FINGERPRINT.startsWith("unknown")
                || Build.HARDWARE.contains("goldfish")
                || Build.HARDWARE.contains("ranchu")
                || Build.MODEL.contains("google_sdk")
                || Build.MODEL.contains("Emulator")
                || Build.MODEL.contains("Android SDK built for x86")
                || Build.MANUFACTURER.contains("Genymotion")
                || Build.PRODUCT.contains("sdk_google")
                || Build.PRODUCT.contains("google_sdk")
                || Build.PRODUCT.contains("sdk")
                || Build.PRODUCT.contains("sdk_x86")
                || Build.PRODUCT.contains("vbox86p")
                || Build.PRODUCT.contains("emulator")
                || Build.PRODUCT.contains("simulator")
    }
}
