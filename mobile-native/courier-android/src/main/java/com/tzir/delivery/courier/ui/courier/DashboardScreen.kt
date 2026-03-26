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
    repository: CourierRepository,
    locationManager: LocationManager,
    onMenuClick: () -> Unit,
    onMissionClick: (Int) -> Unit,
    onNotificationClick: () -> Unit,
    onLogout: () -> Unit,
    onReportsClick: () -> Unit = {},
    onProfileClick: () -> Unit = {},
    onSettingsClick: () -> Unit = {},
    onRouteClick: () -> Unit = {},
    onSupportClick: () -> Unit = {},
    onCalendarClick: () -> Unit = {},
    onDocumentsClick: () -> Unit = {},
    onClientsClick: () -> Unit = {},
    onAcademyClick: () -> Unit = {}
) {
    val missions by repository.availableMissions.collectAsState()
    val activeMissions by repository.activeMissions.collectAsState()
    val stats by repository.stats.collectAsState()
    
    val context = LocalContext.current
    val activeMission = activeMissions.firstOrNull()
    var isOnline by remember { mutableStateOf(false) }
    var isLoading by remember { mutableStateOf(false) }
    val shiftStatus by repository.shiftStatus.collectAsState()
    
    val scope = rememberCoroutineScope()
    val prefs = remember { context.getSharedPreferences("TzirAcademy", Context.MODE_PRIVATE) }

    LaunchedEffect(Unit) {
        // Initial fetch of status from server
        repository.refreshStats()
    }

    LaunchedEffect(stats) {
        stats?.let {
            isOnline = it.isAvailable
        }
    }

    // Reactive Service Management: Start/Stop LocationService based on isOnline or activeMission
    LaunchedEffect(isOnline, activeMission) {
        val courierId = user.courierId ?: ""
        if (courierId.isNotEmpty() && (isOnline || activeMission != null)) {
            val intent = Intent(context, com.tzir.delivery.courier.services.LocationService::class.java).apply {
                putExtra("courier_id", courierId)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        } else if (courierId.isNotEmpty() && !isOnline && activeMission == null) {
            val intent = Intent(context, com.tzir.delivery.courier.services.LocationService::class.java)
            context.stopService(intent)
        }
    }

    // --- 1. Google Map Background ---
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

    // Observe Location
    val currentLocationFlow by locationManager.currentLocation.collectAsState(initial = null)
    
    // Auto-center camera on location once
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
                // Show current location marker if map dot isn't enough
                currentLocationFlow?.let { (lat, lng) ->
                    Marker(
                        state = rememberMarkerState(position = LatLng(lat, lng)),
                        title = "המיקום שלך",
                        icon = BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_AZURE)
                    )
                }
            }

            // --- 2. Top Bar (Floating Bell & Status Toggle) ---
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
                // Bell Card (Left)
                GlassCard(
                    modifier = Modifier.size(52.dp),
                    cornerRadius = 26.dp
                ) {
                    IconButton(onClick = onNotificationClick, modifier = Modifier.fillMaxSize()) {
                        Icon(Icons.Default.Notifications, contentDescription = null, tint = AmberGold, modifier = Modifier.size(24.dp))
                    }
                }

            }

            // --- 3. Bottom Dashboard Card ---
            Column(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(16.dp)
                    .fillMaxWidth()
                    .zIndex(10f),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {


                // Active Mission Overlay (if exists)
                AnimatedVisibility(visible = activeMission != null) {
                    activeMission?.let { mission ->
                        ActiveMissionCard(mission = mission, onDetailsClick = { onMissionClick(mission.id) })
                    }
                }

                // Main Dashboard Panel
                GlassCard(
                    modifier = Modifier.fillMaxWidth(),
                    cornerRadius = 32.dp
                ) {
                    Column(modifier = Modifier.padding(24.dp)) {
                        // Earnings Header
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.Center,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            val profit = stats?.todayEarnings ?: 0.0
                            Text(
                                text = stringResource(R.string.earnings_today_prefix),
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                            Text(
                                text = "+₪$profit",
                                fontSize = 32.sp,
                                fontWeight = FontWeight.Black,
                                color = Color.White
                            )
                            Spacer(Modifier.width(8.dp))
                            Text("₪", fontSize = 24.sp, fontWeight = FontWeight.Bold, color = SuccessDark)
                        }

                        Spacer(modifier = Modifier.height(20.dp))
                        HorizontalDivider(color = Color.White.copy(alpha = 0.1f))
                        Spacer(modifier = Modifier.height(20.dp))
                        HorizontalDivider(color = Color.White.copy(alpha = 0.1f))
                        Spacer(modifier = Modifier.height(20.dp))

                        AvailabilityButton(
                            isAvailable = isOnline,
                            isLoading = isLoading,
                            onToggle = {
                                scope.launch {
                                    isLoading = true
                                    val newStatus = !isOnline
                                    val success = repository.updateAvailability(newStatus)
                                    if (success) {
                                        isOnline = newStatus
                                        com.tzir.delivery.courier.services.SocketManager.setAvailabilityStatus(newStatus, user.id.toString())
                                    } else {
                                        android.widget.Toast.makeText(context, "שגיאה בעדכון הסטטוס, נסה שוב", android.widget.Toast.LENGTH_SHORT).show()
                                    }
                                    isLoading = false
                                }
                            }
                        )
                        Spacer(modifier = Modifier.height(16.dp))

                        // Route Planner Button
                        Button(
                            onClick = onRouteClick,
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(60.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = AmberGold),
                            shape = RoundedCornerShape(18.dp)
                        ) {
                            Text(
                                stringResource(R.string.plan_route),
                                color = Graphite950,
                                fontWeight = FontWeight.Black,
                                fontSize = 18.sp
                            )
                        }
                    }
                }
                
                // Navigation Spacer for System Bar
                Spacer(modifier = Modifier.navigationBarsPadding())
            }
        }
    }
}

