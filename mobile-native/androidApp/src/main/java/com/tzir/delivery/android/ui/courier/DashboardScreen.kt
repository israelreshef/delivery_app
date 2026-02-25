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
import com.tzir.delivery.android.ui.courier.MapTheme
import com.tzir.delivery.shared.model.Mission
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.URL
import java.util.Calendar


@Composable
fun DashboardScreen(
    user: com.tzir.delivery.shared.model.User,
    repository: com.tzir.delivery.shared.repository.CourierRepository,
    locationManager: com.tzir.delivery.shared.location.LocationManager,
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
    val isOffline by repository.isOffline.collectAsState()
    val gamificationProfile by repository.gamificationProfile.collectAsState()
    
    val context = LocalContext.current
    val activeMission = activeMissions.firstOrNull()
    var isOnline by remember { mutableStateOf(true) }
    var weatherText by remember { mutableStateOf("טוען מזג אוויר...") }
    val shiftStatus by repository.shiftStatus.collectAsState()
    var showVibeDialog by remember { mutableStateOf(false) }
    var showRestWarning by remember { mutableStateOf(false) }
    var showForceStopDialog by remember { mutableStateOf(false) }
    
    // Milestones State
    var showMilestoneCelebration by remember { mutableStateOf<Map<String, Any>?>(null) }
    val prefs = remember { context.getSharedPreferences("TzirAcademy", android.content.Context.MODE_PRIVATE) }

    // Auto Day/Night map style based on current hour
    val currentHour = remember { Calendar.getInstance().get(Calendar.HOUR_OF_DAY) }
    val isNightTime = currentHour < 6 || currentHour >= 19

    LaunchedEffect(Unit) {
        repository.refreshAvailableMissions()
        repository.refreshActiveMissions()
        repository.refreshStats(user.id.toIntOrNull() ?: 0)
        repository.refreshGamificationProfile()
        try {
            val lat = 32.0853
            val lon = 34.7818
            val url = "https://api.open-meteo.com/v1/forecast?latitude=$lat&longitude=$lon&current_weather=true"
            val response = withContext(Dispatchers.IO) { URL(url).readText() }
            val json = JSONObject(response)
            val current = json.getJSONObject("current_weather")
            val temp = current.getDouble("temperature").toInt()
            val code = current.getInt("weathercode")
            val desc = when {
                code == 0 -> "☀️ בהיר"
                code in 1..3 -> "🌤️ מעונן חלקית"
                code in 45..48 -> "🌫️ ערפל"
                code in 51..67 -> "🌧️ גשם"
                code in 71..77 -> "❄️ שלג"
                code in 80..82 -> "🌦️ ממטרים"
                code in 95..99 -> "⛈️ סופה"
                else -> "🌡️ נעים"
            }
            weatherText = "$desc, ${temp}°C"
        } catch (e: Exception) {
            weatherText = "🌡️ נעים, 24°C"
        }
    }

    LaunchedEffect(shiftStatus) {
        shiftStatus?.let { status ->
            if (status["force_stop"] == true && isOnline) {
                isOnline = false
                showForceStopDialog = true
            } else if (status["recommend_rest"] == true) {
                showRestWarning = true
            }
        }
    }

    LaunchedEffect(gamificationProfile) {
        gamificationProfile?.let { profile ->
            val milestones = profile["earned_milestones"] as? List<Map<String, Any>>
            milestones?.forEach { milestone ->
                val id = (milestone["id"] as? Number)?.toInt() ?: 0
                if (id > 0 && !prefs.getBoolean("milestone_shown_$id", false)) {
                    showMilestoneCelebration = milestone
                    prefs.edit().putBoolean("milestone_shown_$id", true).apply()
                    return@forEach // Show one at a time
                }
            }
        }
    }

    val drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)
    val scope = rememberCoroutineScope()

    CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Rtl) {
        ModalNavigationDrawer(
            drawerState = drawerState,
            drawerContent = {
                ModalDrawerSheet(
                    drawerContainerColor = Color.White,
                    drawerShape = RoundedCornerShape(topEnd = 0.dp, bottomEnd = 0.dp, topStart = 32.dp, bottomStart = 32.dp),
                    modifier = Modifier.width(300.dp)
                ) {
                    Column(modifier = Modifier.padding(24.dp)) {
                        Text("Tzir", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Black, color = PrimaryTurquoise)
                        Text("Enterprise Logistics Solution", fontSize = 12.sp, color = TextGray)
                        Spacer(modifier = Modifier.height(32.dp))
                        
                        NavigationDrawerItem(
                            label = { Text(stringResource(R.string.drawer_profile), fontWeight = FontWeight.Medium) },
                            selected = false,
                            onClick = { scope.launch { drawerState.close(); onProfileClick() } },
                            icon = { Icon(Icons.Default.Person, contentDescription = null) },
                            colors = NavigationDrawerItemDefaults.colors(unselectedContainerColor = Color.Transparent, unselectedIconColor = TextOfficial, unselectedTextColor = TextOfficial)
                        )
                        NavigationDrawerItem(
                            label = { Text(stringResource(R.string.drawer_finance), fontWeight = FontWeight.Medium) },
                            selected = false,
                            onClick = { scope.launch { drawerState.close(); onReportsClick() } },
                            icon = { Icon(Icons.Default.History, contentDescription = null) },
                            colors = NavigationDrawerItemDefaults.colors(unselectedContainerColor = Color.Transparent, unselectedIconColor = TextOfficial, unselectedTextColor = TextOfficial)
                        )
                        NavigationDrawerItem(
                            label = { Text(stringResource(R.string.drawer_regulations), fontWeight = FontWeight.Medium) },
                            selected = false,
                            onClick = { scope.launch { drawerState.close(); onDocumentsClick() } },
                            icon = { Icon(Icons.Default.List, contentDescription = null) },
                            colors = NavigationDrawerItemDefaults.colors(unselectedContainerColor = Color.Transparent, unselectedIconColor = TextOfficial, unselectedTextColor = TextOfficial)
                        )
                        NavigationDrawerItem(
                            label = { Text("האקדמיה של ציר", fontWeight = FontWeight.Medium) },
                            selected = false,
                            onClick = { scope.launch { drawerState.close(); onAcademyClick() } },
                            icon = { Icon(Icons.Default.School, contentDescription = null) },
                            colors = NavigationDrawerItemDefaults.colors(unselectedContainerColor = Color.Transparent, unselectedIconColor = TextOfficial, unselectedTextColor = TextOfficial)
                        )
                        NavigationDrawerItem(
                            label = { Text(stringResource(R.string.drawer_work_calendar), fontWeight = FontWeight.Medium) },
                            selected = false,
                            onClick = { scope.launch { drawerState.close(); onCalendarClick() } },
                            icon = { Icon(Icons.Default.DateRange, contentDescription = null) },
                            colors = NavigationDrawerItemDefaults.colors(unselectedContainerColor = Color.Transparent, unselectedIconColor = TextOfficial, unselectedTextColor = TextOfficial)
                        )
                        NavigationDrawerItem(
                            label = { Text(stringResource(R.string.drawer_support), fontWeight = FontWeight.Medium) },
                            selected = false,
                            onClick = { scope.launch { drawerState.close(); onSupportClick() } },
                            icon = { Icon(Icons.Default.Info, contentDescription = null) },
                            colors = NavigationDrawerItemDefaults.colors(unselectedContainerColor = Color.Transparent, unselectedIconColor = TextOfficial, unselectedTextColor = TextOfficial)
                        )
                        NavigationDrawerItem(
                            label = { Text(stringResource(R.string.drawer_settings), fontWeight = FontWeight.Medium) },
                            selected = false,
                            onClick = { scope.launch { drawerState.close(); onSettingsClick() } },
                            icon = { Icon(Icons.Default.Settings, contentDescription = null) },
                            colors = NavigationDrawerItemDefaults.colors(unselectedContainerColor = Color.Transparent, unselectedIconColor = TextOfficial, unselectedTextColor = TextOfficial)
                        )
                        
                        Spacer(modifier = Modifier.weight(1f))
                        HorizontalDivider(color = Color.Gray.copy(alpha = 0.1f))
                        NavigationDrawerItem(
                            label = { Text("התנתק") },
                            selected = false,
                            onClick = onLogout,
                            icon = { Icon(Icons.Default.ExitToApp, contentDescription = null) },
                            colors = NavigationDrawerItemDefaults.colors(unselectedTextColor = Color(0xFFD32F2F), unselectedIconColor = Color(0xFFD32F2F))
                        )
                    }
                }
            }
        ) {
            Box(modifier = Modifier.fillMaxSize()) {
                val context = LocalContext.current
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

                LaunchedEffect(activeMission) {
                    activeMission?.let { mission ->
                        mission.pickupLat?.let { plat ->
                            mission.pickupLng?.let { plng ->
                                cameraPositionState.animate(CameraUpdateFactory.newLatLngZoom(LatLng(plat, plng), 15f))
                            }
                        }
                    }
                }

                val prefs = context.getSharedPreferences("tzir_prefs", Context.MODE_PRIVATE)
                val mapThemePref = prefs.getString(PREF_MAP_THEME, MapTheme.AUTO.name)
                val mapStyleOptions = remember(mapThemePref) {
                    val hour = java.util.Calendar.getInstance().get(java.util.Calendar.HOUR_OF_DAY)
                    val isNight = hour >= 18 || hour < 6
                    when (mapThemePref) {
                        MapTheme.MIDNIGHT.name -> MapStyleOptions.loadRawResourceStyle(context, R.raw.map_style_midnight)
                        MapTheme.SILVER.name  -> MapStyleOptions.loadRawResourceStyle(context, R.raw.map_style_silver)
                        else -> if (isNight) MapStyleOptions.loadRawResourceStyle(context, R.raw.map_style_midnight) else MapStyleOptions.loadRawResourceStyle(context, R.raw.map_style_silver)
                    }
                }

                GoogleMap(
                    modifier = Modifier.fillMaxSize(),
                    cameraPositionState = cameraPositionState,
                    properties = MapProperties(isMyLocationEnabled = hasLocationPermission, mapStyleOptions = mapStyleOptions),
                    uiSettings = MapUiSettings(myLocationButtonEnabled = false, zoomControlsEnabled = false, compassEnabled = false)
                ) {
                    missions.forEach { mission ->
                        mission.pickupLat?.let { plat -> mission.pickupLng?.let { plng ->
                            Marker(state = MarkerState(position = LatLng(plat, plng)), title = "Order #${mission.orderNumber}", icon = BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_AZURE))
                        }}
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
                    verticalAlignment = Alignment.Top
                ) {
                    // Right Side (Drawer) - RTL layout means start is right
                    IconButton(
                        onClick = { scope.launch { drawerState.open() } },
                        modifier = Modifier
                            .size(56.dp)
                            .shadow(8.dp, CircleShape)
                            .background(Color.White, CircleShape)
                    ) {
                        Icon(Icons.Default.Menu, contentDescription = "Menu", tint = TextOfficial)
                    }

                    // Center (Availability Toggle)
                    val toggleBgColor by animateColorAsState(if (isOnline) Color(0xFF4CAF50) else Color(0xFF64748B), label = "bg")
                    
                    Box(
                        modifier = Modifier
                            .padding(top = 4.dp)
                            .shadow(elevation = if (isOnline) 12.dp else 4.dp, shape = RoundedCornerShape(32.dp), spotColor = if (isOnline) Color(0xFF4CAF50) else Color.Black)
                            .clip(RoundedCornerShape(32.dp))
                            .background(toggleBgColor)
                            .clickable {
                                if (!isOnline) {
                                    showVibeDialog = true
                                } else {
                                    isOnline = false
                                    scope.launch { repository.updateAvailability(false) }
                                }
                            }
                            .padding(horizontal = 24.dp, vertical = 12.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            // Status indicator dot
                            Box(modifier = Modifier.size(10.dp).background(Color.White, CircleShape))
                            Text(
                                text = if (isOnline) "זמין אונליין" else "לא מקבל הזמנות",
                                color = Color.White,
                                fontWeight = FontWeight.Bold,
                                fontSize = 15.sp,
                                style = androidx.compose.ui.text.TextStyle(letterSpacing = 0.5.sp)
                            )
                        }
                    }

                    // Left Side (Notifications)
                    GlassCard(modifier = Modifier.size(56.dp), cornerRadius = 28.dp) {
                        IconButton(onClick = onNotificationClick, modifier = Modifier.fillMaxSize()) { Text("🔔", fontSize = 24.sp) }
                    }
                }

                Box(
                    modifier = Modifier.align(Alignment.BottomCenter).padding(16.dp).fillMaxWidth().zIndex(10f)
                ) {
                    AnimatedVisibility(
                        visible = activeMission != null,
                        enter = slideInVertically(initialOffsetY = { it }) + fadeIn(),
                        exit = slideOutVertically(targetOffsetY = { it }) + fadeOut()
                    ) {
                        activeMission?.let { mission ->
                            ActiveMissionCard(mission = mission, onDetailsClick = { onMissionClick(mission.id) })
                        }
                    }

                    AnimatedVisibility(
                        visible = activeMission == null,
                        enter = fadeIn() + expandVertically(),
                        exit = fadeOut() + shrinkVertically()
                    ) {
                        fun getGreeting(username: String): String {
                            val hour = java.util.Calendar.getInstance().get(java.util.Calendar.HOUR_OF_DAY)
                            return when (hour) {
                                in 5..11 -> "בוקר טוב, $username"
                                in 12..16 -> "צהריים טובים, $username"
                                in 17..20 -> "ערב טוב, $username"
                                else -> "לילה טוב, $username"
                            }
                        }
                        
                        val isDarkTheme = androidx.compose.foundation.isSystemInDarkTheme() 
                        val dynamicTextColor = if (isDarkTheme) Color.White else Color(0xFF212121)

                        Column(
                            modifier = Modifier.fillMaxWidth().clickable(
                                interactionSource = remember { MutableInteractionSource() },
                                indication = null
                            ) { },
                            verticalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            Column(
                                modifier = Modifier.padding(start = 8.dp, bottom = 4.dp),
                                verticalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                Text(
                                    text = getGreeting(user.username),
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 16.sp,
                                    color = dynamicTextColor,
                                    style = if(!isDarkTheme) androidx.compose.ui.text.TextStyle(shadow = androidx.compose.ui.graphics.Shadow(color = Color.White, blurRadius = 2f)) else LocalTextStyle.current
                                )
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(text = weatherText.split(",").firstOrNull() ?: "", fontSize = 20.sp, color = dynamicTextColor)
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text(text = weatherText.split(",").lastOrNull() ?: "", fontSize = 14.sp, fontWeight = FontWeight.Medium, color = dynamicTextColor.copy(alpha = 0.8f))
                                }
                            }
                            
                            var showEarningsSheet by remember { mutableStateOf(false) }
                            val sheetState = rememberModalBottomSheetState()

                            if (showEarningsSheet) {
                                ModalBottomSheet(
                                    onDismissRequest = { showEarningsSheet = false },
                                    sheetState = sheetState,
                                    containerColor = Color.White,
                                    dragHandle = { BottomSheetDefaults.DragHandle() }
                                ) {
                                    Column(modifier = Modifier.padding(24.dp).fillMaxWidth()) {
                                        Text("פירוט רווחים להיום", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold, color = TextOfficial)
                                        Spacer(modifier = Modifier.height(24.dp))
                                        
                                        EarningsRow("הכנסות ברוטו", "₪${(stats?.todayEarnings ?: 0.0) + 40.0}", isBold = false)
                                        EarningsRow("בונוס ביצועים", "₪15.0", isPositive = true)
                                        EarningsRow("הוצאות (דלק/תפעול)", "-₪40.0", isNegative = true)
                                        HorizontalDivider(modifier = Modifier.padding(vertical = 16.dp), color = Color.Gray.copy(alpha = 0.1f))
                                        EarningsRow("רווח נקי", "₪${(stats?.todayEarnings ?: 0.0) + 15.0}", isBold = true, isPositive = true, fontSize = 20.sp)
                                        
                                        Spacer(modifier = Modifier.height(32.dp))
                                        AppleButton(
                                            text = "צפהבדוח המלא",
                                            onClick = { showEarningsSheet = false; onReportsClick() },
                                            modifier = Modifier.fillMaxWidth()
                                        )
                                        Spacer(modifier = Modifier.height(16.dp))
                                    }
                                }
                            }

                            GlassCard(
                                modifier = Modifier.fillMaxWidth().clickable { showEarningsSheet = true },
                                cornerRadius = 32.dp
                            ) {
                                Column(modifier = Modifier.padding(24.dp)) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Column {
                                            Text(stringResource(R.string.your_earnings), color = Color.Gray, fontSize = 12.sp)
                                            Row(verticalAlignment = Alignment.CenterVertically) {
                                                val profit = stats?.todayEarnings ?: 0.0
                                                Text(
                                                    text = "+₪$profit",
                                                    style = MaterialTheme.typography.headlineSmall,
                                                    fontWeight = FontWeight.Black,
                                                    color = if (profit > 0) Color(0xFF2E7D32) else TextOfficial,
                                                    modifier = if (profit > 100) Modifier.shadow(elevation = 4.dp, shape = CircleShape) else Modifier
                                                )
                                            }
                                        }
                                        
                                        VerticalDivider(modifier = Modifier.height(40.dp).padding(horizontal = 16.dp))
                                        
                                        Button(
                                            onClick = onRouteClick,
                                            colors = ButtonDefaults.buttonColors(containerColor = PrimaryTurquoise.copy(alpha = 0.1f)),
                                            shape = RoundedCornerShape(12.dp),
                                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp)
                                        ) {
                                            Row(verticalAlignment = Alignment.CenterVertically) {
                                                Icon(Icons.Default.Place, contentDescription = null, tint = TextOfficial, modifier = Modifier.size(16.dp))
                                                Spacer(modifier = Modifier.width(4.dp))
                                                Text(text = "לחשב מסלול", color = TextOfficial, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            
            // --- TZIR Academy Dialogs ---
            if (showVibeDialog) {
                AlertDialog(
                    onDismissRequest = { showVibeDialog = false },
                    title = { Text("איך הווייב היום?", fontWeight = FontWeight.Bold, color = PrimaryTurquoise) },
                    text = { Text("בחר את סגנון המשלוחים שמועדף עליך כרגע כדי שנתאים לך משימות טוב יותר.") },
                    confirmButton = {
                        TextButton(onClick = { 
                            showVibeDialog = false
                            isOnline = true
                            scope.launch { 
                                repository.startShift("general") 
                                repository.updateAvailability(true)
                            }
                        }) { Text("הכל זורם") }
                    },
                    dismissButton = {
                        TextButton(onClick = { 
                            showVibeDialog = false
                            isOnline = true
                            scope.launch { 
                                repository.startShift("action") 
                                repository.updateAvailability(true)
                            }
                        }) { Text("אקשן ומהירות") }
                    },
                    containerColor = Color.White
                )
            }
            
            if (showRestWarning) {
                AlertDialog(
                    onDismissRequest = { showRestWarning = false },
                    title = { Text("המלצת מנוחה ☕", fontWeight = FontWeight.Bold, color = Color(0xFFF57C00)) },
                    text = { Text("אתה באוויר כבר מעל 6 שעות ברצף. מחקרים מראים שמנוחה קצרה של 15 דקות משפרת פוקוס ומונעת תאונות. קח רגע לנשום!") },
                    confirmButton = {
                        Button(
                            onClick = { 
                                showRestWarning = false
                                isOnline = false
                                scope.launch { repository.updateAvailability(false) }
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFF57C00))
                        ) { Text("צודקים, לוקח הפסקה") }
                    },
                    dismissButton = {
                        TextButton(onClick = { showRestWarning = false }) { Text("ממשיך לעבוד") }
                    },
                    containerColor = Color.White
                )
            }
            
            if (showForceStopDialog) {
                AlertDialog(
                    onDismissRequest = { }, // Force user to acknowledge
                    title = { Text("משמרת הסתיימה אוטומטית 🛑", fontWeight = FontWeight.Bold, color = Color.Red) },
                    text = { Text("הגעת למקסימום המותר של 8 שעות עבודה רצופות לפי פרוטוקול בטיחות. המערכת ניתקה אותך כדי למנוע שחיקה חמורה וסיכון בטיחותי. נתראה מחר!") },
                    confirmButton = {
                        Button(
                            onClick = { showForceStopDialog = false },
                            colors = ButtonDefaults.buttonColors(containerColor = Color.Red)
                        ) { Text("הבנתי") }
                    },
                    containerColor = Color.White
                )
            }
            
            // --- MILESTONE CELEBRATION OVERLAY ---
            AnimatedVisibility(
                visible = showMilestoneCelebration != null,
                enter = fadeIn() + scaleIn(initialScale = 0.5f),
                exit = fadeOut() + scaleOut(targetScale = 0.5f),
                modifier = Modifier.fillMaxSize().zIndex(100f)
            ) {
                showMilestoneCelebration?.let { milestone ->
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(Color.Black.copy(alpha = 0.85f))
                            .clickable { showMilestoneCelebration = null },
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("🎉🎆🎊", fontSize = 64.sp)
                            Spacer(modifier = Modifier.height(16.dp))
                            Text("הישג חדש נפתח!", color = Color(0xFFFFD700), fontWeight = FontWeight.Black, fontSize = 28.sp)
                            Spacer(modifier = Modifier.height(16.dp))
                            
                            Card(
                                modifier = Modifier.padding(24.dp).fillMaxWidth(0.8f),
                                colors = CardDefaults.cardColors(containerColor = Color.White),
                                shape = RoundedCornerShape(24.dp),
                                elevation = CardDefaults.cardElevation(16.dp)
                            ) {
                                Column(modifier = Modifier.padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                    Text("🏆", fontSize = 64.sp)
                                    Spacer(modifier = Modifier.height(8.dp))
                                    Text(
                                        text = milestone["title"] as? String ?: "תותח",
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 24.sp,
                                        color = PrimaryTurquoise,
                                        textAlign = androidx.compose.ui.text.style.TextAlign.Center
                                    )
                                    Spacer(modifier = Modifier.height(8.dp))
                                    Text(
                                        text = milestone["description"] as? String ?: "",
                                        color = TextGray,
                                        textAlign = androidx.compose.ui.text.style.TextAlign.Center
                                    )
                                    Spacer(modifier = Modifier.height(16.dp))
                                    val rewardXp = (milestone["reward_xp"] as? Number)?.toInt() ?: 0
                                    Surface(
                                        color = Color(0xFF4CAF50).copy(alpha = 0.1f),
                                        shape = RoundedCornerShape(12.dp)
                                    ) {
                                        Text(
                                            text = "+$rewardXp XP",
                                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                                            color = Color(0xFF2E7D32),
                                            fontWeight = FontWeight.Bold
                                        )
                                    }
                                }
                            }
                            
                            Spacer(modifier = Modifier.height(24.dp))
                            Button(
                                onClick = { showMilestoneCelebration = null },
                                colors = ButtonDefaults.buttonColors(containerColor = PrimaryTurquoise),
                                shape = RoundedCornerShape(32.dp),
                                modifier = Modifier.height(56.dp).padding(horizontal = 32.dp)
                            ) {
                                Text("מדהים, ממשיכים לחקור!", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                            }
                        }
                    }
                }
            }
        }
    }
}
