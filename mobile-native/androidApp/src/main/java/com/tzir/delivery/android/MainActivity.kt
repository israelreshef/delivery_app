package com.tzir.delivery.android

import android.content.Intent
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.foundation.layout.Box
import com.tzir.delivery.android.ui.auth.RegisterScreen
import com.tzir.delivery.android.ui.auth.LoginScreen
import com.tzir.delivery.android.ui.auth.SplashScreen
import com.tzir.delivery.android.ui.courier.DashboardScreen
import com.tzir.delivery.android.ui.courier.MissionDetailsScreen
import com.tzir.delivery.android.ui.courier.MissionHistoryScreen
import com.tzir.delivery.android.ui.courier.MissionsScreen
import com.tzir.delivery.android.ui.courier.EarningsScreen
import com.tzir.delivery.android.ui.courier.ProfileScreen
import com.tzir.delivery.android.ui.courier.NotificationCenterScreen
import com.tzir.delivery.android.ui.courier.SupportChatScreen
import com.tzir.delivery.android.ui.courier.DocumentsScreen
import com.tzir.delivery.android.ui.courier.CalendarScreen
import com.tzir.delivery.android.ui.courier.ClientsScreen
import com.tzir.delivery.android.ui.courier.SettingsScreen
import com.tzir.delivery.android.ui.courier.WorkerRatingScreen
import com.tzir.delivery.android.ui.courier.RouteOptimizationScreen
import com.tzir.delivery.android.ui.courier.ManualRoutePlannerScreen
import com.tzir.delivery.android.ui.courier.AcademyScreen
import com.tzir.delivery.android.ui.courier.CourseDetailScreen
import com.tzir.delivery.android.ui.courier.VehicleScreen
import com.tzir.delivery.android.ui.courier.MoreScreen
import com.tzir.delivery.shared.location.LocationManager
import com.tzir.delivery.shared.network.DeliveryApiImpl
import com.tzir.delivery.shared.network.KtorClientFactory
import com.tzir.delivery.shared.repository.AuthRepository
import androidx.compose.ui.Modifier
import androidx.compose.ui.Alignment
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import com.tzir.delivery.android.R
import com.tzir.delivery.android.ui.theme.*
import kotlinx.coroutines.launch

// ════════════════════════════════════════
// 4-Tab Navigation — Apple-Inspired
// ════════════════════════════════════════

enum class NavItem(val labelRes: Int, val icon: ImageVector) {
    CONTROL(R.string.control, Icons.Default.Home),
    MISSIONS(R.string.missions, Icons.Default.List),
    EARNINGS(R.string.business_management, Icons.Default.AccountBalanceWallet),
    MORE(R.string.drawer_settings, Icons.Default.GridView)
}

