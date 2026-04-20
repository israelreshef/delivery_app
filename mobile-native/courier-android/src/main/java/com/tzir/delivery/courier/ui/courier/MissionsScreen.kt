package com.tzir.delivery.courier.ui.courier

import android.Manifest
import android.content.pm.PackageManager
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.material3.TabRowDefaults.tabIndicatorOffset
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import com.tzir.delivery.courier.R
import com.tzir.delivery.courier.ui.components.*
import com.tzir.delivery.courier.ui.theme.*
import com.tzir.delivery.courier.util.CalendarSyncManager
import com.tzir.delivery.courier.model.Mission
import com.tzir.delivery.courier.repository.CourierRepository
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

enum class DeliveriesViewType { HOURS_24, HOURS_12, WEEK, MONTH, YEAR }

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MissionsScreen(
    repository: CourierRepository, 
    onMissionClick: (Int) -> Unit
) {
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
            Toast.makeText(context, context.getString(R.string.calendar_permissions_granted), Toast.LENGTH_SHORT).show()
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
            delay(30000)
            repository.refreshAvailableMissions()
            repository.refreshActiveMissions()
        }
    }

    PremiumBackground {
        Column(modifier = Modifier.fillMaxSize()) {
            Spacer(Modifier.height(16.dp))
            
            Text(
                text = stringResource(R.string.missions),
                fontSize = 34.sp,
                fontWeight = FontWeight.Black,
                color = Color.White,
                modifier = Modifier.padding(horizontal = 20.dp)
            )

            Spacer(Modifier.height(16.dp))

            TabRow(
                selectedTabIndex = selectedTab,
                containerColor = Color.Transparent,
                contentColor = AmberGold,
                divider = {},
                indicator = { tabPositions ->
                    Box(
                        Modifier
                            .tabIndicatorOffset(tabPositions[selectedTab])
                            .height(3.dp)
                            .padding(horizontal = 24.dp)
                            .background(AmberGold, RoundedCornerShape(topStart = 3.dp, topEnd = 3.dp))
                    )
                }
            ) {
                tabs.forEachIndexed { index, titleRes ->
                    Tab(
                        selected = selectedTab == index,
                        onClick = { selectedTab = index },
                        text = { 
                            Text(
                                text = stringResource(titleRes),
                                color = if (selectedTab == index) Color.White else Color.Gray,
                                fontWeight = if (selectedTab == index) FontWeight.Bold else FontWeight.Medium,
                                fontSize = 15.sp
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
                                color = Color.Red.copy(alpha = 0.15f),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Text(
                                    stringResource(R.string.offline_mode_cached),
                                    modifier = Modifier.padding(12.dp),
                                    color = Color.Red,
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
                                        Toast.makeText(context, context.getString(R.string.sync_success_msg, count), Toast.LENGTH_LONG).show()
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
                                LazyColumn(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                                    items(currentList) { mission ->
                                        MissionCard(
                                            mission = mission,
                                            showAcceptButton = selectedTab == 0,
                                            onAccept = {
                                                scope.launch {
                                                    val success = repository.acceptMission(mission.id)
                                                    if (success) selectedTab = 1
                                                }
                                            },
                                            onClick = { onMissionClick(mission.id) },
                                            onMarkDelivered = if (selectedTab == 1) ({
                                                scope.launch {
                                                    isLoading = true
                                                    repository.updateMissionStatus(mission.id, "delivered")
                                                    delay(500)
                                                    repository.refreshActiveMissions()
                                                    isLoading = false
                                                }
                                            }) else null
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
}

@Composable
fun MissionCard(
    mission: Mission,
    showAcceptButton: Boolean,
    onAccept: () -> Unit,
    onClick: () -> Unit,
    onMarkDelivered: (() -> Unit)? = null
) {
    val isUrgent = mission.isUrgent == true
    val deliverySteps = listOf(
        stringResource(R.string.step_received),
        stringResource(R.string.step_picked_up),
        stringResource(R.string.step_on_way),
        stringResource(R.string.step_arrived),
        stringResource(R.string.step_delivered)
    )
    val deliveryStatuses = listOf("accepted", "picked_up", "in_transit", "arrived", "delivered")
    val currentStepIndex = deliveryStatuses.indexOfFirst { it == mission.status }.coerceAtLeast(0)

    GlassCard(
        modifier = Modifier.fillMaxWidth().clickable { onClick() },
        cornerRadius = 24.dp
    ) {
        Column(modifier = Modifier.padding(20.dp)) {
            // --- Header ---
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Column {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(
                            text = "${stringResource(R.string.order_prefix)}${mission.orderNumber}",
                            fontWeight = FontWeight.Black,
                            fontSize = 18.sp,
                            color = Color.White
                        )
                        if (isUrgent) {
                            Surface(color = Color.Red.copy(alpha = 0.2f), shape = RoundedCornerShape(6.dp)) {
                                Text(stringResource(R.string.urgent), modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp), fontSize = 10.sp, fontWeight = FontWeight.Black, color = Color.Red)
                            }
                        }
                    }
                    if (!showAcceptButton) {
                        Spacer(modifier = Modifier.height(6.dp))
                        StatusChip(mission.status)
                    }
                }
                Text(
                    text = "₪${mission.estimatedPrice}",
                    fontWeight = FontWeight.Black,
                    color = AmberGold,
                    fontSize = 22.sp
                )
            }

            Spacer(modifier = Modifier.height(20.dp))
            AddressItem(label = stringResource(R.string.pickup), address = mission.pickupAddress, icon = "📍", iconColor = AmberGold)
            Spacer(modifier = Modifier.height(12.dp))
            AddressItem(label = stringResource(R.string.deliver), address = mission.deliveryAddress, icon = "🏁", iconColor = Color.White)

            if (!showAcceptButton) {
                Spacer(modifier = Modifier.height(20.dp))
                MissionStepper(currentStep = currentStepIndex, steps = deliverySteps)
            }

            if (showAcceptButton) {
                Spacer(modifier = Modifier.height(24.dp))
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Button(
                        onClick = { /* Dismiss */ },
                        modifier = Modifier.weight(1f).height(52.dp),
                        shape = RoundedCornerShape(14.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Color.White.copy(alpha = 0.05f))
                    ) {
                        Text("דחה", color = Color.Gray, fontWeight = FontWeight.Bold)
                    }
                    TzirButton(text = stringResource(R.string.accept_mission), onClick = onAccept, modifier = Modifier.weight(1f).height(52.dp))
                }
            } else if (onMarkDelivered != null && mission.status != "delivered") {
                Spacer(modifier = Modifier.height(16.dp))
                Button(
                    onClick = onMarkDelivered,
                    modifier = Modifier.fillMaxWidth().height(52.dp),
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF22C55E))
                ) {
                    Text("✅  סמן מסירה", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                }
            }
        }
    }
}

@Composable
fun AddressItem(label: String, address: String, icon: String, iconColor: Color) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Surface(modifier = Modifier.size(32.dp), shape = CircleShape, color = iconColor.copy(alpha = 0.1f)) {
            Box(contentAlignment = Alignment.Center) { Text(icon, fontSize = 14.sp) }
        }
        Spacer(modifier = Modifier.width(16.dp))
        Column {
            Text(label, fontSize = 10.sp, color = Color.Gray, fontWeight = FontWeight.Bold)
            Text(address, fontSize = 15.sp, color = Color.White, fontWeight = FontWeight.SemiBold)
        }
    }
}

@Composable
fun StatusChip(status: String) {
    val (label, color) = when (status) {
        "accepted" -> "🟠 אושר" to AmberGold
        "picked_up" -> "🔵 נאסף" to Color(0xFF3B82F6)
        "in_transit" -> "🟣 בדרך" to Color(0xFF8B5CF6)
        "arrived" -> "🟢 הגיע" to SuccessDark
        "delivered" -> "✅ נמסר" to SuccessDark
        else -> status to Color.Gray
    }
    Surface(color = color.copy(alpha = 0.15f), shape = RoundedCornerShape(8.dp)) {
        Text(label, modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp), fontSize = 11.sp, fontWeight = FontWeight.Black, color = color)
    }
}

@Composable
fun MissionStepper(currentStep: Int, steps: List<String>) {
    Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        steps.forEachIndexed { index, label ->
            val isCompleted = index <= currentStep
            val isCurrent = index == currentStep
            if (index > 0) {
                Box(modifier = Modifier.weight(1f).height(2.dp).background(if (isCompleted) AmberGold else Color.Gray.copy(alpha = 0.3f)))
            }
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Box(
                    modifier = Modifier.size(if (isCurrent) 14.dp else 10.dp)
                        .background(if (isCompleted) AmberGold else Color.Gray.copy(alpha = 0.3f), CircleShape)
                )
                Text(label, fontSize = 9.sp, color = if (isCompleted) Color.White else Color.Gray, fontWeight = if (isCurrent) FontWeight.Bold else FontWeight.Normal, modifier = Modifier.padding(top = 4.dp))
            }
        }
    }
}

