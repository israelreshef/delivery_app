
package com.tzir.delivery.android

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
import com.tzir.delivery.shared.location.LocationManager
import com.tzir.delivery.shared.network.DeliveryApiImpl
import com.tzir.delivery.shared.network.KtorClientFactory
import com.tzir.delivery.shared.repository.AuthRepository
import androidx.compose.ui.Modifier
import androidx.compose.ui.Alignment
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.ui.unit.dp
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.ui.graphics.vector.ImageVector

import androidx.compose.ui.res.stringResource
import com.tzir.delivery.android.R

enum class NavItem(val labelRes: Int, val icon: ImageVector) {
    CONTROL(R.string.control, Icons.Default.Home),
    MISSIONS(R.string.missions, Icons.Default.List),
    REGULATIONS(R.string.regulations, Icons.Default.Description),
    PROFILE(R.string.profile, Icons.Default.Person)
}

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Manual DI for MVP
        val client = KtorClientFactory.createClient()
        val api = DeliveryApiImpl(client) // Uses 10.0.2.2 for Android Emulator
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
                        var selectedCourseId by remember { mutableStateOf<Int?>(null) }
                        
                        Scaffold(
                            bottomBar = {
                                if (selectedMissionId == null && selectedCourseId == null && !showHistory && !showNotifications && !showSupport && !showDocuments && !showCalendar && !showClients && !showSettings && !showWorkerRating && !showAcademy && !showManualRoutePlanner) {
                                    NavigationBar(
                                        containerColor = Color.White,
                                        tonalElevation = 8.dp
                                    ) {
                                        NavItem.entries.forEach { item ->
                                            NavigationBarItem(
                                                selected = currentNav == item,
                                                onClick = { 
                                                    currentNav = item
                                                    showHistory = false // Reset history view when switching tabs
                                                },
                                                icon = { Icon(item.icon, contentDescription = stringResource(item.labelRes)) },
                                                label = { Text(stringResource(item.labelRes)) },
                                                colors = NavigationBarItemDefaults.colors(
                                                    selectedIconColor = Color(0xFF6B8F3E),
                                                    selectedTextColor = Color(0xFF1C3D2A),
                                                    unselectedIconColor = Color.Gray,
                                                    unselectedTextColor = Color.Gray,
                                                    indicatorColor = Color(0xFFF5F5F0)
                                                )
                                            )
                                        }
                                    }
                                }
                            }
                        ) { innerPadding ->
                            Box(modifier = Modifier.padding(if (selectedMissionId == null && selectedCourseId == null && !showHistory && !showNotifications && !showSupport && !showDocuments && !showCalendar && !showClients && !showSettings && !showWorkerRating && !showAcademy && !showManualRoutePlanner) innerPadding else PaddingValues(0.dp))) {
                                if (selectedMissionId != null) {
                                    MissionDetailsScreen(
                                        missionId = selectedMissionId!!,
                                        repository = courierRepository,
                                        onBack = { selectedMissionId = null }
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
                                } else if (showSettings) {
                                    SettingsScreen(
                                        onBack = { showSettings = false }
                                    )
                                } else if (showWorkerRating) {
                                    WorkerRatingScreen(
                                        onBack = { showWorkerRating = false }
                                    )
                                } else if (showManualRoutePlanner) {
                                    ManualRoutePlannerScreen(
                                        repository = courierRepository,
                                        onBack = { showManualRoutePlanner = false },
                                        onStartNavigation = { stops ->
                                            showManualRoutePlanner = false
                                            // Handle start navigation logic here if needed
                                        }
                                    )
                                } else if (showRouteOptimization) {
                                    RouteOptimizationScreen(
                                        repository = courierRepository,
                                        onBack = { showRouteOptimization = false },
                                        onApprove = { showRouteOptimization = false }
                                    )
                                } else {
                                    when (currentNav) {
                                        NavItem.CONTROL -> DashboardScreen(
                                            user = currentUser!!,
                                            repository = courierRepository,
                                            locationManager = locationManager,
                                            onMissionClick = { id -> selectedMissionId = id },
                                            onNotificationClick = { showNotifications = true },
                                            onLogout = {
                                                authRepository.logout()
                                                isRegistering = false
                                            },
                                            onReportsClick = { showHistory = true },
                                            onProfileClick = { currentNav = NavItem.PROFILE },
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
                                        NavItem.REGULATIONS -> DocumentsScreen(
                                            onBack = { currentNav = NavItem.CONTROL }
                                        )
                                        NavItem.PROFILE -> ProfileScreen(
                                            repository = courierRepository,
                                            onLogout = {
                                                authRepository.logout()
                                                isRegistering = false
                                            },
                                            onWorkerRatingClick = { showWorkerRating = true }
                                        )
                                    }
                                }
                            }
                        }
                    } else if (isRegistering) {
                        RegisterScreen(
                            repository = authRepository,
                            onRegisterSuccess = {
                                // currentUser will update automatically via repository
                            },
                            onBackToLogin = {
                                isRegistering = false
                            }
                        )
                    } else {
                        LoginScreen(
                            repository = authRepository,
                            onLoginSuccess = {
                                // currentUser will update automatically via repository
                            },
                            onNavigateToRegister = {
                                isRegistering = true
                            }
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun GreetingView(text: String) {
    Text(text = text)
}

@Composable
fun MyApplicationTheme(content: @Composable () -> Unit) {
    val colorScheme = lightColorScheme(
        primary = Color(0xFF6B8F3E),    // Modern Cyan
        onPrimary = Color.White,
        secondary = Color(0xFF1C3D2A),  // Premium Deep Navy
        onSecondary = Color.White,
        tertiary = Color(0xFF1A7A8A),   // Royal Blue
        background = Color(0xFFF5F5F0), // Airy Light Blue
        surface = Color.White,
        onSurface = Color(0xFF1C3D2A),
        error = Color(0xFFE91E63)      // Modern Pinkish-Red
    )

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography(
            headlineLarge = TextStyle(
                fontWeight = FontWeight.ExtraBold,
                fontSize = 32.sp,
                letterSpacing = (-0.5).sp,
                color = Color(0xFF1C3D2A)
            ),
            headlineMedium = TextStyle(
                fontWeight = FontWeight.Bold,
                fontSize = 24.sp,
                letterSpacing = 0.sp,
                color = Color(0xFF1C3D2A)
            ),
            titleLarge = TextStyle(
                fontWeight = FontWeight.SemiBold,
                fontSize = 20.sp,
                color = Color(0xFF1C3D2A)
            ),
            bodyLarge = TextStyle(
                fontWeight = FontWeight.Normal,
                fontSize = 16.sp,
                letterSpacing = 0.5.sp,
                color = Color(0xFF1C3D2A).copy(alpha = 0.8f)
            ),
            labelLarge = TextStyle(
                fontWeight = FontWeight.Medium,
                fontSize = 14.sp,
                color = Color(0xFF1C3D2A).copy(alpha = 0.6f)
            )
        ),
        content = content
    )
}
