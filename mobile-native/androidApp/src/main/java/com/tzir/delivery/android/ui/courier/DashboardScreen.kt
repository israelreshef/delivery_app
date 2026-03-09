package com.tzir.delivery.android.ui.courier

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
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
import com.tzir.delivery.android.R
import com.tzir.delivery.android.ui.components.*
import com.tzir.delivery.android.ui.theme.*

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
    user: com.tzir.delivery.shared.model.User,
    repository: com.tzir.delivery.shared.repository.CourierRepository,
    locationManager: com.tzir.delivery.shared.location.LocationManager,
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
    var isOnline by remember { mutableStateOf(true) }
    val shiftStatus by repository.shiftStatus.collectAsState()
    
    val scope = rememberCoroutineScope()
    val prefs = remember { context.getSharedPreferences("TzirAcademy", Context.MODE_PRIVATE) }

    CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Rtl) {
        Box(modifier = Modifier.fillMaxSize()) {
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

            val mapStyleOptions = remember {
                MapStyleOptions.loadRawResourceStyle(context, R.raw.map_style_midnight)
            }

            GoogleMap(
                modifier = Modifier.fillMaxSize(),
                cameraPositionState = cameraPositionState,
                properties = MapProperties(isMyLocationEnabled = hasLocationPermission, mapStyleOptions = mapStyleOptions),
                uiSettings = MapUiSettings(myLocationButtonEnabled = false, zoomControlsEnabled = false, compassEnabled = false)
            )

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

                // Status Pill (Right)
                val ext = TZIRTheme.colors
                GlassCard(
                    modifier = Modifier
                        .height(52.dp)
                        .clickable { isOnline = !isOnline; scope.launch { repository.updateAvailability(isOnline) } },
                    cornerRadius = 26.dp
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 20.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(8.dp)
                                .background(if (isOnline) SuccessDark else Color.Gray, CircleShape)
                        )
                        Text(
                            text = if (isOnline) "זמין אונליין" else "לא פעיל",
                            color = Color.White,
                            fontWeight = FontWeight.Bold,
                            fontSize = 15.sp
                        )
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
                                text = "רווחים היום: ",
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
                                "תכנון מסלול",
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
