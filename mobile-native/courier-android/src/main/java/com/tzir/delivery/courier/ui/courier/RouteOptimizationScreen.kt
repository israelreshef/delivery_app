package com.tzir.delivery.courier.ui.courier

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.Place
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tzir.delivery.courier.location.LocationManager
import com.tzir.delivery.courier.model.OptimizedRouteStop
import com.tzir.delivery.courier.repository.CourierRepository
import com.tzir.delivery.courier.ui.components.AppleButton
import com.tzir.delivery.courier.ui.components.GlassCard
import com.tzir.delivery.courier.ui.components.PremiumBackground
import com.tzir.delivery.courier.ui.theme.PrimaryTurquoise
import com.tzir.delivery.courier.ui.theme.TextOfficial
import kotlinx.coroutines.launch

@Composable
fun RouteOptimizationScreen(
    repository: CourierRepository,
    locationManager: LocationManager,
    onBack: () -> Unit,
    onApprove: () -> Unit
) {
    var step by remember { mutableStateOf(0) }
    var address by remember { mutableStateOf("") }
    var time by remember { mutableStateOf("") }
    var optimizedPoints by remember { mutableStateOf<List<OptimizedRouteStop>>(emptyList()) }
    var totalDistanceKm by remember { mutableStateOf(0.0) }
    var totalDurationMin by remember { mutableStateOf(0.0) }
    var infoMessage by remember { mutableStateOf<String?>(null) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    PremiumBackground {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp)
                .verticalScroll(rememberScrollState())
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(
                    onClick = onBack,
                    modifier = Modifier.background(Color.White, CircleShape)
                ) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                }
                Spacer(modifier = Modifier.width(16.dp))
                Text(
                    text = "Route Optimization",
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Black,
                    color = TextOfficial
                )
            }

            errorMessage?.let { message ->
                Spacer(modifier = Modifier.height(16.dp))
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFFFFEBEE))
                ) {
                    Text(
                        text = message,
                        modifier = Modifier.padding(16.dp),
                        color = Color(0xFFB00020),
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }

            Spacer(modifier = Modifier.height(32.dp))

            AnimatedVisibility(visible = step == 0) {
                Column(verticalArrangement = Arrangement.spacedBy(24.dp)) {
                    GlassCard(cornerRadius = 24.dp) {
                        Column(modifier = Modifier.padding(24.dp)) {
                            Text(
                                "Plan the best route for your active deliveries",
                                fontWeight = FontWeight.Bold,
                                fontSize = 18.sp,
                                color = TextOfficial
                            )
                            Spacer(modifier = Modifier.height(16.dp))

                            OutlinedTextField(
                                value = address,
                                onValueChange = { address = it },
                                label = { Text("Preferred area") },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(12.dp),
                                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedContainerColor = Color.White,
                                    unfocusedContainerColor = Color.White
                                )
                            )
                            Spacer(modifier = Modifier.height(16.dp))

                            OutlinedTextField(
                                value = time,
                                onValueChange = { time = it },
                                label = { Text("Preferred arrival time") },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(12.dp),
                                leadingIcon = { Icon(Icons.Default.DateRange, contentDescription = null) },
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedContainerColor = Color.White,
                                    unfocusedContainerColor = Color.White
                                )
                            )
                        }
                    }

                    AppleButton(
                        text = "Calculate optimized route",
                        onClick = {
                            errorMessage = null
                            step = 1
                            scope.launch {
                                val loc = locationManager.currentLocation.value
                                val lat = loc?.first ?: 32.0853
                                val lng = loc?.second ?: 34.7818

                                val result = repository.optimizeRoute(lat, lng)
                                if (result.error == null) {
                                    optimizedPoints = result.optimizedSequence
                                    totalDistanceKm = result.totalDistanceKm
                                    totalDurationMin = result.totalDurationMin
                                    infoMessage = result.message
                                    step = 2
                                } else {
                                    errorMessage = result.error
                                    step = 0
                                }
                            }
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(56.dp)
                    )
                }
            }

            AnimatedVisibility(visible = step == 1) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 40.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    CircularProgressIndicator(
                        color = PrimaryTurquoise,
                        strokeWidth = 6.dp,
                        modifier = Modifier.size(64.dp)
                    )
                    Spacer(modifier = Modifier.height(24.dp))
                    Text(
                        "Calculating the fastest route...",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextOfficial
                    )
                    Text(
                        "Checking active deliveries and route order.",
                        fontSize = 14.sp,
                        color = Color.Gray
                    )
                }
            }

            AnimatedVisibility(visible = step == 2) {
                Column(verticalArrangement = Arrangement.spacedBy(24.dp)) {
                    Text(
                        "Optimized route result",
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Black,
                        color = TextOfficial
                    )

                    GlassCard(cornerRadius = 24.dp) {
                        Column(modifier = Modifier.padding(24.dp)) {
                            Text(
                                "Summary",
                                fontWeight = FontWeight.Bold,
                                fontSize = 18.sp,
                                color = TextOfficial
                            )
                            Spacer(modifier = Modifier.height(12.dp))
                            Text("Estimated distance: ${"%.1f".format(totalDistanceKm)} km", color = TextOfficial)
                            Text("Estimated duration: ${"%.0f".format(totalDurationMin)} min", color = TextOfficial)
                            if (!infoMessage.isNullOrBlank()) {
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(infoMessage!!, color = Color.Gray, fontSize = 13.sp)
                            }
                        }
                    }

                    GlassCard(cornerRadius = 24.dp) {
                        Column(modifier = Modifier.padding(24.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.Place, contentDescription = null, tint = PrimaryTurquoise)
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Stops", fontWeight = FontWeight.Bold)
                            }
                            HorizontalDivider(modifier = Modifier.padding(vertical = 12.dp))

                            if (optimizedPoints.isEmpty()) {
                                Text(
                                    text = infoMessage ?: "No active deliveries were found for optimization.",
                                    color = Color.Gray
                                )
                            } else {
                                optimizedPoints.forEachIndexed { index, point ->
                                    RouteStep(
                                        time = "STEP ${point.sequenceOrder ?: (index + 1)}",
                                        description = buildStopDescription(point)
                                    )
                                }
                            }
                        }
                    }

                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(24.dp),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFFE8F5E9))
                    ) {
                        Column(modifier = Modifier.padding(24.dp)) {
                            Text(
                                "This result is now connected to the backend optimization engine.",
                                fontSize = 14.sp,
                                color = Color(0xFF1B5E20)
                            )
                        }
                    }

                    AppleButton(
                        text = "Approve route",
                        onClick = onApprove,
                        enabled = optimizedPoints.isNotEmpty(),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(56.dp)
                    )
                }
            }
        }
    }
}

private fun buildStopDescription(point: OptimizedRouteStop): String {
    val label = when (point.type) {
        "pickup" -> "Pickup"
        "courier_location" -> "Current location"
        else -> "Dropoff"
    }
    val orderPart = point.orderId?.let { "Order #$it" }
    val addressPart = point.address
    return listOfNotNull(label, orderPart, addressPart).joinToString(" - ")
}

@Composable
fun RouteStep(time: String, description: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            time,
            fontWeight = FontWeight.Bold,
            color = PrimaryTurquoise,
            modifier = Modifier.width(64.dp)
        )
        Box(
            modifier = Modifier
                .size(8.dp)
                .background(Color.Gray.copy(alpha = 0.3f), CircleShape)
        )
        Spacer(modifier = Modifier.width(12.dp))
        Text(description, fontSize = 14.sp, color = TextOfficial)
    }
}
