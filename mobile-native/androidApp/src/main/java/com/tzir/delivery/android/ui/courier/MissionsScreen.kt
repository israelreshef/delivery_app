
package com.tzir.delivery.android.ui.courier

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.material3.TabRowDefaults.tabIndicatorOffset
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.platform.LocalContext
import androidx.compose.foundation.shape.CircleShape
import com.tzir.delivery.android.R
import com.tzir.delivery.android.util.CalendarSyncManager
import com.tzir.delivery.shared.model.Mission
import com.tzir.delivery.shared.network.DeliveryApi
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import com.tzir.delivery.android.ui.components.*
import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import android.widget.Toast

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MissionsScreen(repository: com.tzir.delivery.shared.repository.CourierRepository, onMissionClick: (Int) -> Unit) {
    val availableMissions by repository.availableMissions.collectAsState()
    val activeMissions by repository.activeMissions.collectAsState()
    val isOffline by repository.isOffline.collectAsState()
    
    var isLoading by remember { mutableStateOf(false) }
    var selectedTab by remember { mutableStateOf(0) }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    val syncManager = remember { CalendarSyncManager(context) }

    val calendarLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { p ->
        if (p.values.all { it }) {
            Toast.makeText(context, "הרשאות יומן אושרו. נסה לסנכרן שוב.", Toast.LENGTH_SHORT).show()
        } else {
            Toast.makeText(context, "נדרשות הרשאות יומן לסנכרון.", Toast.LENGTH_SHORT).show()
        }
    }

    val tabs = listOf(R.string.available, R.string.active, R.string.calendar)

    LaunchedEffect(Unit) {
        isLoading = availableMissions.isEmpty() && activeMissions.isEmpty()
        repository.refreshAvailableMissions()
        repository.refreshActiveMissions()
        isLoading = false
    }

    LaunchedEffect(Unit) {
        while (true) {
            delay(30000) // Refresh every 30s instead of 15s to save battery/bandwidth with caching
            repository.refreshAvailableMissions()
            repository.refreshActiveMissions()
        }
    }

    Column(modifier = Modifier.fillMaxSize()) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = stringResource(R.string.missions),
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold,
                color = TextOfficial
            )
        }

        TabRow(
            selectedTabIndex = selectedTab,
            containerColor = Color.White,
            contentColor = PrimaryTurquoise,
            indicator = { tabPositions ->
                TabRowDefaults.Indicator(
                    Modifier.tabIndicatorOffset(tabPositions[selectedTab]),
                    color = PrimaryTurquoise
                )
            }
        ) {
            for (index in tabs.indices) {
                val titleRes = tabs[index]
                Tab(
                    selected = selectedTab == index,
                    onClick = { selectedTab = index },
                    text = { 
                        Text(
                            text = stringResource(titleRes),
                            color = if (selectedTab == index) TextOfficial else TextGray,
                            fontWeight = if (selectedTab == index) FontWeight.Bold else FontWeight.Normal
                        )
                    }
                )
            }
        }

        Box(modifier = Modifier.fillMaxSize().padding(16.dp)) {
            if (isLoading) {
                ShimmerMissionList()
            } else {
                Column {
                    if (isOffline) {
                        Surface(
                            modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
                            color = Color(0xFFFFEBEE),
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Text(
                                "Offline Mode - Showing cached data",
                                modifier = Modifier.padding(8.dp),
                                color = Color(0xFFD32F2F),
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }

                    if (selectedTab == 2) {
                        CalendarView(
                            missions = activeMissions, 
                            onSyncClick = {
                                val hasPermission = ContextCompat.checkSelfPermission(context, Manifest.permission.WRITE_CALENDAR) == PackageManager.PERMISSION_GRANTED
                                if (hasPermission) {
                                    var count = 0
                                    activeMissions.forEach { if (syncManager.addMissionToCalendar(it)) count++ }
                                    Toast.makeText(context, "סונכרנו $count משימות ליומן", Toast.LENGTH_LONG).show()
                                } else {
                                    calendarLauncher.launch(arrayOf(Manifest.permission.READ_CALENDAR, Manifest.permission.WRITE_CALENDAR))
                                }
                            }
                        )
                    } else {
                        val currentList = if (selectedTab == 0) availableMissions else activeMissions
                        
                        if (currentList.isEmpty()) {
                            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                                Text(
                                    text = if (selectedTab == 0) stringResource(R.string.no_available_missions) else stringResource(R.string.no_active_missions),
                                    color = Color.Gray
                                )
                            }
                        } else {
                            LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                                items(currentList) { mission ->
                                    MissionCard(
                                        mission = mission,
                                        showAcceptButton = selectedTab == 0,
                                        onAccept = {
                                            scope.launch {
                                                val success = repository.acceptMission(mission.id)
                                                if (success) {
                                                    selectedTab = 1 // Switch to active tab
                                                }
                                            }
                                        },
                                        onClick = { onMissionClick(mission.id) }
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun MissionCard(
    mission: Mission, 
    showAcceptButton: Boolean,
    onAccept: () -> Unit, 
    onClick: () -> Unit
) {
    GlassCard(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        cornerRadius = 24.dp
    ) {
        Column(modifier = Modifier.padding(20.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "${stringResource(R.string.order_prefix)}${mission.orderNumber}",
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 18.sp,
                        color = TextOfficial
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    if (!showAcceptButton) {
                        Surface(
                            color = Color(0xFF00D4FF).copy(alpha = 0.1f),
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Text(
                                text = mission.status.uppercase(),
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Black,
                                color = PrimaryTurquoise
                            )
                        }
                    }
                }
                Text(
                    text = "₪${mission.estimatedPrice}",
                    fontWeight = FontWeight.Black,
                    color = PrimaryTurquoise,
                    fontSize = 24.sp
                )
            }
            Spacer(modifier = Modifier.height(20.dp))
            
            AddressLine(label = stringResource(R.string.pickup), address = mission.pickupAddress, icon = "📍", iconColor = PrimaryTurquoise)
            Spacer(modifier = Modifier.height(16.dp))
            AddressLine(label = stringResource(R.string.deliver), address = mission.deliveryAddress, icon = "🏁", iconColor = TextOfficial)

            if (showAcceptButton) {
                Spacer(modifier = Modifier.height(24.dp))
                TzirButton(
                    text = stringResource(R.string.accept_mission),
                    onClick = onAccept,
                    modifier = Modifier.height(56.dp)
                )
            }
        }
    }
}

@Composable
fun AddressLine(label: String, address: String, icon: String, iconColor: Color) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Surface(
            modifier = Modifier.size(32.dp),
            shape = CircleShape,
            color = iconColor.copy(alpha = 0.1f)
        ) {
            Box(contentAlignment = Alignment.Center) {
                Text(icon, fontSize = 14.sp)
            }
        }
        Spacer(modifier = Modifier.width(16.dp))
        Column {
            Text(label, fontSize = 10.sp, color = TextGray, fontWeight = FontWeight.Bold, letterSpacing = 0.5.sp)
            Text(address, fontSize = 15.sp, color = TextOfficial, fontWeight = FontWeight.SemiBold)
        }
    }
}

@Composable
fun CalendarView(missions: List<Mission>, onSyncClick: () -> Unit) {
    var viewMode by remember { mutableStateOf(0) } // 0: Day, 1: Week, 2: Month
    val viewModes = listOf(R.string.day_view, R.string.week_view, R.string.month_view)

    Column(modifier = Modifier.fillMaxSize()) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            viewModes.forEachIndexed { index, modeRes ->
                FilterChip(
                    selected = viewMode == index,
                    onClick = { viewMode = index },
                    label = { Text(stringResource(modeRes)) },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = PrimaryTurquoise.copy(alpha = 0.2f),
                        selectedLabelColor = TextOfficial
                    )
                )
            }
            
            Spacer(modifier = Modifier.weight(1f))
            
            TzirButton(
                text = "סנכרן ליומן",
                onClick = onSyncClick,
                modifier = Modifier.width(130.dp).height(40.dp)
            )
        }

        Surface(
            modifier = Modifier.fillMaxSize(),
            color = Color.White,
            shape = RoundedCornerShape(24.dp),
            shadowElevation = 1.dp
        ) {
            LazyColumn(modifier = Modifier.padding(16.dp)) {
                item {
                    Text(
                        text = "February 2026",
                        fontWeight = FontWeight.Bold,
                        fontSize = 20.sp,
                        color = Color(0xFF001C44),
                        modifier = Modifier.padding(bottom = 16.dp)
                    )
                }

                if (viewMode == 0) { // Day View
                    items(listOf("08:00", "10:00", "12:00", "14:00", "16:00", "18:00")) { time ->
                        Row(modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp)) {
                            Text(time, color = Color.Gray, fontSize = 12.sp, modifier = Modifier.width(50.dp))
                            Box(
                                modifier = Modifier
                                    .weight(1f)
                                    .height(60.dp)
                                    .background(
                                        if (time == "10:00" || time == "14:00") Color(0xFFE0F7FA) else Color(0xFFF5F5F5),
                                        RoundedCornerShape(8.dp)
                                    )
                                    .padding(8.dp)
                            ) {
                                if (time == "10:00") {
                                    Text("Order #1284 - Pick up", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                                } else if (time == "14:00") {
                                    Text("Order #1290 - Delivery", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                                }
                            }
                        }
                    }
                } else {
                    item {
                        Box(modifier = Modifier.fillMaxWidth().height(200.dp), contentAlignment = Alignment.Center) {
                            Text("Calendar grid view coming soon...", color = Color.Gray)
                        }
                    }
                }
            }
        }
    }
}
