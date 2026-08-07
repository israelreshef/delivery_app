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
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import com.tzir.delivery.courier.R
import com.tzir.delivery.courier.NavItem
import com.tzir.delivery.courier.ui.theme.*
import com.tzir.delivery.courier.ui.components.*
import com.tzir.delivery.courier.model.User
import com.tzir.delivery.courier.model.CourierContact
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
    locationManager: LocationManager,
    contactRepository: ContactRepository? = null,
    vehicleRepository: VehicleRepository? = null,
    ratingRepository: RatingRepository? = null,
    earningsRepository: EarningsRepository? = null,
    expenseRepository: ExpenseRepository? = null,
    businessRepository: com.tzir.delivery.courier.repository.BusinessRepository? = null,
    calendarRepository: CalendarRepository? = null,
    paymentRepository: PaymentRepository? = null,
    notificationRepository: NotificationRepository? = null
) {
    // ── Navigation State ──
    var currentNav by remember { mutableStateOf(NavItem.CONTROL) }
    var selectedMissionId by remember { mutableStateOf<Int?>(null) }
    var showHistory by remember { mutableStateOf(false) }
    var showNotifications by remember { mutableStateOf(false) }
    var showSupport by remember { mutableStateOf(false) }
    var showDocuments by remember { mutableStateOf(false) }
    var showClients by remember { mutableStateOf(false) }
    var showWorkerRating by remember { mutableStateOf(false) }
    var showRouteOptimization by remember { mutableStateOf(false) }
    var showAcademy by remember { mutableStateOf(false) }
    var showProfile by remember { mutableStateOf(false) }
    var showEarnings by remember { mutableStateOf(false) }
    var showExpenses by remember { mutableStateOf(false) }
    var showBalance by remember { mutableStateOf(false) }
    var showPaymentMethods by remember { mutableStateOf(false) }
    var showVehicles by remember { mutableStateOf(false) }
    var showLeaderboard by remember { mutableStateOf(false) }
    var selectedCourseId by remember { mutableStateOf<Int?>(null) }
    var selectedProtocolCourseId by remember { mutableStateOf<Int?>(null) }
    var selectedProtocolMissionId by remember { mutableStateOf<Int?>(null) }
    var selectedClient by remember { mutableStateOf<CourierContact?>(null) }

    val isAnyModalOpen = selectedMissionId != null || selectedCourseId != null ||
            showHistory || showNotifications || showSupport || showDocuments ||
            showClients || showWorkerRating ||
            showAcademy || showProfile || showEarnings || showExpenses ||
            showRouteOptimization ||
            showVehicles || showLeaderboard || selectedProtocolMissionId != null ||
            selectedProtocolCourseId != null || selectedClient != null || showPaymentMethods

    Scaffold(
        topBar = {
            if (!isAnyModalOpen &&
                currentNav != NavItem.CONTROL &&
                currentNav != NavItem.CALENDAR &&
                currentNav != NavItem.BUSINESS &&
                currentNav != NavItem.SETTINGS
            ) {
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
                                selectedIconColor = BrandBlue,
                                selectedTextColor = BrandBlue,
                                unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                                unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant,
                                indicatorColor = BrandBlueDim
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
            } else if (showBalance) {
                BalanceScreen(
                    onBack = { showBalance = false },
                    paymentRepository = paymentRepository,
                    onPaymentMethodsClick = { showBalance = false; showPaymentMethods = true }
                )
            } else if (showPaymentMethods) {
                PaymentMethodsScreen(
                    onBack = { showPaymentMethods = false },
                    paymentRepository = paymentRepository
                )
            } else if (showLeaderboard) {
                LeaderboardScreen(
                    repository = courierRepository,
                    onBack = { showLeaderboard = false }
                )
            } else if (showProfile) {
                ProfileScreen(
                    user = currentUser,
                    repository = courierRepository,
                    vehicleRepository = vehicleRepository,
                    earningsRepository = earningsRepository,
                    expenseRepository = expenseRepository,
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
                    earningsRepository = earningsRepository,
                    paymentRepository = paymentRepository,
                    onShowHistory = {
                        showEarnings = false
                        showHistory = true
                    },
                    onBack = { showEarnings = false },
                    onBalanceClick = {
                        showEarnings = false
                        showBalance = true
                    }
                )
            } else if (showHistory) {
                MissionHistoryScreen(
                    repository = courierRepository,
                    onBack = { showHistory = false }
                )
            } else if (showNotifications) {
                NotificationCenterScreen(
                    onBack = { showNotifications = false },
                    notificationRepository = notificationRepository
                )
            } else if (showSupport) {
                SupportChatScreen(
                    onBack = { showSupport = false },
                    repository = courierRepository,
                    userId = currentUser.id
                )
            } else if (showDocuments) {
                DocumentsScreen(
                    onBack = { showDocuments = false },
                    repository = courierRepository
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
            } else if (selectedClient != null) {
                ClientDetailScreen(
                    client = selectedClient!!,
                    contactRepository = contactRepository,
                    onBack = { selectedClient = null }
                )
            } else if (showClients) {
                ClientsScreen(
                    onBack = { showClients = false },
                    onClientClick = { client -> selectedClient = client },
                    contactRepository = contactRepository
                )
            } else if (showVehicles) {
                VehicleScreen(
                    onBack = { showVehicles = false },
                    vehicleRepository = vehicleRepository
                )
            } else if (showExpenses) {
                ExpenseScreen(
                    onBack = { showExpenses = false },
                    expenseRepository = expenseRepository
                )
            } else if (showWorkerRating) {
                WorkerRatingScreen(
                    onBack = { showWorkerRating = false },
                    ratingRepository = ratingRepository
                )
            } else if (showRouteOptimization) {
                RouteOptimizationScreen(
                    repository = courierRepository,
                    locationManager = locationManager,
                    onBack = { showRouteOptimization = false },
                    onApprove = { showRouteOptimization = false }
                )

            } else {
                // ── Tab Screens ──
                when (currentNav) {
                    NavItem.CONTROL -> {
                        val dashboardViewModel: DashboardViewModel = hiltViewModel()
                        DashboardScreen(
                            user = currentUser,
                            viewModel = dashboardViewModel,
                            repository = courierRepository,
                            locationManager = locationManager,
                            notificationRepository = notificationRepository,
                            onMenuClick = { },
                        onMissionClick = { id -> selectedMissionId = id },
                        onNotificationClick = { showNotifications = true },
                        onLogout = { authRepository.logout() },
                        onReportsClick = { showEarnings = true },
                        onProfileClick = { showProfile = true },
                        onSettingsClick = { currentNav = NavItem.SETTINGS },
                        onSupportClick = { showSupport = true },
                        onCalendarClick = { currentNav = NavItem.CALENDAR },
                        onDocumentsClick = { showDocuments = true },
                        onClientsClick = { showClients = true },
                        onAcademyClick = { showAcademy = true }
                        )
                    }
                    NavItem.CALENDAR -> CalendarScreen(
                        onBack = { currentNav = NavItem.CONTROL },
                        calendarRepository = calendarRepository
                    )
                    NavItem.BUSINESS -> BusinessScreen(
                        businessRepository = businessRepository,
                        expenseRepository = expenseRepository
                    )
                    NavItem.SETTINGS -> SettingsScreen(
                        onBack = { currentNav = NavItem.CONTROL },
                        user = currentUser,
                        courierRepository = courierRepository,
                        onVehicleSettings = { showVehicles = true },
                        onRouteClick = { currentNav = NavItem.CONTROL },
                        onCalendarClick = { currentNav = NavItem.CALENDAR },
                        onDocumentsClick = { showDocuments = true },
                        onAcademyClick = { showAcademy = true },
                        onSupportClick = { showSupport = true },
                        onLogout = { authRepository.logout() }
                    )
                }
            }
        }
    }
}
