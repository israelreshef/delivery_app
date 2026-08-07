package com.tzir.delivery.courier.ui.courier

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
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
import com.tzir.delivery.courier.ui.components.*
import com.tzir.delivery.courier.ui.theme.*
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

// ─── Data model for a route stop ────────────────────────────────────────────
data class RouteStop(
    val address: String,
    val lat: Double,
    val lng: Double,
    var stopType: String = "delivery",   // "delivery" | "pickup"
    var packageCount: Int = 1,
    var orderIndex: Int? = null,          // numeric ordering (null = auto)
    var notes: String = "",
    var arrivalTime: String = "Anytime",
    var durationMinutes: Int = 3,
    val orderId: Any? = null,
    val isVerified: Boolean = true
)

// ─── Main Screen ─────────────────────────────────────────────────────────────
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ManualRoutePlannerScreen(
    repository: CourierRepository,
    locationManager: LocationManager,
    onBack: () -> Unit
) {
    val context = LocalContext.current
    val placesClient = remember { Places.createClient(context) }
    val scope = rememberCoroutineScope()
    val focusManager = LocalFocusManager.current
    val snackbarHostState = remember { SnackbarHostState() }

    var searchText by remember { mutableStateOf("") }
    var suggestions by remember { mutableStateOf<List<AutocompleteSuggestion>>(emptyList()) }
    var isSearching by remember { mutableStateOf(false) }
    var isLoading by remember { mutableStateOf(false) }
    val stops = remember { mutableStateListOf<RouteStop>() }
    var selectedStopIndex by remember { mutableStateOf<Int?>(null) }
    var showSuggestions by remember { mutableStateOf(false) }

    // Bottom sheet
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = false)
    var showStopDetail by remember { mutableStateOf(false) }

    // Map
    val telAviv = LatLng(32.0853, 34.7818)
    val cameraState = rememberCameraPositionState {
        position = CameraPosition.fromLatLngZoom(telAviv, 13f)
    }
    val mapStyleOptions = remember {
        MapStyleOptions.loadRawResourceStyle(context, R.raw.map_style_midnight)
    }

    // Debounce search
    LaunchedEffect(searchText) {
        showSuggestions = false
        if (searchText.length < 2) { suggestions = emptyList(); return@LaunchedEffect }
        delay(500)
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
        } catch (e: Exception) { isSearching = false }
    }

    // Focus camera on new stop
    LaunchedEffect(stops.size) {
        if (stops.isNotEmpty()) {
            val last = stops.last()
            cameraState.animate(CameraUpdateFactory.newLatLngZoom(LatLng(last.lat, last.lng), 13f))
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        // ─── Map (full screen background) ───────────────────────────────
        GoogleMap(
            modifier = Modifier.fillMaxSize(),
            cameraPositionState = cameraState,
            properties = MapProperties(mapStyleOptions = mapStyleOptions),
            uiSettings = MapUiSettings(
                zoomControlsEnabled = false,
                compassEnabled = false,
                myLocationButtonEnabled = false
            )
        ) {
            // Draw route polyline
            if (stops.size >= 2) {
                Polyline(
                    points = stops.map { LatLng(it.lat, it.lng) },
                    color = BrandBlue,
                    width = 8f
                )
            }
            // Draw stop markers
            stops.forEachIndexed { idx, stop ->
                Marker(
                    state = rememberMarkerState(position = LatLng(stop.lat, stop.lng)),
                    title = stop.address,
                    snippet = if (stop.stopType == "pickup") stringResource(R.string.planner_stop_type_pickup) else stringResource(R.string.planner_stop_type_delivery),
                    icon = BitmapDescriptorFactory.defaultMarker(
                        if (stop.stopType == "pickup") BitmapDescriptorFactory.HUE_AZURE
                        else BitmapDescriptorFactory.HUE_ORANGE
                    )
                )
            }
        }

        // ─── Bottom Sheet Panel ──────────────────────────────────────────
        Column(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .shadow(
                    elevation = 32.dp,
                    shape = RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp),
                    ambientColor = Color.Black.copy(alpha = 0.4f)
                )
                .clip(RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp))
                .background(BackgroundDark)
                .padding(bottom = 16.dp)
        ) {
            // Handle bar
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 10.dp, bottom = 12.dp),
                contentAlignment = Alignment.Center
            ) {
                Box(
                    modifier = Modifier
                        .width(40.dp).height(4.dp)
                        .clip(CircleShape)
                        .background(Color.White.copy(alpha = 0.3f))
                )
            }

            // ─── Search bar (inside sheet) ───────────────────────────────
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Three-dot menu
                IconButton(
                    onClick = { /* drawer/options */ },
                    modifier = Modifier.size(40.dp)
                ) {
                    Icon(Icons.Default.MoreVert, null, tint = Color.White.copy(alpha = 0.7f))
                }

                Spacer(Modifier.width(8.dp))

                // Glass search pill
                Surface(
                    modifier = Modifier
                        .weight(1f)
                        .height(48.dp),
                    shape = RoundedCornerShape(24.dp),
                    color = Surface2Dark,
                    border = BorderStroke(0.5.dp, Color.White.copy(alpha = 0.15f))
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(horizontal = 16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // Mic icon (BrandBlue)
                        Icon(
                            Icons.Default.Mic,
                            contentDescription = null,
                            tint = BrandBlue,
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(Modifier.width(10.dp))

                        // Text field (center)
                        Box(modifier = Modifier.weight(1f)) {
                            if (searchText.isEmpty()) {
                                Text(
                                    stringResource(R.string.planner_search_hint),
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    fontSize = 15.sp
                                )
                            }
                            androidx.compose.foundation.text.BasicTextField(
                                value = searchText,
                                onValueChange = { searchText = it },
                                textStyle = LocalTextStyle.current.copy(
                                    color = MaterialTheme.colorScheme.onSurface,
                                    fontSize = 15.sp
                                ),
                                singleLine = true,
                                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                                keyboardActions = KeyboardActions(onSearch = { focusManager.clearFocus() }),
                                modifier = Modifier.fillMaxWidth()
                            )
                        }

                        Spacer(Modifier.width(10.dp))

                        // Search icon or clear
                        if (searchText.isNotEmpty()) {
                            IconButton(
                                onClick = { searchText = ""; suggestions = emptyList(); showSuggestions = false },
                                modifier = Modifier.size(18.dp)
                            ) {
                                Icon(Icons.Default.Close, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(16.dp))
                            }
                        } else {
                            Icon(
                                Icons.Default.Search,
                                contentDescription = null,
                                tint = BrandBlue,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    }
                }
            }

            // ─── Autocomplete suggestions ────────────────────────────────
            AnimatedVisibility(
                visible = showSuggestions && suggestions.isNotEmpty(),
                enter = fadeIn() + expandVertically(),
                exit = fadeOut() + shrinkVertically()
            ) {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 220.dp)
                        .padding(horizontal = 16.dp, vertical = 4.dp)
                ) {
                    itemsIndexed(suggestions) { _, suggestion ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable {
                                    searchText = suggestion.fullAddress
                                    showSuggestions = false
                                    focusManager.clearFocus()
                                    scope.launch {
                                        isLoading = true
                                        val geo = repository.geocodeAddress(
                                            query = suggestion.fullAddress,
                                            placeId = suggestion.placeId
                                        )
                                        if (geo != null) {
                                            stops.add(
                                                RouteStop(
                                                    address = geo.formattedAddress,
                                                    lat = geo.lat,
                                                    lng = geo.lng
                                                )
                                            )
                                            searchText = ""
                                        } else {
                                            snackbarHostState.showSnackbar(context.getString(R.string.planner_address_verify_error))
                                        }
                                        isLoading = false
                                    }
                                }
                                .padding(horizontal = 8.dp, vertical = 12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Default.LocationOn, null, tint = BrandBlue, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(12.dp))
                            Column {
                                Text(suggestion.description, color = MaterialTheme.colorScheme.onSurface, fontSize = 14.sp, fontWeight = FontWeight.Medium)
                                Text(suggestion.fullAddress, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp, maxLines = 1)
                            }
                        }
                        HorizontalDivider(color = Color.White.copy(alpha = 0.06f), thickness = 0.5.dp)
                    }
                }
            }

            // ─── Content: Empty state OR stop list ───────────────────────
            if (stops.isEmpty()) {
                // Empty state
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 24.dp, vertical = 32.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    // Dashed + icon
                    Box(
                        modifier = Modifier
                            .size(64.dp)
                            .border(
                                width = 1.5.dp,
                                color = Color.White.copy(alpha = 0.2f),
                                shape = RoundedCornerShape(16.dp)
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Default.Add, null, tint = Color.White.copy(alpha = 0.3f), modifier = Modifier.size(28.dp))
                    }
                    Spacer(Modifier.height(16.dp))
                    Text(
                        stringResource(R.string.planner_add_first_stops),
                        color = MaterialTheme.colorScheme.onSurface,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.SemiBold,
                        textAlign = TextAlign.Center
                    )
                    Text(
                        "כדי להתחיל ביצירת המסלול",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        fontSize = 13.sp,
                        textAlign = TextAlign.Center
                    )
                    Spacer(Modifier.height(24.dp))

                    // Primary button
                    Button(
                        onClick = { focusManager.clearFocus() },
                        modifier = Modifier.fillMaxWidth().height(56.dp),
                        shape = RoundedCornerShape(18.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = BrandBlue)
                    ) {
                        Icon(Icons.Default.Add, null, tint = Graphite950, modifier = Modifier.size(20.dp))
                        Spacer(Modifier.width(8.dp))
                        Text("להוסיף עצירה", color = Graphite950, fontWeight = FontWeight.Black, fontSize = 16.sp)
                    }

                    Spacer(Modifier.height(12.dp))

                    // Secondary button
                    OutlinedButton(
                        onClick = { /* copy from previous */ },
                        modifier = Modifier.fillMaxWidth().height(48.dp),
                        shape = RoundedCornerShape(14.dp),
                        border = BorderStroke(1.dp, Color.White.copy(alpha = 0.2f))
                    ) {
                        Text(stringResource(R.string.planner_copy_from_previous), color = MaterialTheme.colorScheme.onSurface, fontSize = 14.sp)
                    }
                }
            } else {
                // Route summary
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        context.getString(R.string.planner_stops_count, stops.size),
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        fontSize = 13.sp,
                        modifier = Modifier.weight(1f)
                    )
                    if (stops.size >= 2) {
                        TextButton(
                            onClick = {
                                scope.launch {
                                    isLoading = true
                                    val loc = locationManager.currentLocation.value
                                    val stopsMaps = stops.map { s ->
                                        mutableMapOf<String, Any?>(
                                            "address" to s.address,
                                            "lat" to s.lat,
                                            "lng" to s.lng,
                                            "stop_type" to s.stopType
                                        )
                                    }
                                    val result = repository.optimizeManualRoute(
                                        loc?.first ?: 32.0853,
                                        loc?.second ?: 34.7818,
                                        stopsMaps
                                    )
                                    if (result.error == null && result.optimizedSequence.isNotEmpty()) {
                                        val reordered = result.optimizedSequence.mapIndexed { i, s ->
                                            val orig = stops.find { it.address == s.address } ?: RouteStop(
                                                address = s.address ?: "",
                                                lat = s.lat ?: 0.0,
                                                lng = s.lng ?: 0.0
                                            )
                                            orig.copy(orderIndex = i + 1)
                                        }
                                        stops.clear()
                                        stops.addAll(reordered)
                                    }
                                    isLoading = false
                                }
                            }
                        ) {
                            Text("⚡ אופטימיזציה", color = BrandBlue, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        }
                    }
                }

                HorizontalDivider(color = Color.White.copy(alpha = 0.08f))

                // Stop list
                LazyColumn(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 240.dp),
                    contentPadding = PaddingValues(vertical = 4.dp)
                ) {
                    itemsIndexed(stops) { idx, stop ->
                        RouteStopRow(
                            index = idx,
                            stop = stop,
                            onClick = {
                                selectedStopIndex = idx
                                showStopDetail = true
                            }
                        )
                        HorizontalDivider(color = Color.White.copy(alpha = 0.07f))
                    }
                }

                HorizontalDivider(color = Color.White.copy(alpha = 0.08f))

                // Approve route button
                Column(
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        OutlinedButton(
                            onClick = { /* change details */ },
                            modifier = Modifier.weight(1f).height(48.dp),
                            shape = RoundedCornerShape(14.dp),
                            border = BorderStroke(1.dp, Color.White.copy(alpha = 0.2f))
                        ) {
                            Text("לשנות פרטים", color = MaterialTheme.colorScheme.onSurface, fontSize = 14.sp)
                        }
                        Button(
                            onClick = {
                                scope.launch {
                                    snackbarHostState.showSnackbar(context.getString(R.string.planner_route_ready, stops.size))
                                }
                            },
                            modifier = Modifier.weight(2f).height(48.dp),
                            shape = RoundedCornerShape(14.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = BrandBlue),
                            enabled = !isLoading
                        ) {
                            if (isLoading) {
                                CircularProgressIndicator(color = Graphite950, modifier = Modifier.size(18.dp), strokeWidth = 2.dp)
                            } else {
                                Text("אישור המסלול", color = Graphite950, fontWeight = FontWeight.Black, fontSize = 15.sp)
                            }
                        }
                    }
                    Spacer(Modifier.navigationBarsPadding())
                }
            }
        }

        // ─── Snackbar ────────────────────────────────────────────────────
        SnackbarHost(
            hostState = snackbarHostState,
            modifier = Modifier.align(Alignment.TopCenter).padding(top = 16.dp)
        )
    }

    // ─── Stop Detail Bottom Sheet ────────────────────────────────────────
    if (showStopDetail && selectedStopIndex != null && selectedStopIndex!! < stops.size) {
        val stopIdx = selectedStopIndex!!
        val stop = stops[stopIdx]

        ModalBottomSheet(
            onDismissRequest = { showStopDetail = false },
            sheetState = sheetState,
            containerColor = BackgroundDark,
            shape = RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp),
            dragHandle = {
                Box(
                    modifier = Modifier.fillMaxWidth().padding(top = 10.dp, bottom = 4.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Box(modifier = Modifier.width(40.dp).height(4.dp).clip(CircleShape).background(Color.White.copy(alpha = 0.3f)))
                }
            }
        ) {
            StopDetailSheet(
                stop = stop,
                onDismiss = { showStopDetail = false },
                onRemove = {
                    stops.removeAt(stopIdx)
                    showStopDetail = false
                },
                onUpdate = { updated ->
                    stops[stopIdx] = updated
                }
            )
        }
    }
}

