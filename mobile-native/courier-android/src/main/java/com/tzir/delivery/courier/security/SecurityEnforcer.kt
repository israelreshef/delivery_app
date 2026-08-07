package com.tzir.delivery.courier.security

import android.os.Build
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.tzir.delivery.courier.utils.SecureStorage

object SecurityEnforcer {

    private const val MIN_SDK_VERSION = Build.VERSION_CODES.M

    fun isEmulator(): Boolean {
        return Build.FINGERPRINT.startsWith("generic")
                || Build.FINGERPRINT.startsWith("unknown")
                || Build.MODEL.contains("google_sdk")
                || Build.MODEL.lowercase().contains("emulator")
                || Build.MODEL.contains("Android SDK built for x86")
                || Build.MANUFACTURER.contains("Genymotion")
                || Build.HARDWARE == "ranchu"
                || Build.HARDWARE == "goldfish"
                || Build.PRODUCT == "sdk"
                || Build.PRODUCT == "google_sdk"
                || Build.PRODUCT.lowercase().contains("emulator")
                || Build.BOARD.lowercase().contains("emulator")
    }

    fun isDeviceCompatible(): Boolean {
        if (Build.VERSION.SDK_INT < MIN_SDK_VERSION) return false
        if (isEmulator()) return true
        return SecureStorage.isHardwareBacked()
    }

    fun getMinAndroidVersion(): String = "Android 6.0 (API 23)"

    fun getCurrentAndroidVersion(): String = "Android ${Build.VERSION.RELEASE} (API ${Build.VERSION.SDK_INT})"
}

@Composable
fun IncompatibleDeviceScreen(onExit: () -> Unit = {}) {
    MaterialTheme(
        colorScheme = darkColorScheme()
    ) {
        Surface(
            modifier = Modifier.fillMaxSize(),
            color = MaterialTheme.colorScheme.background
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(32.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Text(
                    text = "מכשיר לא נתמך",
                    style = MaterialTheme.typography.headlineMedium,
                    color = MaterialTheme.colorScheme.error
                )
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    text = "המכשיר שלך אינו עומד בדרישות האבטחה של המערכת.",
                    style = MaterialTheme.typography.bodyLarge,
                    textAlign = TextAlign.Center,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    text = "דרישות מינימום:\n" +
                            SecurityEnforcer.getMinAndroidVersion() +
                            "\nרכיב אבטחת חומרה (TEE/StrongBox)",
                    style = MaterialTheme.typography.bodyMedium,
                    textAlign = TextAlign.Center,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "גרסה נוכחית: ${SecurityEnforcer.getCurrentAndroidVersion()}",
                    style = MaterialTheme.typography.bodySmall,
                    textAlign = TextAlign.Center,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(modifier = Modifier.height(24.dp))
                Text(
                    text = "האפליקציה לא תפעל במכשיר זה מסיבות אבטחה.",
                    style = MaterialTheme.typography.bodySmall,
                    textAlign = TextAlign.Center,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}
