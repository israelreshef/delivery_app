package com.tzir.delivery.customer.ui.components

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.SignalWifiOff
import androidx.compose.material.icons.filled.Wifi
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tzir.delivery.customer.ui.theme.BrandBlue

/**
 * Monitors network connectivity and exposes [isConnected] as a State.
 */
@Composable
fun rememberConnectivityState(): State<Boolean> {
    val context = LocalContext.current
    val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
    val isConnected = remember {
        mutableStateOf(connectivityManager.isCurrentlyConnected())
    }

    DisposableEffect(Unit) {
        val callback = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) {
                isConnected.value = true
            }
            override fun onLost(network: Network) {
                isConnected.value = connectivityManager.isCurrentlyConnected()
            }
        }
        val request = NetworkRequest.Builder()
            .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            .build()
        connectivityManager.registerNetworkCallback(request, callback)
        onDispose { connectivityManager.unregisterNetworkCallback(callback) }
    }
    return isConnected
}

private fun ConnectivityManager.isCurrentlyConnected(): Boolean {
    val network = activeNetwork ?: return false
    val caps = getNetworkCapabilities(network) ?: return false
    return caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
}

/**
 * A banner that appears at the top of the screen when there is no internet connection,
 * and shows a brief "reconnected" confirmation when connectivity is restored.
 *
 * Usage: Place this at the top of your screen composable, inside PremiumBackground.
 */
@Composable
fun ConnectivityBanner(modifier: Modifier = Modifier) {
    val isConnected by rememberConnectivityState()
    var showReconnected by remember { mutableStateOf(false) }

    LaunchedEffect(isConnected) {
        if (isConnected) {
            showReconnected = true
            kotlinx.coroutines.delay(2000)
            showReconnected = false
        }
    }

    AnimatedVisibility(
        visible = !isConnected || showReconnected,
        enter = slideInVertically(initialOffsetY = { -it }) + fadeIn(),
        exit = slideOutVertically(targetOffsetY = { -it }) + fadeOut(),
        modifier = modifier
    ) {
        val bgColor = if (isConnected) Color(0xFF2E7D32) else Color(0xFFC62828)
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(bgColor)
                .padding(horizontal = 16.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center
        ) {
            Icon(
                imageVector = if (isConnected) Icons.Default.Wifi else Icons.Default.SignalWifiOff,
                contentDescription = null,
                tint = Color.White,
                modifier = Modifier.size(18.dp)
            )
            Spacer(Modifier.width(8.dp))
            Text(
                text = if (isConnected) "החיבור חזר ✓" else "אין חיבור לאינטרנט",
                color = Color.White,
                fontSize = 13.sp,
                fontWeight = FontWeight.SemiBold
            )
        }
    }
}