@Composable
fun AvailabilityButton(
    isAvailable: Boolean,
    isLoading: Boolean,
    onToggle: () -> Unit
) {
    val availableColor = Color(0xFF22C55E)      // green
    val unavailableColor = Color(0xFF1C1C1E)    // dark, matches app bg
    val primaryGold = Color(0xFFF59E0B)         // your app's gold

    val backgroundColor by animateColorAsState(
        targetValue = if (isAvailable) 
            availableColor else unavailableColor,
        animationSpec = tween(400),
        label = "bg"
    )
    val borderColor by animateColorAsState(
        targetValue = if (isAvailable) 
            availableColor else Color(0xFF374151),
        animationSpec = tween(400),
        label = "border"
    )

    // Pulse glow when available
    val infiniteTransition = rememberInfiniteTransition(label = "pulse")
    val glowAlpha by infiniteTransition.animateFloat(
        initialValue = 0.15f,
        targetValue = if (isAvailable) 0.4f else 0f,
        animationSpec = infiniteRepeatable(
            animation = tween(1000),
            repeatMode = RepeatMode.Reverse
        ),
        label = "glow"
    )

    Box(
        modifier = Modifier
            .fillMaxWidth()
            // Removed vertical padding inside to let caller control Spacing (spacedBy 16dp)
    ) {
        // Glow effect behind button
        if (isAvailable) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .background(availableColor.copy(alpha = glowAlpha))
            )
        }

        Button(
            onClick = { if (!isLoading) onToggle() },
            enabled = !isLoading,
            modifier = Modifier
                .fillMaxWidth()
                .height(56.dp)
                .border(
                    width = 1.dp,
                    color = borderColor,
                    shape = RoundedCornerShape(16.dp)
                ),
            colors = ButtonDefaults.buttonColors(
                containerColor = backgroundColor,
                disabledContainerColor = backgroundColor.copy(alpha = 0.6f)
            ),
            shape = RoundedCornerShape(16.dp),
            elevation = ButtonDefaults.buttonElevation(
                defaultElevation = if (isAvailable) 8.dp else 2.dp
            )
        ) {
            AnimatedContent(
                targetState = isLoading,
                label = "btn_content"
            ) { loading ->
                if (loading) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.Center
                    ) {
                        CircularProgressIndicator(
                            color = primaryGold,
                            modifier = Modifier.size(18.dp),
                            strokeWidth = 2.dp
                        )
                        Spacer(Modifier.width(8.dp))
                        Text(
                            "מעדכן סטטוס...",
                            color = Color.White.copy(alpha = 0.7f),
                            fontSize = 15.sp
                        )
                    }
                } else {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.Center,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        // Live dot
                        Box(
                            modifier = Modifier
                                .size(8.dp)
                                .clip(CircleShape)
                                .background(
                                    if (isAvailable) Color.White 
                                    else Color(0xFF6B7280)
                                )
                        )
                        Spacer(Modifier.width(10.dp))

                        Text(
                            text = if (isAvailable) 
                                "זמין למשלוחים" else "התחל זמינות",
                            color = if (isAvailable) 
                                Color.White else Color(0xFF9CA3AF),
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 0.5.sp
                        )

                        if (isAvailable) {
                            Spacer(Modifier.width(10.dp))
                            // Small live badge
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(6.dp))
                                    .background(Color.White.copy(alpha = 0.15f))
                                    .padding(horizontal = 6.dp, vertical = 2.dp)
                            ) {
                                Text(
                                    "LIVE",
                                    color = Color.White,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    letterSpacing = 1.sp
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
