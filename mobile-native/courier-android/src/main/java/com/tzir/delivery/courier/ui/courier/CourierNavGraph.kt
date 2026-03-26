package com.tzir.delivery.courier.ui.courier

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import com.tzir.delivery.courier.R
import com.tzir.delivery.courier.NavItem
import com.tzir.delivery.courier.ui.theme.*
import com.tzir.delivery.courier.ui.components.*
import com.tzir.delivery.courier.model.User
import com.tzir.delivery.courier.repository.AuthRepository
import com.tzir.delivery.courier.repository.CourierRepository
import com.tzir.delivery.courier.location.LocationManager

/**
 * TZIR Courier Navigation Graph
 * Safely wraps the existing courier UI flow.
 * Ported as part of Phase 2 Mobile Design System.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CourierNavGraph(
    navController: NavController,
    currentUser: User,
    authRepository: AuthRepository,
    courierRepository: CourierRepository,
    locationManager: LocationManager
) {
    // ── Navigation State (Copied from MainActivity) ──
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
    var showLeaderboard by remember { mutableStateOf(false) }
    var selectedCourseId by remember { mutableStateOf<Int?>(null) }
    var selectedProtocolCourseId by remember { mutableStateOf<Int?>(null) }
    var selectedProtocolMissionId by remember { mutableStateOf<Int?>(null) }

    val isAnyModalOpen = selectedMissionId != null || selectedCourseId != null ||
            showHistory || showNotifications || showSupport || showDocuments ||
            showCalendar || showClients || showSettings || showWorkerRating ||
            showAcademy || showProfile || showEarnings || showRouteOptimization ||
            showVehicles || showLeaderboard || selectedProtocolMissionId != null || 
            selectedProtocolCourseId != null || showManualRoutePlanner

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
                    onStartProtocol = { 
                        selectedProtocolMissionId = selectedMissionId
                        selectedMissionId = null
                    },
                    onBack = { selectedMissionId = null }
                )
            } else if (selectedProtocolMissionId != null) {
                MissionProtocolScreen(
                    missionId = selectedProtocolMissionId!!,
                    repository = courierRepository,
                    onBack = { selectedProtocolMissionId = null },
                    onComplete = {
                        selectedProtocolMissionId = null
                    }
                )
            } else if (showLeaderboard) {
                LeaderboardScreen(
                    repository = courierRepository,
                    onBack = { showLeaderboard = false }
                )
            } else if (showProfile) {
                ProfileScreen(
                    repository = courierRepository,
                    onLogout = {
                        authRepository.logout()
                        showProfile = false
                    },
                    onWorkerRatingClick = { showWorkerRating = true },
                    onLeaderboardClick = { showLeaderboard = true },
                    onBack = { showProfile = false }
                )
            } else if (showEarnings) {
                EarningsScreen(
                    user = currentUser,
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
                    isProtocol = false,
                    onBack = { selectedCourseId = null }
                )
            } else if (selectedProtocolCourseId != null) {
                CourseDetailScreen(
                    courseId = selectedProtocolCourseId!!,
                    repository = courierRepository,
                    isProtocol = true,
                    onBack = { selectedProtocolCourseId = null }
                )
            } else if (showAcademy) {
                AcademyScreen(
                    repository = courierRepository,
                    onBack = { showAcademy = false },
                    onCourseClick = { id, isProtocol -> 
                        if (id != null) {
                            if (isProtocol) selectedProtocolCourseId = id
                            else selectedCourseId = id
                        }
                    }
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
            } else if (showRouteOptimization) {
                RouteOptimizationScreen(
                    repository = courierRepository,
                    locationManager = locationManager,
                    onBack = { showRouteOptimization = false },
                    onApprove = { showRouteOptimization = false }
                )
            } else if (showManualRoutePlanner) {
                ManualRoutePlannerScreen(
                    repository = courierRepository,
                    locationManager = locationManager,
                    onBack = { showManualRoutePlanner = false }
                )
            } else {
                // ── Tab Screens (Courier Flow) ──
                when (currentNav) {
                    NavItem.CONTROL -> DashboardScreen(
                        user = currentUser,
                        repository = courierRepository,
                        locationManager = locationManager,
                        onMenuClick = { },
                        onMissionClick = { id -> selectedMissionId = id },
                        onNotificationClick = { showNotifications = true },
                        onLogout = {
                            authRepository.logout()
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
                        user = currentUser,
                        repository = courierRepository,
                        onShowHistory = { showHistory = true },
                        onBack = { currentNav = NavItem.CONTROL }
                    )
                    NavItem.MORE -> MoreScreen(
                        userName = currentUser.username,
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
                        }
                    )
                }
            }
        }
    }
}
