package com.tzir.delivery.android.ui.courier

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tzir.delivery.android.ui.components.*
import com.tzir.delivery.shared.repository.CourierRepository
import com.tzir.delivery.shared.location.LocationManager
import com.tzir.delivery.shared.model.AutocompleteSuggestion
import com.tzir.delivery.shared.model.GeocodeResult
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ManualRoutePlannerScreen(
    repository: CourierRepository,
    onBack: () -> Unit,
    onStartNavigation: (List<Map<String, Any?>>) -> Unit
) {
    var searchAddress by remember { mutableStateOf("") }
    var suggestions by remember { mutableStateOf<List<AutocompleteSuggestion>>(emptyList()) }
    var stops by remember { mutableStateOf(mutableStateListOf<Map<String, Any?>>()) }
    var isLoading by remember { mutableStateOf(false) }
    var isSearching by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val toast = LocalToast.current

    // Clear suggestions when search is cleared
    LaunchedEffect(searchAddress) {
        if (searchAddress.length < 3) {
            suggestions = emptyList()
            return@LaunchedEffect
        }
        
        isSearching = true
        // Debounce search
        delay(500)
        suggestions = repository.autocompleteAddress(searchAddress)
        isSearching = false
    }

    PremiumBackground {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(top = 24.dp)
        ) {
            // Header
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(
                    onClick = onBack,
                    modifier = Modifier.background(Color.White, CircleShape)
                ) {
                    Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                }
                Spacer(modifier = Modifier.width(16.dp))
                Text(
                    text = "תכנון מסלול ידני",
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Black,
                    color = TextOfficial
                )
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Address Search Input with Autocomplete
            Column(modifier = Modifier.padding(horizontal = 24.dp)) {
                OfficialCard(cornerRadius = 24.dp) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        OutlinedTextField(
                            value = searchAddress,
                            onValueChange = { searchAddress = it },
                            placeholder = { Text("חפש כתובת אמיתית...") },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            singleLine = true,
                            leadingIcon = {
                                if (isSearching) {
                                    CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp, color = PrimaryTurquoise)
                                } else {
                                    Icon(Icons.Default.Search, contentDescription = null, tint = Color.Gray)
                                }
                            },
                            trailingIcon = {
                                if (searchAddress.isNotEmpty()) {
                                    IconButton(onClick = { searchAddress = "" }) {
                                        Icon(Icons.Default.Close, contentDescription = "Clear")
                                    }
                                }
                            },
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedContainerColor = Color.White,
                                unfocusedContainerColor = Color.White
                            )
                        )
                    }
                }

                // Suggestions List
                if (isSearching) {
                    Box(modifier = Modifier.fillMaxWidth().height(100.dp), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = PrimaryTurquoise, strokeWidth = 2.dp)
                    }
                } else if (suggestions.isNotEmpty()) {
                    Card(
                        modifier = Modifier.fillMaxWidth().shadow(12.dp, RoundedCornerShape(16.dp)),
                        colors = CardDefaults.cardColors(containerColor = Color.White),
                        shape = RoundedCornerShape(16.dp)
                    ) {
                        Column {
                            suggestions.forEach { suggestion ->
                                Column(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clickable {
                                            searchAddress = suggestion.full_address
                                            suggestions = emptyList()
                                            scope.launch {
                                                isLoading = true
                                                val geo = repository.geocodeAddress(placeId = suggestion.place_id)
                                                if (geo != null) {
                                                    val newStop = mutableMapOf<String, Any?>(
                                                        "address" to geo.formatted_address,
                                                        "lat" to geo.lat,
                                                        "lng" to geo.lng,
                                                        "stop_type" to "delivery",
                                                        "is_verified" to true
                                                    )
                                                    stops.add(newStop)
                                                    searchAddress = ""
                                                } else {
                                                    toast.show("לא ניתן היה לאמת את הכתובת")
                                                }
                                                isLoading = false
                                            }
                                        }
                                        .padding(16.dp)
                                ) {
                                    Text(suggestion.full_address, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                                    Text(suggestion.source.uppercase(), fontSize = 10.sp, color = Color.Gray)
                                }
                                HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp), thickness = 0.5.dp, color = Color.LightGray.copy(alpha = 0.5f))
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Stops List
            LazyColumn(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth(),
                contentPadding = PaddingValues(bottom = 24.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                itemsIndexed(stops) { index, stop ->
                    ManualStopItem(
                        index = index,
                        stop = stop,
                        onRemove = { stops.removeAt(index) },
                        onTypeChange = { newType ->
                            val updated = stop.toMutableMap()
                            updated["stop_type"] = newType
                            stops[index] = updated
                        }
                    )
                }

                if (stops.isEmpty()) {
                    item {
                        Box(
                            modifier = Modifier.fillMaxWidth().padding(top = 40.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(horizontal = 48.dp)) {
                                Icon(Icons.Default.LocationOn, contentDescription = null, modifier = Modifier.size(64.dp), tint = Color.Gray.copy(alpha = 0.2f))
                                Text("טרם הוספת תחנות למסלול", color = Color.Gray, fontWeight = FontWeight.Medium)
                                Text("חפש כתובות למעלה כדי להתחיל לתכנן את המסלול שלך", color = Color.Gray.copy(alpha = 0.6f), fontSize = 12.sp, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
                            }
                        }
                    }
                }
            }

            // Bottom Actions
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shadowElevation = 16.dp,
                color = Color.White,
                shape = RoundedCornerShape(topStart = 32.dp, topEnd = 32.dp)
            ) {
                Column(modifier = Modifier.padding(24.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    if (stops.size >= 2) {
                        AppleButton(
                            text = if (isLoading) "מחשב מסלול..." else "בצע אופטימיזציה (TSP)",
                            onClick = {
                                scope.launch {
                                    isLoading = true
                                    val lat = LocationManager.instance?.currentLocation?.value?.first ?: 32.0853
                                    val lng = LocationManager.instance?.currentLocation?.value?.second ?: 34.7818
                                    val result = repository.optimizeManualRoute(lat, lng, stops.toList())
                                    if (result != null) {
                                        try {
                                            val optimized = result.jsonObject["optimized_route"]?.jsonArray
                                            if (optimized != null) {
                                                stops.clear()
                                                optimized.forEach { stopJson ->
                                                    val obj = stopJson.jsonObject
                                                    stops.add(mutableMapOf(
                                                        "address" to (obj["address"]?.jsonPrimitive?.content ?: ""),
                                                        "lat" to (obj["lat"]?.jsonPrimitive?.doubleOrNull ?: 0.0),
                                                        "lng" to (obj["lng"]?.jsonPrimitive?.doubleOrNull ?: 0.0),
                                                        "stop_type" to (obj["stop_type"]?.jsonPrimitive?.content ?: "delivery"),
                                                        "is_verified" to true
                                                    ))
                                                }
                                            }
                                        } catch (e: Exception) {
                                            e.printStackTrace()
                                        }
                                    }
                                    isLoading = false
                                }
                            },
                            modifier = Modifier.fillMaxWidth().height(56.dp)
                        )
                    }

                    AppleButton(
                        text = "התחל ניווט למסלול הנבחר",
                        onClick = { onStartNavigation(stops.toList()) },
                        modifier = Modifier.fillMaxWidth().height(56.dp),
                        enabled = stops.isNotEmpty() && !isLoading,
                        color = PrimaryIndigo
                    )
                }
            }
        }
    }
}

@Composable
fun ManualStopItem(
    index: Int,
    stop: Map<String, Any?>,
    onRemove: () -> Unit,
    onTypeChange: (String) -> Unit
) {
    val address = stop["address"] as? String ?: ""
    val type = stop["stop_type"] as? String ?: "delivery"

    OfficialCard(cornerRadius = 16.dp) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(
                color = PrimaryTurquoise.copy(alpha = 0.1f),
                shape = CircleShape,
                modifier = Modifier.size(32.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Text((index + 1).toString(), fontWeight = FontWeight.Bold, color = PrimaryTurquoise)
                }
            }

            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(address, fontWeight = FontWeight.Bold, fontSize = 14.sp, modifier = Modifier.weight(1f, fill = false))
                    if (stop["is_verified"] == true) {
                        Spacer(modifier = Modifier.width(4.dp))
                        Icon(
                            Icons.Default.CheckCircle, 
                            contentDescription = "Verified", 
                            tint = Color(0xFF388E3C), 
                            modifier = Modifier.size(14.dp)
                        )
                    }
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    TypeBadge(type = type, onClick = {
                        val nextType = when(type) {
                            "delivery" -> "pickup"
                            "pickup" -> "waypoint"
                            else -> "delivery"
                        }
                        onTypeChange(nextType)
                    })
                    if (stop["order_id"] != null) {
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("#${stop["order_id"]}", fontSize = 10.sp, color = Color.Gray)
                    }
                }
            }

            IconButton(onClick = onRemove) {
                Icon(Icons.Default.Delete, contentDescription = "Delete", tint = Color.Red.copy(alpha = 0.6f))
            }
        }
    }
}

@Composable
fun TypeBadge(type: String, onClick: () -> Unit) {
    val (label, color, icon) = when(type) {
        "pickup" -> Triple("איסוף", Color(0xFF1976D2), Icons.Default.KeyboardArrowUp)
        "delivery" -> Triple("מסירה", Color(0xFF388E3C), Icons.Default.KeyboardArrowDown)
        else -> Triple("תחנה", Color(0xFF616161), Icons.Default.Place)
    }

    Surface(
        color = color.copy(alpha = 0.1f),
        shape = RoundedCornerShape(8.dp),
        modifier = Modifier.clickable { onClick() }
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(icon, null, modifier = Modifier.size(12.dp), tint = color)
            Spacer(modifier = Modifier.width(4.dp))
            Text(label, fontSize = 10.sp, color = color, fontWeight = FontWeight.Bold)
        }
    }
}
