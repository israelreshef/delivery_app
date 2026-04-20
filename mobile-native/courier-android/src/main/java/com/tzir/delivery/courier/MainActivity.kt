package com.tzir.delivery.courier

import android.content.Intent
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.Box
import androidx.compose.material3.*
import androidx.compose.runtime.*
import com.tzir.delivery.courier.ui.auth.RegisterScreen
import com.tzir.delivery.courier.ui.auth.LoginScreen
import com.tzir.delivery.courier.ui.auth.SplashScreen
import androidx.room.Room
import com.tzir.delivery.courier.database.TzirDatabase
import com.tzir.delivery.courier.location.LocationManager
import com.tzir.delivery.courier.network.DeliveryApiImpl
import com.tzir.delivery.courier.network.KtorClientFactory
import com.tzir.delivery.courier.network.TokenManager
import com.tzir.delivery.courier.repository.AuthRepository
import com.tzir.delivery.courier.repository.CourierRepository
import androidx.navigation.compose.rememberNavController
import com.tzir.delivery.courier.ui.courier.CourierNavGraph
import androidx.compose.ui.Modifier
import androidx.compose.ui.Alignment
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import com.tzir.delivery.courier.R
import com.tzir.delivery.courier.ui.theme.*
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.unit.LayoutDirection

// ════════════════════════════════════════
// Tzir Delivery — Courier App
// ════════════════════════════════════════

enum class NavItem(val labelRes: Int, val icon: ImageVector) {
    CONTROL(R.string.control, Icons.Default.Home),
    CALENDAR(R.string.calendar, Icons.Default.CalendarToday),
    BUSINESS(R.string.business_management, Icons.Default.AccountBalanceWallet),
    SETTINGS(R.string.drawer_settings, Icons.Default.Settings)
}

@OptIn(ExperimentalMaterial3Api::class)
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Initialize Secure Token Storage
        TokenManager.init(applicationContext)

        // Manual DI for MVP
        val database = Room.databaseBuilder(
            applicationContext,
            TzirDatabase::class.java,
            "tzir_courier_db"
        )
            .fallbackToDestructiveMigration()
            .build()

        val client = KtorClientFactory.createClient()
        val api = DeliveryApiImpl(client)
        val authRepository = AuthRepository.getInstance(api)
        val courierRepository = CourierRepository.getInstance(api, database)
        val locationManager = LocationManager.getInstance(api)

        setContent {
            MyApplicationTheme {
                CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Rtl) {
                    Surface(
                        modifier = Modifier.fillMaxSize(),
                        color = MaterialTheme.colorScheme.background
                    ) {
                        val currentUser by authRepository.currentUser.collectAsState()
                        var isRegistering by remember { mutableStateOf(false) }
                        var showSplash by remember { mutableStateOf(true) }
                        val navController = rememberNavController()

                        // LocationService will be started by individual screens once status is confirmed
                        val permissionLauncher = androidx.activity.compose.rememberLauncherForActivityResult(
                            androidx.activity.result.contract.ActivityResultContracts.RequestMultiplePermissions()
                        ) { _ -> }

                        if (showSplash) {
                            SplashScreen(onAnimationFinish = { showSplash = false })
                        } else if (currentUser != null) {
                            // Initialize and connect socket immediately
                            LaunchedEffect(currentUser) {
                                println("MainDebug: LaunchedEffect(currentUser) trigger. User: $currentUser")
                                currentUser?.id?.let { userId ->
                                    println("MainDebug: Initializing and connecting socket for user: $userId")
                                    com.tzir.delivery.courier.services.SocketManager.init(applicationContext)
                                    com.tzir.delivery.courier.services.SocketManager.connect(userId.toString())
                                }

                                val permissions = mutableListOf(
                                    android.Manifest.permission.ACCESS_FINE_LOCATION,
                                    android.Manifest.permission.ACCESS_COARSE_LOCATION
                                )
                                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                                    permissions.add(android.Manifest.permission.POST_NOTIFICATIONS)
                                }
                                permissionLauncher.launch(permissions.toTypedArray())
                            }

                            CourierNavGraph(
                                navController = navController,
                                currentUser = currentUser!!,
                                authRepository = authRepository,
                                courierRepository = courierRepository,
                                locationManager = locationManager
                            )
                        } else if (isRegistering) {
                            RegisterScreen(
                                repository = authRepository,
                                onRegisterSuccess = { },
                                onBackToLogin = { isRegistering = false }
                            )
                        } else {
                            LoginScreen(
                                repository = authRepository,
                                onLoginSuccess = { },
                                onNavigateToRegister = { isRegistering = true }
                            )
                        }
                    }
                }
            }
        }
    }
}
