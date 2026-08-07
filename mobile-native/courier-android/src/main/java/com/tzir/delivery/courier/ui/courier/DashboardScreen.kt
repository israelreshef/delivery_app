package com.tzir.delivery.courier.ui.courier

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.content.Intent
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.*
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.zIndex
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.model.BitmapDescriptorFactory
import com.google.android.gms.maps.model.CameraPosition
import com.google.android.gms.maps.model.LatLng
import com.google.android.gms.maps.model.MapStyleOptions
import com.google.maps.android.compose.*
import com.tzir.delivery.courier.R
import com.tzir.delivery.courier.ui.components.*
import com.tzir.delivery.courier.ui.theme.*
import com.tzir.delivery.courier.model.User
import com.tzir.delivery.courier.repository.CourierRepository
import com.tzir.delivery.courier.repository.NotificationRepository
import com.tzir.delivery.courier.location.LocationManager

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import org.json.JSONObject
import java.net.URL
import java.util.Calendar

@Composable
fun DashboardScreen(
    user: User,
    viewModel: DashboardViewModel,
    repository: CourierRepository,
    locationManager: LocationManager,
    notificationRepository: NotificationRepository? = null,
    onMenuClick: () -> Unit,
    onMissionClick: (Int) -> Unit,
    onNotificationClick: () -> Unit,
    onLogout: () -> Unit,
    onReportsClick: () -> Unit = {},
    onProfileClick: () -> Unit = {},
    onSettingsClick: () -> Unit = {},
    onSupportClick: () -> Unit = {},
    onCalendarClick: () -> Unit = {},
    onDocumentsClick: () -> Unit = {},
    onClientsClick: () -> Unit = {},
    onAcademyClick: () -> Unit = {}
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    val context = LocalContext.current
    val activeMission = uiState.activeMissions.firstOrNull()
    var isLoading by remember { mutableStateOf(false) }
    val acceptedMissionIds = remember { mutableStateListOf<Int>() }

    val scope = rememberCoroutineScope()

    val stops = remember { mutableStateListOf<PlannerStop>() }
    var plannerMode by remember { mutableStateOf(PlannerMode.LIST) }
    var editingStopIndex by remember { mutableStateOf<Int?>(null) }

    var routeGeometry by remember { mutableStateOf<List<LatLng>?>(null) }

    val lifecycleOwner = LocalLifecycleOwner.current
    var isAppInForeground by remember { mutableStateOf(true) }

    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_START || event == Lifecycle.Event.ON_RESUME) {
                isAppInForeground = true
                com.tzir.delivery.courier.services.SocketManager.setAvailabilityStatus(true, user.id.toString())
            } else if (event == Lifecycle.Event.ON_PAUSE || event == Lifecycle.Event.ON_STOP) {
                isAppInForeground = false
                com.tzir.delivery.courier.services.SocketManager.setAvailabilityStatus(false, user.id.toString())
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    LaunchedEffect(Unit) {
        com.tzir.delivery.courier.services.SocketManager.missionUpdates.collect {
            viewModel.refresh()
        }
    }

    LaunchedEffect(Unit) {
        com.tzir.delivery.courier.services.SocketManager.newOrderEvents.collect { orderJson ->
            viewModel.refresh()
        }
    }

    LaunchedEffect(isAppInForeground, activeMission) {
        val courierId = user.courierId ?: ""
        if (courierId.isNotEmpty() && (isAppInForeground || activeMission != null)) {
            val intent = Intent(context, com.tzir.delivery.courier.services.LocationService::class.java).apply {
                putExtra("courier_id", courierId)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        } else if (courierId.isNotEmpty() && !isAppInForeground && activeMission == null) {
            val intent = Intent(context, com.tzir.delivery.courier.services.LocationService::class.java)
            context.stopService(intent)
        }
    }

    var hasLocationPermission by remember {
        mutableStateOf(ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED)
    }

    val launcher = rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { p ->
        hasLocationPermission = p.values.all { it }
    }

    LaunchedEffect(Unit) {
        if (!hasLocationPermission) {
            launcher.launch(arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION))
        }
    }

    val telAviv = LatLng(32.0853, 34.7818)
    val cameraPositionState = rememberCameraPositionState { position = CameraPosition.fromLatLngZoom(telAviv, 13f) }

    val currentLocationFlow = uiState.currentLocation

    var hasCenteredCamera by remember { mutableStateOf(false) }
    LaunchedEffect(currentLocationFlow) {
        currentLocationFlow?.let { (lat, lng) ->
            if (!hasCenteredCamera) {
                cameraPositionState.animate(
                    CameraUpdateFactory.newLatLngZoom(LatLng(lat, lng), 15f)
                )
                hasCenteredCamera = true
            }
        }
    }

    CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Rtl) {
        Box(modifier = Modifier.fillMaxSize()) {
            val mapStyleOptions = remember {
                MapStyleOptions.loadRawResourceStyle(context, R.raw.map_style_midnight)
            }

            GoogleMap(
                modifier = Modifier.fillMaxSize(),
                cameraPositionState = cameraPositionState,
                properties = MapProperties(
                    isMyLocationEnabled = hasLocationPermission,
                    mapStyleOptions = mapStyleOptions
                ),
                uiSettings = MapUiSettings(
                    myLocationButtonEnabled = true,
                    zoomControlsEnabled = false,
                    compassEnabled = true
                )
            ) {
                currentLocationFlow?.let { (lat, lng) ->
                    Marker(
                        state = rememberMarkerState(position = LatLng(lat, lng)),
                        title = "המיקום שלך",
                        icon = BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_AZURE)
                    )
                }

                if (routeGeometry != null && routeGeometry!!.isNotEmpty()) {
                    Polyline(
                        points = routeGeometry!!,
                        color = Color(0xFF8ECFB9).copy(alpha = 0.8f),
                        width = 8f
                    )
                } else if (stops.size >= 2) {
                    Polyline(
                        points = stops.map { LatLng(it.lat, it.lng) },
                        color = Color(0xFF8ECFB9).copy(alpha = 0.6f),
                        width = 6f
                    )
                }
                for (idx in stops.indices) {
                    val stop = stops[idx]
                    MarkerComposable(
                        state = rememberMarkerState(position = LatLng(stop.lat, stop.lng)),
                        title = "${idx + 1}. ${stop.address}",
                        snippet = if (stop.stopType == "pickup") "איסוף" else "מסירה",
                        onClick = {
                            editingStopIndex = idx
                            plannerMode = PlannerMode.STOP_DETAIL
                            true
                        }
                    ) {
                        Box(
                            modifier = Modifier
                                .size(28.dp)
                                .clip(CircleShape)
                                .background(if (stop.stopType == "pickup") Color(0xFF8ECFB9) else Color(0xFF6B7280))
                                .border(2.dp, Color.White, CircleShape),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = (stop.orderIndex ?: (idx + 1)).toString(),
                                color = Color.White,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }

            Row(
                modifier = Modifier
                    .align(Alignment.TopCenter)
                    .fillMaxWidth()
                    .statusBarsPadding()
                    .padding(16.dp)
                    .zIndex(10f),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                val unreadCount by (notificationRepository?.unreadCount?.collectAsState()
                    ?: remember { mutableStateOf(0) })

                Box(modifier = Modifier.size(52.dp)) {
                    GlassCard(
                        modifier = Modifier.fillMaxSize(),
                        cornerRadius = 26.dp
                    ) {
                        IconButton(onClick = onNotificationClick, modifier = Modifier.fillMaxSize()) {
                            Icon(Icons.Default.Notifications, contentDescription = null, tint = BrandBlue, modifier = Modifier.size(24.dp))
                        }
                    }
                    if (unreadCount > 0) {
                        Box(
                            modifier = Modifier
                                .align(Alignment.TopEnd)
                                .offset(x = (-2).dp, y = 2.dp)
                                .size(20.dp)
                                .background(Color(0xFFFF3B30), shape = CircleShape),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = if (unreadCount > 99) "99+" else unreadCount.toString(),
                                color = Color.White,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }

            Column(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth()
                    .zIndex(10f)
            ) {
                AnimatedVisibility(
                    visible = activeMission != null && (activeMission?.status != "assigned" || activeMission?.id in acceptedMissionIds),
                    modifier = Modifier.padding(horizontal = 16.dp).padding(bottom = 16.dp)
                ) {
                    activeMission?.let { mission ->
                        ActiveMissionCard(mission = mission, onDetailsClick = { onMissionClick(mission.id) })
                    }
                }

                if (activeMission != null && activeMission?.status == "assigned" && activeMission?.id !in acceptedMissionIds) {
                    Box(modifier = Modifier.padding(horizontal = 16.dp).padding(bottom = 16.dp)) {
                        OrderOfferDialog(
                            mission = activeMission!!,
                            onAccept = {
                                val mId = activeMission!!.id
                                acceptedMissionIds.add(mId)
                                viewModel.acceptMission(mId)
                                onMissionClick(mId)
                            },
                            onDecline = {
                                viewModel.rejectMission(activeMission!!.id)
                            }
                        )
                    }
                }

                RoutePlannerPanel(
                    repository = repository,
                    locationManager = locationManager,
                    stops = stops,
                    editingStopIndex = editingStopIndex,
                    onEditingStopIndexChange = { editingStopIndex = it },
                    mode = plannerMode,
                    onModeChange = { plannerMode = it },
                    onRouteGeometryReady = { geometry -> routeGeometry = geometry }
                )

                Spacer(modifier = Modifier.navigationBarsPadding())
            }
        }
    }
}
