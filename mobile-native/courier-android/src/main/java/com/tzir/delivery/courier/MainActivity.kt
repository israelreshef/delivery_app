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
import com.tzir.delivery.courier.security.IncompatibleDeviceScreen
import com.tzir.delivery.courier.security.SecurityEnforcer
import com.tzir.delivery.courier.location.LocationManager
import com.tzir.delivery.courier.repository.AuthRepository
import com.tzir.delivery.courier.repository.CalendarRepository
import com.tzir.delivery.courier.repository.ContactRepository
import com.tzir.delivery.courier.repository.CourierRepository
import com.tzir.delivery.courier.repository.EarningsRepository
import com.tzir.delivery.courier.repository.ExpenseRepository
import com.tzir.delivery.courier.repository.PaymentRepository
import com.tzir.delivery.courier.repository.RatingRepository
import com.tzir.delivery.courier.repository.VehicleRepository
import com.tzir.delivery.courier.repository.NotificationRepository
import com.tzir.delivery.courier.services.SyncManager
import com.tzir.delivery.courier.database.LocationUpdateDao
import com.tzir.delivery.courier.model.LocationRequest
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
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

enum class NavItem(val labelRes: Int, val icon: ImageVector) {
    CONTROL(R.string.control, Icons.Default.Home),
    CALENDAR(R.string.calendar, Icons.Default.CalendarToday),
    BUSINESS(R.string.business_management, Icons.Default.AccountBalanceWallet),
    SETTINGS(R.string.drawer_settings, Icons.Default.Settings)
}

@AndroidEntryPoint
@OptIn(ExperimentalMaterial3Api::class)
class MainActivity : ComponentActivity() {

    @Inject lateinit var authRepository: AuthRepository
    @Inject lateinit var courierRepository: CourierRepository
    @Inject lateinit var contactRepository: ContactRepository
    @Inject lateinit var vehicleRepository: VehicleRepository
    @Inject lateinit var ratingRepository: RatingRepository
    @Inject lateinit var earningsRepository: EarningsRepository
    @Inject lateinit var expenseRepository: ExpenseRepository
    @Inject lateinit var businessRepository: com.tzir.delivery.courier.repository.BusinessRepository
    @Inject lateinit var calendarRepository: CalendarRepository
    @Inject lateinit var paymentRepository: PaymentRepository
    @Inject lateinit var notificationRepository: NotificationRepository
    @Inject lateinit var locationManager: LocationManager
    @Inject lateinit var syncManager: SyncManager
    @Inject lateinit var locationUpdateDao: LocationUpdateDao

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        DarkModeState.isDarkTheme = getSharedPreferences(
            "tzir_prefs", android.content.Context.MODE_PRIVATE
        ).getBoolean("pref_dark_mode", true)

        setContent {
            val deviceCompatible = remember { SecurityEnforcer.isDeviceCompatible() }
            if (!deviceCompatible) {
                IncompatibleDeviceScreen()
                return@setContent
            }
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

                        val permissionLauncher = androidx.activity.compose.rememberLauncherForActivityResult(
                            androidx.activity.result.contract.ActivityResultContracts.RequestMultiplePermissions()
                        ) { _ -> }

                        if (showSplash) {
                            SplashScreen(onAnimationFinish = { showSplash = false })
                        } else if (currentUser != null) {
                            LaunchedEffect(currentUser) {
                                currentUser?.id?.let { userId ->
                                    com.tzir.delivery.courier.services.SocketManager.init(applicationContext)
                                    com.tzir.delivery.courier.services.SocketManager.connect(userId.toString())
                                    com.tzir.delivery.courier.services.SocketManager.registerSyncCallback {
                                        courierRepository.refreshAvailableMissions()
                                    }
                                }

                                syncManager.registerHandler("ACCEPT_ORDER") { action ->
                                    try {
                                        val id = action.endpoint.split("/").let { parts ->
                                            parts[parts.indexOf("orders") + 1].toIntOrNull() ?: return@registerHandler false
                                        }
                                        courierRepository.acceptMission(id)
                                    } catch (_: Exception) { false }
                                }
                                syncManager.registerHandler("SEND_LOCATION") { action ->
                                    try {
                                        val payload = org.json.JSONObject(action.payloadJson)
                                        val courierId = payload.optString("courier_id", "")
                                        val lat = payload.optDouble("lat", 0.0)
                                        val lng = payload.optDouble("lng", 0.0)
                                        if (lat != 0.0 && lng != 0.0) {
                                            courierRepository.getApi().sendLocation(LocationRequest(courierId, lat, lng))
                                        }
                                        true
                                    } catch (_: Exception) { false }
                                }
                                syncManager.registerHandler("SEND_LOCATION_BATCH") { _ ->
                                    try {
                                        val pending = locationUpdateDao.getPending()
                                        if (pending.isNotEmpty()) {
                                            pending.forEach { loc ->
                                                courierRepository.getApi().sendLocation(
                                                    LocationRequest("batch", loc.latitude, loc.longitude)
                                                )
                                            }
                                            locationUpdateDao.markSynced(pending.map { it.id })
                                        }
                                        true
                                    } catch (_: Exception) { false }
                                }
                                syncManager.registerHandler("UPDATE_STATUS") { action ->
                                    try {
                                        val id = action.endpoint.split("/").let { parts ->
                                            parts[parts.indexOf("orders") + 1].toIntOrNull() ?: return@registerHandler false
                                        }
                                        val payload = org.json.JSONObject(action.payloadJson)
                                        val status = payload.optString("status", "delivered")
                                        val lat = payload.optDouble("lat", 0.0).takeIf { it != 0.0 }
                                        val lng = payload.optDouble("lng", 0.0).takeIf { it != 0.0 }
                                        courierRepository.updateMissionStatus(id, status, lat, lng)
                                    } catch (_: Exception) { false }
                                }
                                syncManager.observeConnectivity(applicationContext)
                                syncManager.processQueue()

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
                                locationManager = locationManager,
                                contactRepository = contactRepository,
                                vehicleRepository = vehicleRepository,
                                ratingRepository = ratingRepository,
                                earningsRepository = earningsRepository,
                                expenseRepository = expenseRepository,
                                businessRepository = businessRepository,
                                calendarRepository = calendarRepository,
                                paymentRepository = paymentRepository,
                                notificationRepository = notificationRepository
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
