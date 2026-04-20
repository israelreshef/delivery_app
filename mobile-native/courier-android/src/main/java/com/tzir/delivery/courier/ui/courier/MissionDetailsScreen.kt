
package com.tzir.delivery.courier.ui.courier

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tzir.delivery.courier.ui.components.*
import com.tzir.delivery.courier.repository.CourierRepository
import com.tzir.delivery.courier.location.LocationManager
import com.tzir.delivery.courier.R
import kotlinx.coroutines.launch
import com.tzir.delivery.courier.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MissionDetailsScreen(
    missionId: Int,
    repository: CourierRepository,
    onStartProtocol: () -> Unit,
    onBack: () -> Unit
) {
    val activeMissions by repository.activeMissions.collectAsState()
    val mission = activeMissions.find { it.id == missionId }
    var isLoading by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(missionId) {
        if (mission == null) repository.refreshActiveMissions()
    }

    PremiumBackground {
        when {
            isLoading -> {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = AmberGold)
                }
            }
            mission == null -> {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text(stringResource(R.string.mission_not_found), color = Color.White)
                }
            }
            else -> {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(16.dp)
                        .verticalScroll(rememberScrollState())
                ) {
                    // Back button
                    TextButton(onClick = onBack, modifier = Modifier.padding(bottom = 8.dp)) {
                        Text("← ${stringResource(R.string.back)}", color = TextOfficial, fontWeight = FontWeight.Bold)
                    }

                    // Order number
                    Text(
                        text = "${stringResource(R.string.order_prefix)}${mission.orderNumber}",
                        style = MaterialTheme.typography.headlineMedium,
                        fontWeight = FontWeight.Black,
                        color = TextOfficial
                    )

                    Spacer(Modifier.height(32.dp))

                    // Progress stepper
                    val stepIdx = listOf("assigned", "picked_up", "in_transit", "delivered")
                        .indexOfFirst { it == mission.status }.coerceAtLeast(0)
                    MissionStepper(
                        currentStep = stepIdx,
                        steps = listOf("התקבל", "נאסף", "בדרך", "נמסר")
                    )

                    // GPS warning
                    val locationManager = remember { LocationManager.getInstance(repository.getApi()) }
                    val currentLocation by locationManager.currentLocation.collectAsState()
                    if (currentLocation == null) {
                        Spacer(Modifier.height(12.dp))
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(Color(0xFFC62828), RoundedCornerShape(12.dp))
                                .padding(horizontal = 16.dp, vertical = 10.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("⚠️", fontSize = 16.sp)
                            Spacer(Modifier.width(8.dp))
                            Column {
                                Text("אותות GPS אבדו", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                                Text("מיקומך לא מועדכן.", color = Color.White.copy(alpha = 0.8f), fontSize = 11.sp)
                            }
                        }
                    }

                    // Stop list
                    Spacer(Modifier.height(12.dp))
                    GlassCard(modifier = Modifier.fillMaxWidth(), cornerRadius = 16.dp) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text("סדר עצירות:", color = TextGray, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                            Spacer(Modifier.height(8.dp))
                            StopRow("1", "איסוף", mission.pickupAddress, isDone = stepIdx >= 1)
                            StopRow("2", "מסירה", mission.deliveryAddress, isDone = stepIdx >= 3)
                        }
                    }

                    Spacer(Modifier.height(24.dp))

                    // Address details card
                    GlassCard(modifier = Modifier.fillMaxWidth(), cornerRadius = 32.dp) {
                        Column(modifier = Modifier.padding(24.dp)) {
                            if (mission.isUrgent == true) {
                                Surface(
                                    color = Color(0xFFD32F2F),
                                    shape = RoundedCornerShape(8.dp),
                                    modifier = Modifier.padding(bottom = 12.dp)
                                ) {
                                    Text(
                                        "⚡ משלוח דחוף — יש לבצע בהקדם",
                                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                                        color = Color.White, fontWeight = FontWeight.Bold, fontSize = 13.sp
                                    )
                                }
                            }
                            AddressSection(stringResource(R.string.pickup), mission.pickupAddress, "🔵")
                            Spacer(Modifier.height(24.dp))
                            AddressSection(stringResource(R.string.deliver), mission.deliveryAddress, "🏁")
                        }
                    }

                    Spacer(Modifier.height(16.dp))

                    // Navigation buttons
                    val context = LocalContext.current
                    Text("נווט לכתובת:", fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = TextGray)
                    Spacer(Modifier.height(8.dp))
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        NavigationButton("Waze", "waze://?q=${android.net.Uri.encode(mission.deliveryAddress)}&navigate=yes", Modifier.weight(1f))
                        NavigationButton("Google Maps", "google.navigation:q=${android.net.Uri.encode(mission.deliveryAddress)}", Modifier.weight(1f))
                        NavigationButton("מפות", "maps://?q=${android.net.Uri.encode(mission.deliveryAddress)}", Modifier.weight(1f))
                    }

                    Spacer(Modifier.height(40.dp))

                    // ── Status Action Buttons ────────────────────────────────
                    val nextStatus = when (mission.status) {
                        "assigned"   -> "picked_up"
                        "accepted"   -> "picked_up"
                        "picked_up"  -> "in_transit"
                        "in_transit" -> "delivered"
                        else -> null
                    }

                    if (nextStatus != null) {
                        if (nextStatus == "delivered") {
                            // ── Single-tap delivery confirmation ─────────────
                            Button(
                                onClick = {
                                    scope.launch {
                                        isLoading = true
                                        repository.updateMissionStatus(mission.id, "delivered")
                                        isLoading = false
                                        onBack()
                                    }
                                },
                                modifier = Modifier.fillMaxWidth().height(60.dp),
                                shape = RoundedCornerShape(16.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF22C55E))
                            ) {
                                Text("✅  אישור מסירה", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 18.sp)
                            }
                        } else {
                            TzirButton(
                                text = when (nextStatus) {
                                    "picked_up"  -> stringResource(R.string.status_btn_picked_up)
                                    "in_transit" -> stringResource(R.string.status_btn_transit)
                                    "arrived"    -> stringResource(R.string.status_btn_arrived)
                                    else         -> stringResource(R.string.status_btn_update)
                                },
                                onClick = {
                                    scope.launch {
                                        repository.updateMissionStatus(mission.id, nextStatus)
                                    }
                                }
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun AddressSection(label: String, address: String, icon: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Text(icon, fontSize = 14.sp)
        Spacer(modifier = Modifier.width(12.dp))
        Column {
            Text(label, color = TextGray, fontSize = 12.sp)
            Text(address, fontSize = 16.sp, fontWeight = FontWeight.SemiBold, color = TextOfficial)
        }
    }
}

@Composable
fun NavigationButton(label: String, uri: String, modifier: Modifier = Modifier) {
    val context = LocalContext.current
    OutlinedButton(
        onClick = {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(uri))
            context.startActivity(intent)
        },
        modifier = modifier
    ) {
        Text(label)
    }
}

@Composable
fun StopRow(number: String, label: String, address: String, isDone: Boolean) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(28.dp)
                .background(
                    if (isDone) Color(0xFF2E7D32) else PrimaryTurquoise.copy(alpha = 0.2f),
                    androidx.compose.foundation.shape.CircleShape
                ),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = if (isDone) "✓" else number,
                color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold
            )
        }
        Spacer(Modifier.width(12.dp))
        Column {
            Text(label, color = TextGray, fontSize = 11.sp)
            Text(address, color = TextOfficial, fontSize = 13.sp, fontWeight = FontWeight.Medium)
        }
    }
}
