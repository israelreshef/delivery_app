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
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.ui.input.key.onKeyEvent
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.unit.LayoutDirection
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
import com.tzir.delivery.android.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ManualRoutePlannerScreen(
    repository: CourierRepository,
    onBack: () -> Unit
) {
    var searchAddress by remember { mutableStateOf("") }
    var suggestions by remember { mutableStateOf<List<AutocompleteSuggestion>>(emptyList()) }
    var stops by remember { mutableStateOf(mutableStateListOf<Map<String, Any?>>()) }
    var isLoading by remember { mutableStateOf(false) }
    var isSearching by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val snackbarHostState = remember { SnackbarHostState() }
    val focusManager = LocalFocusManager.current

    CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Rtl) {
        PremiumBackground {
            Scaffold(
                snackbarHost = { SnackbarHost(snackbarHostState) },
                containerColor = Color.Transparent,
            ) { padding ->
                // Clear suggestions when search is cleared
                LaunchedEffect(searchAddress) {
                    if (searchAddress.length < 2) {
                        suggestions = emptyList()
                        isSearching = false // MUST reset here too
                        return@LaunchedEffect
                    }
                    
                    try {
                        isSearching = true
                        println("DEBUG: ManualRoutePlanner - Requesting autocomplete for: '$searchAddress'")
                        // Debounce search
                        delay(500)
                        suggestions = repository.autocompleteAddress(searchAddress)
                        println("DEBUG: ManualRoutePlanner - Received ${suggestions.size} suggestions")
                    } catch (e: Exception) {
                        if (e !is kotlinx.coroutines.CancellationException) {
                            println("DEBUG: ManualRoutePlanner - Error: ${e.message}")
                            e.printStackTrace()
                        }
                    } finally {
                        isSearching = false
                    }
                }

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
                    modifier = Modifier.size(48.dp).background(Color.White, CircleShape)
                ) {
                    Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = TextOfficial)
                }
                Text(
                    text = "תכנון מסלול ידני",
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Black,
                    color = TextOfficial,
                    modifier = Modifier.weight(1f),
                    textAlign = TextAlign.Center
                )
                Spacer(modifier = Modifier.size(48.dp)) // To completely center the text against the back button
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Address Search Input with Autocomplete
            Column(modifier = Modifier.padding(horizontal = 24.dp)) {
                Surface(
                    shape = CircleShape, // Fully rounded capsule
                    color = Color.White,
                    border = androidx.compose.foundation.BorderStroke(5.dp, TextOfficial), // Thick Navy Border
                    shadowElevation = 8.dp,
                    modifier = Modifier.fillMaxWidth().height(56.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // RTL places the first item on the RIGHT (Search Icon)
                        if (isSearching) {
                            CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp, color = PrimaryTurquoise)
                        } else {
                            Icon(Icons.Default.Search, contentDescription = null, tint = Color.Gray)
                        }
                        
                        Spacer(modifier = Modifier.width(12.dp))
                        
                        // Text Field taking up the center space
                        Box(modifier = Modifier.weight(1f), contentAlignment = Alignment.CenterStart) {
                            if (searchAddress.isEmpty()) {
                                Text("חפש כתובת...", color = Color.Gray)
                            }
                            androidx.compose.foundation.text.BasicTextField(
                                value = searchAddress,
                                onValueChange = { searchAddress = it },
                                textStyle = LocalTextStyle.current.copy(textAlign = TextAlign.Start, color = TextOfficial, fontSize = 16.sp),
                                singleLine = true,
                                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                                keyboardActions = KeyboardActions(onSearch = { focusManager.clearFocus() }),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .onKeyEvent { event ->
                                        if (event.nativeKeyEvent.keyCode == android.view.KeyEvent.KEYCODE_ENTER) {
                                            focusManager.clearFocus()
                                            true
                                        } else false
                                    }
                            )
                        }

                        // RTL places the last item on the LEFT (Close Icon)
                        if (searchAddress.isNotEmpty()) {
                            Spacer(modifier = Modifier.width(8.dp))
                            IconButton(
                                onClick = { 
                                    searchAddress = ""
                                    focusManager.clearFocus()
                                },
                                modifier = Modifier.size(24.dp)
                            ) {
                                Icon(Icons.Default.Close, contentDescription = "Clear", tint = Color.Gray)
                            }
                        }
                    }
                }
            }

            // Suggestions List
            if (isSearching) {
                Box(modifier = Modifier.fillMaxWidth().height(100.dp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = PrimaryTurquoise, strokeWidth = 2.dp)
                }
            } else if (suggestions.isNotEmpty()) {
                Box(modifier = Modifier.padding(horizontal = 24.dp).padding(top = 8.dp)) {
                    Surface(
                        modifier = Modifier
                            .fillMaxWidth()
                            .heightIn(max = 300.dp),
                        shape = RoundedCornerShape(24.dp),
                        color = Color.White,
                        shadowElevation = 8.dp
                    ) {
                        LazyColumn {
                            itemsIndexed(suggestions) { index, suggestion ->
                                Column(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clickable {
                                            searchAddress = suggestion.full_address
                                            suggestions = emptyList()
                                            scope.launch {
                                                isLoading = true
                                                val geo = repository.geocodeAddress(
                                                    query = suggestion.full_address, 
                                                    placeId = suggestion.place_id
                                                )
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
                                                    scope.launch { snackbarHostState.showSnackbar("לא ניתן היה לאמת את הכתובת") }
                                                }
                                                isLoading = false
                                            }
                                        }
                                        .padding(16.dp)
                                ) {
                                    Text(suggestion.full_address, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = TextOfficial)
                                    Text(suggestion.source.uppercase(), fontSize = 10.sp, color = Color.Gray)
                                }
                                HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp), thickness = 0.5.dp, color = Color.LightGray.copy(alpha = 0.5f))
                            }
                        }
                    }
                }
            } else if (searchAddress.length >= 2 && !isSearching) {
                Box(modifier = Modifier.padding(horizontal = 24.dp).padding(top = 8.dp)) {
                    Surface(shape = RoundedCornerShape(24.dp), color = Color.White, shadowElevation = 4.dp) {
                        Text(
                            "לא נמצאו תוצאות",
                            modifier = Modifier.fillMaxWidth().padding(16.dp),
                            textAlign = TextAlign.Center,
                            color = Color.Gray
                        )
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
                        Button(
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
                            modifier = Modifier.fillMaxWidth().height(56.dp),
                            shape = RoundedCornerShape(16.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = PrimaryTurquoise, contentColor = TextOfficial)
                        ) {
                            Text(if (isLoading) "מחשב מסלול..." else "בצע אופטימיזציה (TSP)", fontSize = 16.sp, fontWeight = FontWeight.Bold)
                        }
                    }

                    Button(
                        onClick = {
                            scope.launch {
                                snackbarHostState.showSnackbar("🚀 מסלול עם ${stops.size} תחנות מוכן! ניווט מתחיל...")
                            }
                        },
                        modifier = Modifier.fillMaxWidth().height(56.dp),
                        enabled = stops.isNotEmpty() && !isLoading,
                        shape = RoundedCornerShape(16.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = PrimaryTurquoise, 
                            contentColor = TextOfficial,
                            disabledContainerColor = PrimaryTurquoise.copy(alpha = 0.5f),
                            disabledContentColor = TextOfficial.copy(alpha = 0.5f)
                        ),
                        elevation = ButtonDefaults.buttonElevation(defaultElevation = 2.dp, pressedElevation = 0.dp)
                    ) {
                         Text("התחל ניווט למסלול הנבחר", fontSize = 16.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
        } // end Scaffold
        } // end PremiumBackground
    } // end CompositionLocalProvider
} // end ManualRoutePlannerScreen

@Composable
fun ManualStopItem(
    index: Int,
    stop: Map<String, Any?>,
    onRemove: () -> Unit,
    onTypeChange: (String) -> Unit
) {
    val address = stop["address"] as? String ?: ""
    val type = stop["stop_type"] as? String ?: "delivery"

    Surface(
        shape = RoundedCornerShape(16.dp),
        color = Color.White,
        shadowElevation = 4.dp,
        modifier = Modifier.fillMaxWidth().animateContentSize()
    ) {
        Row(
            modifier = Modifier.padding(16.dp).fillMaxWidth(),
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
                    Text(address, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = TextOfficial, modifier = Modifier.weight(1f, fill = false))
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