@OptIn(ExperimentalMaterial3Api::class)
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Manual DI for MVP
        val client = KtorClientFactory.createClient()
        val api = DeliveryApiImpl(client)
        val authRepository = AuthRepository(api).also { AuthRepository.instance = it }

        val driver = com.tzir.delivery.shared.db.DatabaseDriverFactory(this).createDriver()
        val database = com.tzir.delivery.shared.db.TzirDatabase(driver)
        val courierRepository = com.tzir.delivery.shared.repository.CourierRepository(api, database)

        val locationManager = LocationManager(api).also { LocationManager.instance = it }

        setContent {
            MyApplicationTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    val currentUser by authRepository.currentUser.collectAsState()
                    var isRegistering by remember { mutableStateOf(false) }
                    var showSplash by remember { mutableStateOf(true) }

                    if (showSplash) {
                        SplashScreen(onAnimationFinish = { showSplash = false })
                    } else if (currentUser != null) {
                        // Start LocationService when user is authenticated
                        LaunchedEffect(currentUser) {
                            currentUser?.let { user ->
                                if (user.role == com.tzir.delivery.shared.model.UserRole.COURIER) {
                                    val courierId = user.courierId ?: ""
                                    if (courierId.isNotEmpty()) {
                                        val intent = Intent(this@MainActivity, com.tzir.delivery.android.services.LocationService::class.java).apply {
                                            putExtra("courier_id", courierId)
                                        }
                                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                                            startForegroundService(intent)
                                        } else {
                                            startService(intent)
                                        }
                                    }
                                }
                            }
                        }

                        // ── Navigation State ──
                        var currentNav by remember { mutableStateOf(NavItem.CONTROL) }
                        var selectedMissionId by remember { mutableStateOf<Int?>(null) }
                        var showHistory by remember { mutableStateOf(false) }
                        var showNotifications by remember { mutableStateOf(false) }
                        var showSupport by remember { mutableStateOf(false) }
                        var showDocuments by remember { mutableStateOf(false) }
                        var showCalendar by remember { mutableStateOf(false) }
                        var showClients by remember { mutableStateOf(false) }
                        var showSettings by remember { mutableStateOf(false) }
                        var showWorkerRating by remember { mutableStateOf(false) }
                        var showRouteOptimization by remember { mutableStateOf(false) }
                        var showManualRoutePlanner by remember { mutableStateOf(false) }
                        var showAcademy by remember { mutableStateOf(false) }
                        var showProfile by remember { mutableStateOf(false) }
                        var showEarnings by remember { mutableStateOf(false) }
                        var showVehicles by remember { mutableStateOf(false) }
                        var selectedCourseId by remember { mutableStateOf<Int?>(null) }

                        val scope = rememberCoroutineScope()
                        val isAnyModalOpen = selectedMissionId != null || selectedCourseId != null ||
                                showHistory || showNotifications || showSupport || showDocuments ||
                                showCalendar || showClients || showSettings || showWorkerRating ||
                                showAcademy || showProfile || showEarnings || showRouteOptimization ||
                                showVehicles

                        Scaffold(
                            topBar = {
                                if (!isAnyModalOpen && currentNav != NavItem.CONTROL) {
                                    CenterAlignedTopAppBar(
                                        title = {
                                            Text(
                                                "Tzir",
                                                fontWeight = FontWeight.Black,
                                                color = MaterialTheme.colorScheme.onBackground
                                            )
                                        },
                                        colors = TopAppBarDefaults.centerAlignedTopAppBarColors(
                                            containerColor = Color.Transparent
                                        )
                                    )
                                }
                            },
                            bottomBar = {
                                if (!isAnyModalOpen) {
                                    NavigationBar(
                                        containerColor = MaterialTheme.colorScheme.surface.copy(alpha = 0.95f),
                                        tonalElevation = 0.dp
                                    ) {
                                        NavItem.entries.forEach { item ->
                                            NavigationBarItem(
                                                selected = currentNav == item,
                                                onClick = { currentNav = item },
                                                icon = {
                                                    Icon(
                                                        item.icon,
                                                        contentDescription = stringResource(item.labelRes),
                                                        modifier = Modifier.size(24.dp)
                                                    )
                                                },
                                                label = {
                                                    Text(
                                                        stringResource(item.labelRes),
                                                        fontWeight = if (currentNav == item) FontWeight.Bold else FontWeight.Normal
                                                    )
                                                },
                                                colors = NavigationBarItemDefaults.colors(
                                                    selectedIconColor = AmberGold,
                                                    selectedTextColor = AmberGold,
                                                    unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                                                    unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant,
                                                    indicatorColor = AmberGoldDim
                                                )
                                            )
                                        }
                                    }
                                }
                            }
                        ) { innerPadding ->
                            Box(modifier = Modifier.padding(if (!isAnyModalOpen) innerPadding else PaddingValues(0.dp))) {
                                // ── Modal Screens (overlay navigation) ──
                                if (selectedMissionId != null) {
                                    MissionDetailsScreen(
                                        missionId = selectedMissionId!!,
                                        repository = courierRepository,
                                        onBack = { selectedMissionId = null }
                                    )
                                } else if (showProfile) {
                                    ProfileScreen(
                                        repository = courierRepository,
                                        onLogout = {
                                            authRepository.logout()
                                            showProfile = false
                                        },
                                        onWorkerRatingClick = { showWorkerRating = true },
                                        onBack = { showProfile = false }
                                    )
                                } else if (showEarnings) {
                                    EarningsScreen(
                                        user = currentUser!!,
                                        repository = courierRepository,
                                        onShowHistory = {
                                            showEarnings = false
                                            showHistory = true
                                        },
                                        onBack = { showEarnings = false }
                                    )
                                } else if (showHistory) {
                                    MissionHistoryScreen(
                                        repository = courierRepository,
                                        onBack = { showHistory = false }
                                    )
                                } else if (showNotifications) {
                                    NotificationCenterScreen(
                                        onBack = { showNotifications = false }
                                    )
                                } else if (showSupport) {
                                    SupportChatScreen(
                                        onBack = { showSupport = false }
                                    )
                                } else if (showDocuments) {
                                    DocumentsScreen(
                                        onBack = { showDocuments = false }
                                    )
                                } else if (showCalendar) {
                                    CalendarScreen(
                                        onBack = { showCalendar = false }
                                    )
                                } else if (selectedCourseId != null) {
                                    CourseDetailScreen(
                                        courseId = selectedCourseId!!,
                                        repository = courierRepository,
                                        onBack = { selectedCourseId = null }
                                    )
                                } else if (showAcademy) {
                                    AcademyScreen(
                                        repository = courierRepository,
                                        onBack = { showAcademy = false },
                                        onCourseClick = { id -> selectedCourseId = id }
                                    )
                                } else if (showClients) {
                                    ClientsScreen(
                                        onBack = { showClients = false }
                                    )
                                } else if (showVehicles) {
                                    VehicleScreen(
                                        onBack = { showVehicles = false }
                                    )
                                } else if (showSettings) {
                                    SettingsScreen(
                                        onBack = { showSettings = false },
                                        onVehicleSettings = { showVehicles = true }
                                    )
                                } else if (showWorkerRating) {
                                    WorkerRatingScreen(
                                        onBack = { showWorkerRating = false }
                                    )
                                } else if (showManualRoutePlanner) {
                                    ManualRoutePlannerScreen(
                                        repository = courierRepository,
                                        onBack = { showManualRoutePlanner = false }
                                    )
                                } else {
                                    // ── Tab Screens ──
                                    when (currentNav) {
                                        NavItem.CONTROL -> DashboardScreen(
                                            user = currentUser!!,
                                            repository = courierRepository,
                                            locationManager = locationManager,
                                            onMenuClick = { /* no drawer anymore */ },
                                            onMissionClick = { id -> selectedMissionId = id },
                                            onNotificationClick = { showNotifications = true },
                                            onLogout = {
                                                authRepository.logout()
                                                isRegistering = false
                                            },
                                            onReportsClick = { showEarnings = true },
                                            onProfileClick = { showProfile = true },
                                            onSettingsClick = { showSettings = true },
                                            onRouteClick = { showManualRoutePlanner = true },
                                            onSupportClick = { showSupport = true },
                                            onCalendarClick = { showCalendar = true },
                                            onDocumentsClick = { showDocuments = true },
                                            onClientsClick = { showClients = true },
                                            onAcademyClick = { showAcademy = true }
                                        )
                                        NavItem.MISSIONS -> MissionsScreen(
                                            repository = courierRepository,
                                            onMissionClick = { id -> selectedMissionId = id }
                                        )
                                        NavItem.EARNINGS -> EarningsScreen(
                                            user = currentUser!!,
                                            repository = courierRepository,
                                            onShowHistory = { showHistory = true },
                                            onBack = { currentNav = NavItem.CONTROL }
                                        )
                                        NavItem.MORE -> MoreScreen(
                                            userName = currentUser!!.username,
                                            onProfileClick = { showProfile = true },
                                            onEarningsClick = {
                                                currentNav = NavItem.EARNINGS
                                            },
                                            onRouteClick = { showManualRoutePlanner = true },
                                            onCalendarClick = { showCalendar = true },
                                            onDocumentsClick = { showDocuments = true },
                                            onVehiclesClick = { showVehicles = true },
                                            onAcademyClick = { showAcademy = true },
                                            onSupportClick = { showSupport = true },
                                            onSettingsClick = { showSettings = true },
                                            onLogout = {
                                                authRepository.logout()
                                                isRegistering = false
                                            }
                                        )
                                    }
                                }
                            }
                        }
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