@Composable
fun CalendarView(missions: List<Mission>, onSyncClick: () -> Unit) {
    var selectedView by remember { mutableStateOf(DeliveriesViewType.HOURS_24) }
    
    Column(modifier = Modifier.fillMaxSize()) {
        Row(modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp), verticalAlignment = Alignment.CenterVertically) {
            Text("פברואר 2026", color = Color.White, fontWeight = FontWeight.Black, fontSize = 20.sp)
            Spacer(Modifier.weight(1f))
            Button(onClick = onSyncClick, colors = ButtonDefaults.buttonColors(containerColor = AmberGold.copy(alpha = 0.15f), contentColor = AmberGold), shape = RoundedCornerShape(12.dp)) {
                Text("סנכרן ליומן", fontWeight = FontWeight.Bold, fontSize = 13.sp)
            }
        }

        // View Toggle Row
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            listOf(
                DeliveriesViewType.HOURS_24 to "24ש",
                DeliveriesViewType.HOURS_12 to "12ש",
                DeliveriesViewType.WEEK     to "שבוע",
                DeliveriesViewType.MONTH    to "חודש",
                DeliveriesViewType.YEAR     to "שנה"
            ).forEach { (type, label) ->
                FilterChip(
                    selected = selectedView == type,
                    onClick  = { selectedView = type },
                    label    = { Text(label, fontSize = 12.sp) },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = AmberGold.copy(alpha = 0.2f),
                        selectedLabelColor = AmberGold
                    )
                )
            }
        }

        GlassCard(modifier = Modifier.fillMaxSize(), cornerRadius = 24.dp) {
            when (selectedView) {
                DeliveriesViewType.HOURS_24, DeliveriesViewType.HOURS_12 -> {
                    val use24h = selectedView == DeliveriesViewType.HOURS_24
                    LazyColumn(modifier = Modifier.padding(16.dp)) {
                        val hours = if (use24h) {
                            (0..23 step 2).map { if (it < 10) "0$it:00" else "$it:00" }
                        } else {
                            (0..11).map { if (it == 0) "12 AM" else "$it AM" } + (12..23).map { if (it == 12) "12 PM" else "${it-12} PM" }
                        }
                        
                        items(hours) { time ->
                            Row(modifier = Modifier.fillMaxWidth().padding(vertical = 14.dp)) {
                                Text(time, color = Color.Gray, fontSize = 12.sp, modifier = Modifier.width(60.dp))
                                Box(
                                    modifier = Modifier.weight(1f).height(60.dp)
                                        .background(Color.White.copy(alpha = 0.03f), RoundedCornerShape(12.dp))
                                        .padding(12.dp)
                                ) {
                                    if (time.contains("10:00") || time.contains("10 AM")) Text("נאסף משלוח #1284", color = AmberGold, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                                    else if (time.contains("14:00") || time.contains("2 PM")) Text("מסירה #1290", color = Color.White, fontWeight = FontWeight.Medium, fontSize = 13.sp)
                                }
                            }
                        }
                    }
                }
                else -> {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text("תצוגת ${selectedView.name} בקרוב...", color = Color.Gray)
                    }
                }
            }
        }
    }
}