// ─── Route Stop Row (in the list) ────────────────────────────────────────────
@Composable
private fun RouteStopRow(index: Int, stop: RouteStop, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
            .padding(horizontal = 20.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Number badge
        Box(
            modifier = Modifier
                .size(32.dp)
                .clip(CircleShape)
                .background(BrandBlue),
            contentAlignment = Alignment.Center
        ) {
            Text(
                (stop.orderIndex ?: (index + 1)).toString(),
                color = Graphite950,
                fontWeight = FontWeight.Black,
                fontSize = 13.sp
            )
        }

        Spacer(Modifier.width(12.dp))

        Column(modifier = Modifier.weight(1f)) {
            Text(
                stop.address,
                color = MaterialTheme.colorScheme.onSurface,
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
                maxLines = 1,
                overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis
            )
            Text(
                if (stop.stopType == "pickup") stringResource(R.string.planner_stop_type_pickup) else stringResource(R.string.planner_stop_type_delivery),
                color = if (stop.stopType == "pickup") BrandBlueLight else BrandBlue,
                fontSize = 12.sp
            )
        }

        Spacer(Modifier.width(8.dp))

        // Arrival time if set
        Text(
            stop.arrivalTime,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            fontSize = 12.sp
        )

        Spacer(Modifier.width(4.dp))

        Icon(
            Icons.Default.ChevronRight,
            null,
            tint = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.size(16.dp)
        )
    }
}

