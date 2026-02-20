
package com.tzir.delivery.android.ui.courier

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.FilterList
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tzir.delivery.shared.model.Mission
import com.tzir.delivery.shared.network.DeliveryApi
import com.tzir.delivery.android.R
import com.tzir.delivery.android.ui.components.*
import com.tzir.delivery.shared.repository.CourierRepository
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MissionHistoryScreen(repository: CourierRepository, onBack: () -> Unit) {
    val history by repository.missionHistory.collectAsState()
    val isOffline by repository.isOffline.collectAsState()
    val scope = rememberCoroutineScope()
    var isLoading by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        if (history.isEmpty()) {
            isLoading = true
            repository.refreshMissionHistory()
            isLoading = false
        }
    }

    PremiumBackground {
        Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = onBack) {
                    Icon(Icons.Default.ArrowBack, contentDescription = null, tint = TextOfficial)
                }
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = stringResource(R.string.delivery_history),
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Black,
                    color = TextOfficial
                )
                Spacer(modifier = Modifier.weight(1f))
                IconButton(onClick = { /* Filter logic placeholder */ }) {
                    Icon(Icons.Default.FilterList, contentDescription = null, tint = Color.Gray)
                }
            }

            Spacer(modifier = Modifier.height(16.dp))
            
            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                val filters = listOf("הכל", "היום", "השבוע", "החודש")
                items(filters) { filter ->
                    FilterChip(
                        selected = filter == "הכל",
                        onClick = { },
                        label = { Text(filter) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = PrimaryTurquoise,
                            selectedLabelColor = AppleWhite
                        )
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            if (isLoading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            } else if (history.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text(stringResource(R.string.no_history_found), color = Color.Gray)
                }
            } else {
                var selectedMission by remember { mutableStateOf<Mission?>(null) }

                LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    items(history) { mission ->
                        HistoryCard(mission, onClick = { selectedMission = mission })
                    }
                }

                if (selectedMission != null) {
                    RideDetailsDialog(mission = selectedMission!!, onDismiss = { selectedMission = null })
                }
            }
        }
    }
}

@Composable
fun HistoryCard(mission: Mission, onClick: () -> Unit) {
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
                        fontWeight = FontWeight.Black,
                        fontSize = 18.sp,
                        color = TextOfficial
                    )
                    Text(
                        text = mission.completedAt ?: "הושלם היום",
                        fontSize = 12.sp,
                        color = TextGray
                    )
                }
                Text(
                    text = "₪${mission.estimatedPrice}",
                    fontWeight = FontWeight.Black,
                    color = PrimaryTurquoise,
                    fontSize = 22.sp
                )
            }
            Spacer(modifier = Modifier.height(16.dp))
            
            HistoryAddressLine(label = stringResource(R.string.pickup), address = mission.pickupAddress, icon = "🔵")
            Spacer(modifier = Modifier.height(8.dp))
            HistoryAddressLine(label = stringResource(R.string.deliver), address = mission.deliveryAddress, icon = "🏁")
        }
    }
}

@Composable
private fun HistoryAddressLine(label: String, address: String, icon: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Text(icon, fontSize = 14.sp)
        Spacer(modifier = Modifier.width(12.dp))
        Column {
            Text(label, fontSize = 11.sp, color = TextGray, fontWeight = FontWeight.Medium)
            Text(address, fontSize = 14.sp, color = TextOfficial, fontWeight = FontWeight.SemiBold)
        }
    }
}

@Composable
fun RideDetailsDialog(mission: Mission, onDismiss: () -> Unit) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(stringResource(R.string.ride_details)) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                DetailRow(stringResource(R.string.distance_label), "${mission.distanceKm} ${stringResource(R.string.km_unit)}")
                mission.durationMins?.let {
                    DetailRow(stringResource(R.string.duration_label), "$it ${stringResource(R.string.mins_unit)}")
                }
                HorizontalDivider()
                DetailRow(stringResource(R.string.base_fare), "₪${mission.baseFare}")
                DetailRow(stringResource(R.string.tips_label), "₪${mission.tip}")
                HorizontalDivider()
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(stringResource(R.string.your_earnings), fontWeight = FontWeight.Bold)
                    Text("₪${mission.estimatedPrice}", fontWeight = FontWeight.Bold, color = Color(0xFF2E7D32))
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss) {
                Text(stringResource(R.string.close_btn))
            }
        }
    )
}

@Composable
fun DetailRow(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(label, color = Color.Gray)
        Text(value, fontWeight = FontWeight.SemiBold)
    }
}
