package com.tzir.delivery.courier.ui.courier

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.*

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.gestures.snapping.rememberSnapFlingBehavior
import java.util.Calendar
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.snapshots.SnapshotStateList
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.zIndex
import android.util.Log
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.model.BitmapDescriptorFactory
import com.google.android.gms.maps.model.CameraPosition
import com.google.android.gms.maps.model.LatLng
import com.google.android.gms.maps.model.MapStyleOptions
import com.google.android.libraries.places.api.Places
import com.google.android.libraries.places.api.net.FindAutocompletePredictionsRequest
import com.google.maps.android.compose.*
import com.tzir.delivery.courier.R
import com.tzir.delivery.courier.model.AutocompleteSuggestion
import com.tzir.delivery.courier.repository.CourierRepository
import com.tzir.delivery.courier.location.LocationManager
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlin.math.roundToInt

// ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•
// OBSIDIAN MIST ג€” Route Planner Color Palette
// ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•
private val ObsidianBg        = Color(0xFF0A0A0C)
private val ObsidianSurface   = Color(0xFF141416)
private val ObsidianElevated  = Color(0xFF1C1C1E)
private val ObsidianGlass     = Color(0x0FFFFFFF)   // 6% white
private val ObsidianBorder    = Color(0x1AFFFFFF)    // 10% white
private val ObsidianBorderSub = Color(0x0DFFFFFF)    // 5% white
private val SoftMint          = Color(0xFF8ECFB9)
private val SoftMintDim       = Color(0x268ECFB9)    // 15%
private val SoftBlue          = Color(0xFFA0C4E8)
private val TextPrimary       = Color(0xFFF0F0F2)
private val TextSecondary     = Color(0xFF8E8E93)
private val TextMuted         = Color(0xFF48484A)
private val Danger            = Color(0xFFFF453A)

// ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•
// Data model for a planner stop
// ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•
data class PlannerStop(
    val address: String,
    val city: String = "",
    val lat: Double,
    val lng: Double,
    var stopType: String = "delivery",
    var notes: String = "",
    var timeWindow: String = "",
    var orderIndex: Int? = null,
    val placeId: String? = null
)

// ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•
// Screen states
// ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•
enum class PlannerMode { LIST, STOP_DETAIL }

// ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•
// MAIN SCREEN
// ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RoutePlannerPanel(
    repository: CourierRepository,
    locationManager: LocationManager,
    modifier: Modifier = Modifier,
    stops: SnapshotStateList<PlannerStop>,
    editingStopIndex: Int?,
    onEditingStopIndexChange: (Int?) -> Unit,
    mode: PlannerMode,
    onModeChange: (PlannerMode) -> Unit,
    onRouteGeometryReady: (List<LatLng>?) -> Unit = {}
) {
    val context = LocalContext.current
    val placesClient = remember { Places.createClient(context) }
    val scope = rememberCoroutineScope()
    val focusManager = LocalFocusManager.current
    val snackbarHostState = remember { SnackbarHostState() }
    // ג”€ג”€ Core state ג”€ג”€
    var searchText by remember { mutableStateOf("") }
    var suggestions by remember { mutableStateOf<List<AutocompleteSuggestion>>(emptyList()) }
    var isSearching by remember { mutableStateOf(false) }
    var isLoading by remember { mutableStateOf(false) }
    var showSuggestions by remember { mutableStateOf(false) }
    var isOptimized by remember { mutableStateOf(false) }
    var isSearchFocused by remember { mutableStateOf(false) }



    // ג”€ג”€ Debounced search ג”€ג”€
    LaunchedEffect(searchText) {
        showSuggestions = false
        if (searchText.length < 2) { suggestions = emptyList(); return@LaunchedEffect }
        delay(400)
        isSearching = true
        try {
            val req = FindAutocompletePredictionsRequest.builder()
                .setQuery(searchText).setCountries(listOf("IL")).build()
            placesClient.findAutocompletePredictions(req)
                .addOnSuccessListener { resp ->
                    suggestions = resp.autocompletePredictions.map {
                        AutocompleteSuggestion(
                            description = it.getPrimaryText(null).toString(),
                            fullAddress = it.getFullText(null).toString(),
                            placeId = it.placeId,
                            source = "google_sdk"
                        )
                    }
                    showSuggestions = suggestions.isNotEmpty()
                    isSearching = false
                }
                .addOnFailureListener { isSearching = false }
        } catch (e: Exception) {
            Log.e("RoutePlanner", "Search error", e)
            isSearching = false
        }
    }



    // ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג• UI ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•
    Box(modifier = modifier) {
        // ג”€ג”€ Bottom Panel ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€
        val isExpanded = isSearchFocused || (showSuggestions && suggestions.isNotEmpty()) || mode == PlannerMode.STOP_DETAIL
        Column(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .then(if (isExpanded) Modifier.fillMaxHeight() else Modifier.wrapContentHeight())
                .shadow(
                    elevation = 40.dp,
                    shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp),
                    ambientColor = Color.Black.copy(alpha = 0.6f)
                )
                .clip(RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp))
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            ObsidianSurface.copy(alpha = 0.97f),
                            ObsidianBg
                        )
                    )
                )
                .border(
                    width = 0.5.dp,
                    brush = Brush.verticalGradient(
                        colors = listOf(ObsidianBorder, Color.Transparent)
                    ),
                    shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp)
                )
                .animateContentSize()
        ) {
            // Handle bar
            Box(
                modifier = Modifier.fillMaxWidth().padding(top = 10.dp, bottom = 8.dp),
                contentAlignment = Alignment.Center
            ) {
                Box(
                    modifier = Modifier
                        .width(36.dp).height(4.dp)
                        .clip(CircleShape)
                        .background(Color.White.copy(alpha = 0.15f))
                )
            }

            // ג”€ג”€ STOP DETAIL MODE ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€
            AnimatedVisibility(
                visible = mode == PlannerMode.STOP_DETAIL && editingStopIndex != null,
                enter = fadeIn(tween(200)) + slideInVertically(tween(250)) { it / 3 },
                exit = fadeOut(tween(150)) + slideOutVertically(tween(200)) { it / 3 }
            ) {
                val idx = editingStopIndex
                if (idx != null && idx < stops.size) {
                    StopDetailPanel(
                        stop = stops[idx],
                        onUpdate = { updated -> stops[idx] = updated },
                        onConfirm = {
                            onModeChange(PlannerMode.LIST)
                            onEditingStopIndexChange(null)
                        },
                        onRemove = {
                            stops.removeAt(idx)
                            onModeChange(PlannerMode.LIST)
                            onEditingStopIndexChange(null)
                        }
                    )
                }
            }

            // ג”€ג”€ LIST MODE ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€
            AnimatedVisibility(
                visible = mode == PlannerMode.LIST,
                enter = fadeIn(tween(200)),
                exit = fadeOut(tween(150))
            ) {
                Column {
                    // Search bar
                    SearchBarGlass(
                        text = searchText,
                        onTextChange = { searchText = it },
                        isSearching = isSearching,
                        onClear = {
                            searchText = ""
                            suggestions = emptyList()
                            showSuggestions = false
                        },
                        onMyLocation = {
                            scope.launch {
                                val loc = locationManager.currentLocation.value
                                if (loc != null) {
                                    isLoading = true
                                    val geo = repository.geocodeAddress(query = "${loc.first},${loc.second}")
                                    if (geo != null) {
                                        val parts = geo.formattedAddress.split(",")
                                        stops.add(PlannerStop(
                                            address = parts.firstOrNull()?.trim() ?: geo.formattedAddress,
                                            city = parts.getOrNull(1)?.trim() ?: "",
                                            lat = geo.lat, lng = geo.lng
                                        ))
                                        isOptimized = false
                                    }
                                    isLoading = false
                                } else {
                                    snackbarHostState.showSnackbar("לא ניתן לקבל מיקום נוכחי")
                                }
                            }
                        },
                        onFocusChange = { isSearchFocused = it }
                    )

                    // Autocomplete suggestions
                    AnimatedVisibility(
                        visible = showSuggestions && suggestions.isNotEmpty(),
                        enter = fadeIn(tween(150)) + expandVertically(tween(200)),
                        exit = fadeOut(tween(100)) + shrinkVertically(tween(150)),
                        modifier = Modifier.weight(1f, fill = false)
                    ) {
                        SuggestionsPanel(
                            suggestions = suggestions,
                            onSelect = { suggestion ->
                                searchText = ""
                                showSuggestions = false
                                focusManager.clearFocus()
                                scope.launch {
                                    isLoading = true
                                    val geo = repository.geocodeAddress(
                                        query = suggestion.fullAddress,
                                        placeId = suggestion.placeId
                                    )
                                    if (geo != null) {
                                        val parts = geo.formattedAddress.split(",")
                                        val newStop = PlannerStop(
                                            address = parts.firstOrNull()?.trim() ?: geo.formattedAddress,
                                            city = parts.getOrNull(1)?.trim() ?: "",
                                            lat = geo.lat, lng = geo.lng,
                                            placeId = suggestion.placeId
                                        )
                                        stops.add(newStop)
                                        isOptimized = false
                                        // Open detail for the new stop
                                        onEditingStopIndexChange(stops.size - 1)
                                        onModeChange(PlannerMode.STOP_DETAIL)
                                    } else {
                                        snackbarHostState.showSnackbar("לא ניתן לאמת את הכתובת")
                                    }
                                    isLoading = false
                                }
                            }
                        )
                    }

                    // Loading indicator
                    if (isLoading) {
                        Box(
                            modifier = Modifier.fillMaxWidth().padding(12.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            CircularProgressIndicator(
                                color = SoftMint,
                                modifier = Modifier.size(20.dp),
                                strokeWidth = 2.dp
                            )
                        }
                    }

                    // Stop list or empty state
                    if (stops.isEmpty() && !showSuggestions) {
                        EmptyState()
                    } else if (stops.isNotEmpty() && !showSuggestions) {
                        // Stop count header
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 20.dp, vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                "${stops.size} עצירות",
                                color = TextSecondary,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Medium
                            )
                            if (isOptimized) {
                                Spacer(Modifier.width(8.dp))
                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(6.dp))
                                        .background(SoftMintDim)
                                        .padding(horizontal = 8.dp, vertical = 2.dp)
                                ) {
                                    Text("מוטב", color = SoftMint, fontSize = 11.sp, fontWeight = FontWeight.Medium)
                                }
                            }
                        }

                        HorizontalDivider(color = ObsidianBorderSub, thickness = 0.5.dp)

                        // Scrollable stop list
                        LazyColumn(
                            modifier = Modifier
                                .fillMaxWidth()
                                .heightIn(max = 260.dp),
                            contentPadding = PaddingValues(vertical = 2.dp)
                        ) {
                            itemsIndexed(stops, key = { idx, s -> "${s.address}_${idx}" }) { idx, stop ->
                                StopRow(
                                    index = idx,
                                    stop = stop,
                                    onClick = {
                                        onEditingStopIndexChange(idx)
                                        onModeChange(PlannerMode.STOP_DETAIL)
                                    },
                                    onRemove = {
                                        stops.removeAt(idx)
                                        isOptimized = false
                                    }
                                )
                                if (idx < stops.size - 1) {
                                    HorizontalDivider(
                                        color = ObsidianBorderSub,
                                        thickness = 0.5.dp,
                                        modifier = Modifier.padding(start = 56.dp)
                                    )
                                }
                            }
                        }

                        HorizontalDivider(color = ObsidianBorderSub, thickness = 0.5.dp)

                        // Optimize button
                        if (stops.size >= 2) {
                            OptimizeButton(
                                isLoading = isLoading,
                                isOptimized = isOptimized,
                                onClick = {
                                    scope.launch {
                                        isLoading = true
                                        val loc = locationManager.currentLocation.value
                                        val stopsMaps = stops.map { s ->
                                            mutableMapOf<String, Any?>(
                                                "address" to s.address,
                                                "lat" to s.lat,
                                                "lng" to s.lng,
                                                "stop_type" to s.stopType,
                                                "time_window" to s.timeWindow
                                            )
                                        }
                                        val result = repository.optimizeManualRoute(
                                            loc?.first ?: 32.0853,
                                            loc?.second ?: 34.7818,
                                            stopsMaps
                                        )
                                        if (result.error == null && result.optimizedSequence.isNotEmpty()) {
                                            val reordered = result.optimizedSequence.mapIndexed { i, s ->
                                                val orig = stops.find { st -> st.address == s.address }
                                                    ?: PlannerStop(
                                                        address = s.address ?: "",
                                                        lat = s.lat ?: 0.0,
                                                        lng = s.lng ?: 0.0
                                                    )
                                                orig.copy(orderIndex = i + 1)
                                            }
                                            stops.clear()
                                            stops.addAll(reordered)
                                            isOptimized = true
                                            onRouteGeometryReady(if (result.routeGeometry.isNotEmpty()) result.routeGeometry.map { LatLng(it[1], it[0]) } else null)
                                            snackbarHostState.showSnackbar("המסלול מוטב - ${result.totalDistanceKm.let { "%.1f".format(it) }} קמ")
                                        } else {
                                            snackbarHostState.showSnackbar("שגיאה באופטימיזציה, נסה שוב")
                                        }
                                        isLoading = false
                                    }
                                }
                            )
                            
                            if (isOptimized) {
                                Spacer(Modifier.height(8.dp))
                                SaveRouteButton(
                                    onClick = {
                                        val prefs = context.getSharedPreferences("TzirCalendar", android.content.Context.MODE_PRIVATE)
                                        val jsonArr = org.json.JSONArray()
                                        stops.forEachIndexed { i, s ->
                                            val obj = org.json.JSONObject()
                                            obj.put("id", i + 1)
                                            obj.put("address", s.address)
                                            val parts = s.timeWindow.split(":")
                                            obj.put("hour", parts.getOrNull(0)?.toIntOrNull() ?: 9) // default 9
                                            obj.put("minute", parts.getOrNull(1)?.toIntOrNull() ?: 0)
                                            obj.put("durationMin", 15)
                                            obj.put("status", "planned")
                                            jsonArr.put(obj)
                                        }
                                        prefs.edit().putString("planned_routes_today", jsonArr.toString()).apply()
                                        
                                        scope.launch {
                                            snackbarHostState.showSnackbar("המסלול נשמר ללוח השנה!")
                                        }
                                        stops.clear()
                                        isOptimized = false
                                        onRouteGeometryReady(null)
                                        onModeChange(PlannerMode.LIST)
                                    }
                                )
                            }
                        }
                    }

                if (!isExpanded && !isSearching && searchText.isEmpty()) {
                    Spacer(Modifier.height(8.dp))
                }

                Spacer(Modifier.navigationBarsPadding().height(8.dp))
                }
            }
        }

        // ג”€ג”€ Snackbar ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€
        SnackbarHost(
            hostState = snackbarHostState,
            modifier = Modifier
                .align(Alignment.TopCenter)
                .padding(top = 60.dp)
                .zIndex(30f)
        ) { data ->
            Snackbar(
                snackbarData = data,
                containerColor = ObsidianElevated,
                contentColor = TextPrimary,
                shape = RoundedCornerShape(14.dp)
            )
        }
    }
}

// ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•
// SEARCH BAR ג€” Glassmorphic pill
// ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•
@Composable
private fun SearchBarGlass(
    text: String,
    onTextChange: (String) -> Unit,
    isSearching: Boolean,
    onClear: () -> Unit,
    onMyLocation: () -> Unit,
    onFocusChange: (Boolean) -> Unit
) {
    val focusManager = LocalFocusManager.current

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        // My location button
        Box(
            modifier = Modifier
                .size(42.dp)
                .clip(RoundedCornerShape(14.dp))
                .background(ObsidianGlass)
                .border(0.5.dp, ObsidianBorder, RoundedCornerShape(14.dp))
                .clickable { onMyLocation() },
            contentAlignment = Alignment.Center
        ) {
            Icon(
                Icons.Default.MyLocation,
                contentDescription = "מיקום נוכחי",
                tint = SoftMint,
                modifier = Modifier.size(18.dp)
            )
        }

        // Search field
        Box(
            modifier = Modifier
                .weight(1f)
                .height(42.dp)
                .clip(RoundedCornerShape(14.dp))
                .background(ObsidianGlass)
                .border(0.5.dp, ObsidianBorder, RoundedCornerShape(14.dp))
                .padding(horizontal = 14.dp),
            contentAlignment = Alignment.CenterStart
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth()
            ) {
                Icon(
                    Icons.Default.Search,
                    contentDescription = null,
                    tint = TextMuted,
                    modifier = Modifier.size(16.dp)
                )
                Spacer(Modifier.width(10.dp))

                Box(modifier = Modifier.weight(1f)) {
                    if (text.isEmpty()) {
                        Text(
                            "חיפוש כתובת...",
                            color = TextMuted,
                            fontSize = 14.sp
                        )
                    }
                    BasicTextField(
                        value = text,
                        onValueChange = onTextChange,
                        textStyle = TextStyle(
                            color = TextPrimary,
                            fontSize = 14.sp
                        ),
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                        keyboardActions = KeyboardActions(onSearch = { focusManager.clearFocus() }),
                        modifier = Modifier
                            .fillMaxWidth()
                            .onFocusChanged { onFocusChange(it.isFocused) }
                    )
                }

                if (text.isNotEmpty()) {
                    Spacer(Modifier.width(6.dp))
                    Box(
                        modifier = Modifier
                            .size(18.dp)
                            .clip(CircleShape)
                            .background(TextMuted.copy(alpha = 0.5f))
                            .clickable { onClear() },
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Default.Close, null, tint = ObsidianBg, modifier = Modifier.size(12.dp))
                    }
                } else if (isSearching) {
                    CircularProgressIndicator(
                        color = SoftMint,
                        modifier = Modifier.size(14.dp),
                        strokeWidth = 1.5.dp
                    )
                }
            }
        }
    }
}

// ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•
// SUGGESTIONS LIST
// ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•
@Composable
private fun SuggestionsPanel(
    suggestions: List<AutocompleteSuggestion>,
    onSelect: (AutocompleteSuggestion) -> Unit
) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp, vertical = 4.dp)
    ) {
        itemsIndexed(suggestions) { idx, suggestion ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .clickable { onSelect(suggestion) }
                    .padding(horizontal = 12.dp, vertical = 14.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Location pin
                Box(
                    modifier = Modifier
                        .size(28.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .background(SoftMintDim),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        Icons.Default.LocationOn,
                        null,
                        tint = SoftMint,
                        modifier = Modifier.size(14.dp)
                    )
                }
                Spacer(Modifier.width(12.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        suggestion.description,
                        color = TextPrimary,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Medium,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    if (suggestion.fullAddress != suggestion.description) {
                        Text(
                            suggestion.fullAddress,
                            color = TextSecondary,
                            fontSize = 11.sp,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }
            }
            if (idx < suggestions.size - 1) {
                HorizontalDivider(
                    color = ObsidianBorderSub,
                    thickness = 0.5.dp,
                    modifier = Modifier.padding(start = 52.dp)
                )
            }
        }
    }
}

// ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•
// STOP ROW ג€” in the list
// ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•
@Composable
private fun StopRow(
    index: Int,
    stop: PlannerStop,
    onClick: () -> Unit,
    onRemove: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.Top
    ) {
        // Number badge
        Box(
            modifier = Modifier
                .size(32.dp)
                .clip(CircleShape)
                .background(
                    if (stop.stopType == "pickup") SoftBlue.copy(alpha = 0.15f)
                    else SoftMintDim
                )
                .border(
                    0.5.dp,
                    if (stop.stopType == "pickup") SoftBlue.copy(alpha = 0.3f)
                    else SoftMint.copy(alpha = 0.3f),
                    CircleShape
                ),
            contentAlignment = Alignment.Center
        ) {
            Text(
                (stop.orderIndex ?: (index + 1)).toString(),
                color = if (stop.stopType == "pickup") SoftBlue else SoftMint,
                fontWeight = FontWeight.Bold,
                fontSize = 13.sp
            )
        }

        Spacer(Modifier.width(12.dp))

        // Address + notes
        Column(modifier = Modifier.weight(1f)) {
            Text(
                stop.address,
                color = TextPrimary,
                fontSize = 14.sp,
                fontWeight = FontWeight.Medium,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            if (stop.city.isNotEmpty()) {
                Text(
                    stop.city,
                    color = TextSecondary,
                    fontSize = 12.sp
                )
            }
            if (stop.notes.isNotEmpty()) {
                Text(
                    stop.notes,
                    color = TextMuted,
                    fontSize = 11.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.padding(top = 2.dp)
                )
            }
        }

        Spacer(Modifier.width(8.dp))

        // Time window (left side)
        Column(
            horizontalAlignment = Alignment.End,
            verticalArrangement = Arrangement.Center
        ) {
            if (stop.timeWindow.isNotEmpty()) {
                Text(
                    stop.timeWindow,
                    color = TextSecondary,
                    fontSize = 11.sp
                )
            }
            Text(
                if (stop.stopType == "pickup") "איסוף" else "מסירה",
                color = if (stop.stopType == "pickup") SoftBlue else SoftMint,
                fontSize = 10.sp,
                fontWeight = FontWeight.Medium
            )
        }

        Spacer(Modifier.width(4.dp))

        Icon(
            Icons.Default.ChevronLeft,
            null,
            tint = TextMuted,
            modifier = Modifier.size(16.dp).align(Alignment.CenterVertically)
        )
    }
}

// ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•
// STOP DETAIL PANEL ג€” overlays the bottom sheet
// ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•
@Composable
private fun StopDetailPanel(
    stop: PlannerStop,
    onUpdate: (PlannerStop) -> Unit,
    onConfirm: () -> Unit,
    onRemove: () -> Unit
) {
    val context = LocalContext.current
    val focusManager = LocalFocusManager.current
    var notes by remember(stop) { mutableStateOf(stop.notes) }
    var stopType by remember(stop) { mutableStateOf(stop.stopType) }
    var timeWindow by remember(stop) { mutableStateOf(stop.timeWindow) }
    var showRemoveConfirm by remember { mutableStateOf(false) }
    var selectedDate by remember {
        val cal = Calendar.getInstance()
        mutableStateOf(String.format("%02d/%02d/%04d", cal.get(Calendar.DAY_OF_MONTH), cal.get(Calendar.MONTH) + 1, cal.get(Calendar.YEAR)))
    }
    var showDatePicker by remember { mutableStateOf(false) }

    // Auto-save changes
    LaunchedEffect(notes, stopType, timeWindow) {
        onUpdate(stop.copy(notes = notes, stopType = stopType, timeWindow = timeWindow))
    }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = 8.dp)
    ) {
        // ג”€ג”€ Header: Address ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€
        Column(modifier = Modifier.padding(horizontal = 20.dp, vertical = 12.dp)) {
            Text(
                stop.address,
                color = TextPrimary,
                fontWeight = FontWeight.Bold,
                fontSize = 20.sp
            )
            if (stop.city.isNotEmpty()) {
                Text(
                    stop.city,
                    color = TextSecondary,
                    fontSize = 14.sp,
                    modifier = Modifier.padding(top = 2.dp)
                )
            }
        }

        HorizontalDivider(color = ObsidianBorderSub, thickness = 0.5.dp)

        // ג”€ג”€ Notes ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€
        Column(modifier = Modifier.padding(horizontal = 20.dp, vertical = 14.dp)) {
            Text(
                "הערות",
                color = TextSecondary,
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium,
                modifier = Modifier.padding(bottom = 8.dp)
            )
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(min = 44.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(ObsidianGlass)
                    .border(0.5.dp, ObsidianBorder, RoundedCornerShape(12.dp))
                    .padding(horizontal = 14.dp, vertical = 12.dp)
            ) {
                if (notes.isEmpty()) {
                    Text(
                        "",
                        color = TextMuted,
                        fontSize = 13.sp
                    )
                }
                BasicTextField(
                    value = notes,
                    onValueChange = { notes = it },
                    textStyle = TextStyle(
                        color = TextPrimary,
                        fontSize = 13.sp,
                        lineHeight = 20.sp
                    ),
                    modifier = Modifier.fillMaxWidth(),
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Default)
                )
            }
        }

        HorizontalDivider(color = ObsidianBorderSub, thickness = 0.5.dp)

        // ג”€ג”€ Stop type (delivery / pickup) ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text("סוג עצירה", color = TextSecondary, fontSize = 13.sp)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("מסירה" to "delivery", "איסוף" to "pickup").forEach { (label, value) ->
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(10.dp))
                            .background(
                                if (stopType == value) {
                                    if (value == "pickup") SoftBlue.copy(alpha = 0.15f)
                                    else SoftMintDim
                                } else ObsidianGlass
                            )
                            .border(
                                0.5.dp,
                                if (stopType == value) {
                                    if (value == "pickup") SoftBlue.copy(alpha = 0.4f)
                                    else SoftMint.copy(alpha = 0.4f)
                                } else ObsidianBorder,
                                RoundedCornerShape(10.dp)
                            )
                            .clickable { stopType = value }
                            .padding(horizontal = 16.dp, vertical = 8.dp)
                    ) {
                        Text(
                            label,
                            color = if (stopType == value) {
                                if (value == "pickup") SoftBlue else SoftMint
                            } else TextSecondary,
                            fontSize = 13.sp,
                            fontWeight = if (stopType == value) FontWeight.Medium else FontWeight.Normal
                        )
                    }
                }
            }
        }

        HorizontalDivider(color = ObsidianBorderSub, thickness = 0.5.dp)

        // ג”€ג”€ Time window ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 14.dp)
        ) {
            Text(
                "חלון זמן הגעה (משוער)",
                color = TextSecondary,
                fontSize = 13.sp,
                fontWeight = FontWeight.Medium,
                modifier = Modifier.padding(bottom = 12.dp)
            )
            TimeRangeSelector(
                timeWindow = timeWindow,
                onTimeWindowChange = { timeWindow = it }
            )
        }

        HorizontalDivider(color = ObsidianBorderSub, thickness = 0.5.dp)

        // ── Date selector ─────────────────────────────────────────
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text("תאריך", color = TextSecondary, fontSize = 13.sp)
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(10.dp))
                    .background(ObsidianGlass)
                    .border(0.5.dp, ObsidianBorder, RoundedCornerShape(10.dp))
                    .clickable { showDatePicker = true }
                    .padding(horizontal = 14.dp, vertical = 10.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.CalendarToday, null, tint = SoftMint, modifier = Modifier.size(14.dp))
                    Spacer(Modifier.width(8.dp))
                    Text(selectedDate, color = TextPrimary, fontSize = 13.sp, fontWeight = FontWeight.Medium)
                }
            }
        }

        if (showDatePicker) {
            val cal = Calendar.getInstance()
            val parts = selectedDate.split("/")
            val initDay = parts.getOrNull(0)?.toIntOrNull() ?: cal.get(Calendar.DAY_OF_MONTH)
            val initMonth = (parts.getOrNull(1)?.toIntOrNull() ?: (cal.get(Calendar.MONTH) + 1)) - 1
            val initYear = parts.getOrNull(2)?.toIntOrNull() ?: cal.get(Calendar.YEAR)
            android.app.DatePickerDialog(
                context,
                { _, year, month, day ->
                    selectedDate = String.format("%02d/%02d/%04d", day, month + 1, year)
                    showDatePicker = false
                },
                initYear, initMonth, initDay
            ).also {
                it.setOnDismissListener { showDatePicker = false }
                it.show()
            }
        }

        HorizontalDivider(color = ObsidianBorderSub, thickness = 0.5.dp)

        // ג”€ג”€ Action buttons ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 14.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            // Remove
            Box(
                modifier = Modifier
                    .weight(1f)
                    .height(46.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(Danger.copy(alpha = 0.1f))
                    .border(0.5.dp, Danger.copy(alpha = 0.2f), RoundedCornerShape(12.dp))
                    .clickable { showRemoveConfirm = true },
                contentAlignment = Alignment.Center
            ) {
                Text("הסרה", color = Danger, fontSize = 14.sp, fontWeight = FontWeight.Medium)
            }

            // Confirm
            Box(
                modifier = Modifier
                    .weight(2f)
                    .height(46.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(
                        Brush.horizontalGradient(
                            colors = listOf(
                                SoftMint.copy(alpha = 0.2f),
                                SoftMint.copy(alpha = 0.12f)
                            )
                        )
                    )
                    .border(0.5.dp, SoftMint.copy(alpha = 0.3f), RoundedCornerShape(12.dp))
                    .clickable {
                        focusManager.clearFocus()
                        onConfirm()
                    },
                contentAlignment = Alignment.Center
            ) {
                Text("אישור", color = SoftMint, fontSize = 14.sp, fontWeight = FontWeight.Bold)
            }
        }

        Spacer(Modifier.navigationBarsPadding())
    }

    // Remove confirmation
    if (showRemoveConfirm) {
        AlertDialog(
            onDismissRequest = { showRemoveConfirm = false },
            title = { Text("הסרת עצירה", color = TextPrimary, fontWeight = FontWeight.Bold) },
            text = { Text("להסיר את העצירה מהמסלול?", color = TextSecondary) },
            confirmButton = {
                TextButton(onClick = { showRemoveConfirm = false; onRemove() }) {
                    Text("\u05d4\u05e1\u05e8", color = Danger, fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showRemoveConfirm = false }) {
                    Text("ביטול", color = TextSecondary)
                }
            },
            containerColor = ObsidianElevated,
            shape = RoundedCornerShape(20.dp)
        )
    }
}

// ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•
// OPTIMIZE BUTTON
// ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•
@Composable
private fun OptimizeButton(
    isLoading: Boolean,
    isOptimized: Boolean,
    onClick: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 12.dp)
            .height(48.dp)
            .clip(RoundedCornerShape(14.dp))
            .background(
                Brush.horizontalGradient(
                    colors = if (isOptimized) listOf(
                        SoftMint.copy(alpha = 0.08f),
                        SoftMint.copy(alpha = 0.08f)
                    ) else listOf(
                        SoftMint.copy(alpha = 0.15f),
                        SoftMint.copy(alpha = 0.08f)
                    )
                )
            )
            .border(
                0.5.dp,
                if (isOptimized) SoftMint.copy(alpha = 0.15f)
                else SoftMint.copy(alpha = 0.25f),
                RoundedCornerShape(14.dp)
            )
            .clickable(enabled = !isLoading) { onClick() },
        contentAlignment = Alignment.Center
    ) {
        if (isLoading) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                CircularProgressIndicator(
                    color = SoftMint,
                    modifier = Modifier.size(16.dp),
                    strokeWidth = 1.5.dp
                )
                Spacer(Modifier.width(10.dp))
                Text("מחשב מסלול...", color = SoftMint, fontSize = 14.sp)
            }
        } else {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Default.Route,
                    null,
                    tint = SoftMint,
                    modifier = Modifier.size(18.dp)
                )
                Spacer(Modifier.width(8.dp))
                Text(
                    if (isOptimized) "מטב מחדש" else "אופטימיזציה למסלול",
                    color = SoftMint,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium
                )
            }
        }
    }
}

// ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•
// SAVE ROUTE BUTTON
// ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•
@Composable
private fun SaveRouteButton(
    onClick: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 4.dp)
            .height(48.dp)
            .clip(RoundedCornerShape(14.dp))
            .background(SoftMint)
            .clickable { onClick() },
        contentAlignment = Alignment.Center
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(
                Icons.Default.Save,
                null,
                tint = ObsidianBg,
                modifier = Modifier.size(18.dp)
            )
            Spacer(Modifier.width(8.dp))
            Text(
                "שמור מסלול",
                color = ObsidianBg,
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold
            )
        }
    }
}

// ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•
// EMPTY STATE
// ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•
@Composable
private fun EmptyState() {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 24.dp, vertical = 36.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Subtle icon
        Box(
            modifier = Modifier
                .size(56.dp)
                .clip(RoundedCornerShape(16.dp))
                .background(ObsidianGlass)
                .border(0.5.dp, ObsidianBorder, RoundedCornerShape(16.dp)),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                Icons.Default.Route,
                null,
                tint = TextMuted,
                modifier = Modifier.size(24.dp)
            )
        }
        Spacer(Modifier.height(16.dp))
        Text(
            "חפשו כתובת להתחלה",
            color = TextSecondary,
            fontSize = 15.sp,
            fontWeight = FontWeight.Medium,
            textAlign = TextAlign.Center
        )
        Text(
            "הקלידו בשורת החיפוש למעלה",
            color = TextMuted,
            fontSize = 13.sp,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(top = 4.dp)
        )
    }
}
// ???????????????????????????????????????????????????????????????????
// TIME WHEEL PICKERS
// ???????????????????????????????????????????????????????????????????
@OptIn(androidx.compose.foundation.ExperimentalFoundationApi::class)
@Composable
private fun TimeWheel(
    value: Int,
    range: IntRange,
    onValueChange: (Int) -> Unit
) {
    val listState = rememberLazyListState(initialFirstVisibleItemIndex = if (value in range) value - range.first else 0)
    val flingBehavior = rememberSnapFlingBehavior(lazyListState = listState)
    val paddedItems = listOf("") + range.map { String.format("%02d", it) } + listOf("")

    LaunchedEffect(value) {
        val targetIndex = value - range.first
        if (listState.firstVisibleItemIndex != targetIndex && targetIndex >= 0) {
            listState.scrollToItem(targetIndex)
        }
    }

    LaunchedEffect(listState.isScrollInProgress) {
        if (!listState.isScrollInProgress) {
            val idx = listState.firstVisibleItemIndex
            val newVal = range.elementAtOrNull(idx)
            if (newVal != null && newVal != value) onValueChange(newVal)
        }
    }

    androidx.compose.foundation.lazy.LazyColumn(
        state = listState,
        flingBehavior = flingBehavior,
        modifier = Modifier.height(105.dp).width(50.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        items(paddedItems.size) { i ->
            val text = paddedItems[i]
            val isSelected = i - 1 == value - range.first
            Box(modifier = Modifier.height(35.dp), contentAlignment = Alignment.Center) {
                if (text.isNotEmpty()) {
                    Text(
                        text = text,
                        fontSize = if (isSelected) 18.sp else 14.sp,
                        color = if (isSelected) Color.White else TextMuted,
                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                    )
                }
            }
        }
    }
}

@Composable
private fun TimeRangeSelector(
    timeWindow: String,
    onTimeWindowChange: (String) -> Unit
) {
    var startHour by remember { mutableStateOf(10) }
    var startMin by remember { mutableStateOf(0) }
    var endHour by remember { mutableStateOf(12) }
    var endMin by remember { mutableStateOf(0) }
    
    val updateWindow = {
        onTimeWindowChange(String.format("%02d:%02d - %02d:%02d", startHour, startMin, endHour, endMin))
    }

    LaunchedEffect(Unit) {
        if (timeWindow.isEmpty()) {
            val cal = Calendar.getInstance()
            startHour = cal.get(Calendar.HOUR_OF_DAY)
            startMin = cal.get(Calendar.MINUTE)
            endHour = (startHour + 2) % 24
            endMin = startMin
            updateWindow()
        }
    }

    LaunchedEffect(timeWindow) {
        if (timeWindow.contains("-")) {
            val parts = timeWindow.split("-").map { it.trim() }
            if (parts.size == 2) {
                val p1 = parts[0].split(":")
                val p2 = parts[1].split(":")
                startHour = p1.getOrNull(0)?.toIntOrNull() ?: startHour
                startMin = p1.getOrNull(1)?.toIntOrNull() ?: startMin
                endHour = p2.getOrNull(0)?.toIntOrNull() ?: endHour
                endMin = p2.getOrNull(1)?.toIntOrNull() ?: endMin
            }
        } else if (timeWindow.contains(":")) {
            val p = timeWindow.split(":")
            startHour = p.getOrNull(0)?.toIntOrNull() ?: startHour
            startMin = p.getOrNull(1)?.toIntOrNull() ?: startMin
        }
    }

    Row(
        modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(ObsidianGlass).padding(12.dp),
        horizontalArrangement = Arrangement.SpaceEvenly,
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Start Time (Right side in RTL)
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text("משעה", color = TextSecondary, fontSize = 12.sp, modifier = Modifier.padding(bottom = 8.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                TimeWheel(value = startMin, range = 0..59, onValueChange = { startMin = it; updateWindow() })
                Text(":", color = TextMuted, fontSize = 18.sp, modifier = Modifier.padding(horizontal = 4.dp))
                TimeWheel(value = startHour, range = 0..23, onValueChange = { startHour = it; updateWindow() })
            }
        }

        Icon(Icons.Default.ArrowBack, contentDescription = null, tint = TextMuted, modifier = Modifier.size(20.dp))

        // End Time (Left side in RTL)
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text("עד שעה", color = TextSecondary, fontSize = 12.sp, modifier = Modifier.padding(bottom = 8.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                TimeWheel(value = endMin, range = 0..59, onValueChange = { endMin = it; updateWindow() })
                Text(":", color = TextMuted, fontSize = 18.sp, modifier = Modifier.padding(horizontal = 4.dp))
                TimeWheel(value = endHour, range = 0..23, onValueChange = { endHour = it; updateWindow() })
            }
        }
    }
}