// ─── Stop Detail Sheet Content ───────────────────────────────────────────────
@Composable
private fun StopDetailSheet(
    stop: RouteStop,
    onDismiss: () -> Unit,
    onRemove: () -> Unit,
    onUpdate: (RouteStop) -> Unit
) {
    val context = LocalContext.current
    var stopType by remember { mutableStateOf(stop.stopType) }
    var packageCount by remember { mutableIntStateOf(stop.packageCount) }
    var orderIndex by remember { mutableStateOf(stop.orderIndex?.toString() ?: "") }
    var notes by remember { mutableStateOf(stop.notes) }
    var arrivalTime by remember { mutableStateOf(stop.arrivalTime) }
    var durationMinutes by remember { mutableIntStateOf(stop.durationMinutes) }
    var showDuplicateConfirm by remember { mutableStateOf(false) }
    var showRemoveConfirm by remember { mutableStateOf(false) }

    val rowHeight = Modifier
        .fillMaxWidth()
        .height(54.dp)

    LaunchedEffect(stopType, packageCount, orderIndex, notes, arrivalTime, durationMinutes) {
        onUpdate(stop.copy(
            stopType = stopType,
            packageCount = packageCount,
            orderIndex = orderIndex.toIntOrNull(),
            notes = notes,
            arrivalTime = arrivalTime,
            durationMinutes = durationMinutes
        ))
    }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .navigationBarsPadding()
    ) {
        // ── Header: address ──────────────────────────────────────────────
        Column(modifier = Modifier.padding(horizontal = 20.dp, vertical = 12.dp)) {
            Text(
                stop.address.substringBefore(","),
                color = MaterialTheme.colorScheme.onSurface,
                fontWeight = FontWeight.Black,
                fontSize = 20.sp
            )
            Text(
                stop.address.substringAfter(",", "").trim(),
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                fontSize = 13.sp
            )
            Spacer(Modifier.height(8.dp))
            OutlinedButton(
                onClick = { /* access instructions */ },
                shape = RoundedCornerShape(10.dp),
                border = BorderStroke(1.dp, BrandBlue.copy(alpha = 0.5f)),
                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                modifier = Modifier.height(34.dp)
            ) {
                Icon(Icons.Default.Add, null, tint = BrandBlue, modifier = Modifier.size(14.dp))
                Spacer(Modifier.width(4.dp))
                Text("הוראות גישה", color = BrandBlue, fontSize = 13.sp)
            }
        }

        HorizontalDivider(color = Color.White.copy(alpha = 0.08f))

        LazyColumn {
            // ── Notes ────────────────────────────────────────────────────
            item {
                Row(
                    modifier = rowHeight.clickable { }.padding(horizontal = 20.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(stringResource(R.string.planner_notes_label), color = MaterialTheme.colorScheme.onSurface, fontSize = 15.sp, modifier = Modifier.weight(1f), textAlign = TextAlign.End)
                    Spacer(Modifier.width(12.dp))
                    Icon(Icons.Default.CameraAlt, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(20.dp))
                }
                HorizontalDivider(color = Color.White.copy(alpha = 0.07f))
            }

            // ── Package tracking ─────────────────────────────────────────
            item {
                Row(
                    modifier = rowHeight.padding(horizontal = 20.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("איתור חבילות", color = MaterialTheme.colorScheme.onSurface, fontSize = 15.sp, modifier = Modifier.weight(1f), textAlign = TextAlign.End)
                    Text("לא הוגדר", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 14.sp)
                }
                HorizontalDivider(color = Color.White.copy(alpha = 0.07f))
            }

            // ── Package count ────────────────────────────────────────────
            item {
                Row(
                    modifier = rowHeight.padding(horizontal = 20.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("חבילות", color = MaterialTheme.colorScheme.onSurface, fontSize = 15.sp, modifier = Modifier.weight(1f), textAlign = TextAlign.End)
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        IconButton(
                            onClick = { if (packageCount > 1) packageCount-- },
                            modifier = Modifier.size(32.dp)
                        ) {
                            Icon(Icons.Default.Remove, null, tint = BrandBlue, modifier = Modifier.size(18.dp))
                        }
                        Text(
                            packageCount.toString(),
                            color = MaterialTheme.colorScheme.onSurface,
                            fontWeight = FontWeight.Bold,
                            fontSize = 16.sp,
                            modifier = Modifier.width(32.dp),
                            textAlign = TextAlign.Center
                        )
                        IconButton(
                            onClick = { packageCount++ },
                            modifier = Modifier.size(32.dp)
                        ) {
                            Icon(Icons.Default.Add, null, tint = BrandBlue, modifier = Modifier.size(18.dp))
                        }
                    }
                }
                HorizontalDivider(color = Color.White.copy(alpha = 0.07f))
            }

            // ── Order (numeric) ──────────────────────────────────────────
            item {
                Row(
                    modifier = rowHeight.padding(horizontal = 20.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("סידור", color = MaterialTheme.colorScheme.onSurface, fontSize = 15.sp, modifier = Modifier.weight(1f), textAlign = TextAlign.End)
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("מיקום:", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
                        Spacer(Modifier.width(6.dp))
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = Surface2Dark,
                            border = BorderStroke(0.5.dp, Color.White.copy(alpha = 0.2f)),
                            modifier = Modifier.width(56.dp).height(34.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                androidx.compose.foundation.text.BasicTextField(
                                    value = orderIndex,
                                    onValueChange = { v -> if (v.length <= 2 && (v.isEmpty() || v.toIntOrNull() != null)) orderIndex = v },
                                    textStyle = LocalTextStyle.current.copy(
                                        color = MaterialTheme.colorScheme.onSurface,
                                        fontSize = 15.sp,
                                        fontWeight = FontWeight.Bold,
                                        textAlign = TextAlign.Center
                                    ),
                                    singleLine = true,
                                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done,
                                        keyboardType = androidx.compose.ui.text.input.KeyboardType.Number),
                                    modifier = Modifier.fillMaxWidth()
                                )
                                if (orderIndex.isEmpty()) {
                                    Text("אוטו", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp, textAlign = TextAlign.Center)
                                }
                            }
                        }
                    }
                }
                HorizontalDivider(color = Color.White.copy(alpha = 0.07f))
            }

            // ── Stop type ────────────────────────────────────────────────
            item {
                Row(
                    modifier = rowHeight.padding(horizontal = 20.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("סוג", color = MaterialTheme.colorScheme.onSurface, fontSize = 15.sp, modifier = Modifier.weight(1f), textAlign = TextAlign.End)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf(context.getString(R.string.planner_stop_type_delivery) to "delivery", context.getString(R.string.planner_stop_type_pickup) to "pickup").forEach { (label, value) ->
                            Surface(
                                modifier = Modifier
                                    .height(32.dp)
                                    .clickable { stopType = value },
                                shape = RoundedCornerShape(10.dp),
                                color = if (stopType == value) BrandBlue else Surface2Dark,
                                border = BorderStroke(0.5.dp, if (stopType == value) BrandBlue else Color.White.copy(alpha = 0.15f))
                            ) {
                                Box(contentAlignment = Alignment.Center, modifier = Modifier.padding(horizontal = 14.dp)) {
                                    Text(
                                        label,
                                        color = if (stopType == value) Graphite950 else MaterialTheme.colorScheme.onSurface,
                                        fontWeight = if (stopType == value) FontWeight.Bold else FontWeight.Normal,
                                        fontSize = 13.sp
                                    )
                                }
                            }
                        }
                    }
                }
                HorizontalDivider(color = Color.White.copy(alpha = 0.07f))
            }

            // ── Arrival time ─────────────────────────────────────────────
            item {
                Row(
                    modifier = rowHeight.clickable { }.padding(horizontal = 20.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("שעת הגעה", color = MaterialTheme.colorScheme.onSurface, fontSize = 15.sp, modifier = Modifier.weight(1f), textAlign = TextAlign.End)
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(arrivalTime, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 14.sp)
                        Spacer(Modifier.width(4.dp))
                        Icon(Icons.Default.ChevronLeft, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(16.dp))
                    }
                }
                HorizontalDivider(color = Color.White.copy(alpha = 0.07f))
            }

            // ── Duration ─────────────────────────────────────────────────
            item {
                Row(
                    modifier = rowHeight.clickable { }.padding(horizontal = 20.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("משך העצירה המשוערת", color = MaterialTheme.colorScheme.onSurface, fontSize = 15.sp, modifier = Modifier.weight(1f), textAlign = TextAlign.End)
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("$durationMinutes דק׳", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 14.sp)
                        Spacer(Modifier.width(4.dp))
                        Icon(Icons.Default.ChevronLeft, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(16.dp))
                    }
                }
                HorizontalDivider(color = Color.White.copy(alpha = 0.12f), thickness = 1.dp)
            }

            // ── Actions ──────────────────────────────────────────────────
            item {
                Row(
                    modifier = rowHeight.clickable { }.padding(horizontal = 20.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("שינוי כתובת", color = MaterialTheme.colorScheme.onSurface, fontSize = 15.sp, modifier = Modifier.weight(1f), textAlign = TextAlign.End)
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Search, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(4.dp))
                        Icon(Icons.Default.ChevronLeft, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(16.dp))
                    }
                }
                HorizontalDivider(color = Color.White.copy(alpha = 0.07f))
            }

            item {
                Row(
                    modifier = rowHeight.clickable { showDuplicateConfirm = true }.padding(horizontal = 20.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("שכפול עצירה", color = MaterialTheme.colorScheme.onSurface, fontSize = 15.sp, modifier = Modifier.weight(1f), textAlign = TextAlign.End)
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.CopyAll, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(4.dp))
                        Icon(Icons.Default.ChevronLeft, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(16.dp))
                    }
                }
                HorizontalDivider(color = Color.White.copy(alpha = 0.07f))
            }

            item {
                Row(
                    modifier = rowHeight.clickable { showRemoveConfirm = true }.padding(horizontal = 20.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("להסיר עצירה", color = Color(0xFFFF453A), fontSize = 15.sp, fontWeight = FontWeight.Medium, modifier = Modifier.weight(1f), textAlign = TextAlign.End)
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Delete, null, tint = Color(0xFFFF453A), modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(4.dp))
                        Icon(Icons.Default.ChevronLeft, null, tint = Color(0xFFFF453A).copy(alpha = 0.5f), modifier = Modifier.size(16.dp))
                    }
                }
                Spacer(Modifier.height(16.dp))
            }
        }
    }

    // Remove confirmation dialog
    if (showRemoveConfirm) {
        AlertDialog(
            onDismissRequest = { showRemoveConfirm = false },
            title = { Text("הסרת עצירה", color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.Bold) },
            text = { Text("האם להסיר את העצירה הזו מהמסלול?", color = MaterialTheme.colorScheme.onSurfaceVariant) },
            confirmButton = {
                TextButton(onClick = { showRemoveConfirm = false; onRemove() }) {
                    Text("הסר", color = Color(0xFFFF453A), fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showRemoveConfirm = false }) {
                    Text("ביטול", color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            },
            containerColor = Surface2Dark
        )
    }
}
