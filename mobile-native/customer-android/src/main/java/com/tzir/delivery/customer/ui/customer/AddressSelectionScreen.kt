package com.tzir.delivery.customer.ui.customer

import android.util.Log
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavHostController
import com.tzir.delivery.customer.R
import com.tzir.delivery.customer.ui.components.*
import com.tzir.delivery.customer.ui.theme.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext
import org.json.JSONArray
import java.net.URL
import java.net.URLEncoder

// ────────────────────────────────────────────────────────────────────────────
// Data model for backend autocomplete responses
// ────────────────────────────────────────────────────────────────────────────

data class AddressResult(
    val id: String,
    val full_address: String,
    val street: String,
    val city: String,
    val number: String,
    val placeId: String = "",   // for Google results
    val source: String,
    val is_verified: Boolean = false
)

// ────────────────────────────────────────────────────────────────────────────
// Backend endpoint helpers (public – no auth required)
// ────────────────────────────────────────────────────────────────────────────

private const val BASE_URL = "http://10.0.2.2:5000"

private suspend fun searchAddressesBackend(query: String): List<AddressResult> = withContext(Dispatchers.IO) {
    try {
        val encoded = URLEncoder.encode(query, "UTF-8")
        val url = URL("$BASE_URL/api/addresses/autocomplete?q=$encoded")
        val json = url.readText()
        val arr = JSONArray(json)
        (0 until arr.length()).map { i ->
            val obj = arr.getJSONObject(i)
            AddressResult(
                id = obj.optString("id", i.toString()),
                full_address = obj.optString("full_address", ""),
                street = obj.optString("street", ""),
                city = obj.optString("city", ""),
                number = obj.optString("number", ""),
                placeId = obj.optString("place_id", ""),
                source = obj.optString("source", ""),
                is_verified = obj.optBoolean("is_verified", false)
            )
        }
    } catch (e: Exception) {
        Log.e("AddressSearch", "Autocomplete failed: ${e.message}")
        emptyList()
    }
}

private suspend fun geocodeBackend(fullAddress: String, placeId: String): Pair<Double, Double>? = withContext(Dispatchers.IO) {
    try {
        val encoded = URLEncoder.encode(fullAddress, "UTF-8")
        val pidParam = if (placeId.isNotBlank() && !placeId.startsWith("nom_") && !placeId.startsWith("local_"))
            "&place_id=${URLEncoder.encode(placeId, "UTF-8")}" else ""
        val url = URL("$BASE_URL/api/addresses/geocode?q=$encoded$pidParam")
        val json = org.json.JSONObject(url.readText())
        val lat = json.optDouble("lat", Double.NaN)
        val lng = json.optDouble("lng", Double.NaN)
        if (!lat.isNaN() && !lng.isNaN()) lat to lng else null
    } catch (e: Exception) {
        Log.e("AddressSearch", "Geocode failed: ${e.message}")
        null
    }
}

// ────────────────────────────────────────────────────────────────────────────
// AddressSelectionScreen — Places SDK removed, backend autocomplete used
// ────────────────────────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddressSelectionScreen(navController: NavHostController) {
    var pickupAddress   by remember { mutableStateOf("") }
    var deliveryAddress by remember { mutableStateOf("") }
    var pickupLatLng    by remember { mutableStateOf<Pair<Double, Double>?>(null) }
    var deliveryLatLng  by remember { mutableStateOf<Pair<Double, Double>?>(null) }

    var focusedField  by remember { mutableIntStateOf(0) } // 0 = pickup, 1 = delivery
    var suggestions   by remember { mutableStateOf(emptyList<AddressResult>()) }
    var isSearching   by remember { mutableStateOf(false) }
    var geocodingBusy by remember { mutableStateOf(false) }
    var isSelecting   by remember { mutableStateOf(false) }
    var selectedPlaceId by remember { mutableStateOf("") }

    val currentQuery = if (focusedField == 0) pickupAddress else deliveryAddress

    // Debounced autocomplete search against the backend
    LaunchedEffect(currentQuery) {
        if (isSelecting) {
            isSelecting = false
            return@LaunchedEffect
        }
        if (currentQuery.length < 2) {
            suggestions = emptyList()
            isSearching = false
            return@LaunchedEffect
        }
        delay(300L) // debounce
        isSearching = true
        Log.d("AddressSearch", "Querying backend for: $currentQuery")
        suggestions = searchAddressesBackend(currentQuery)
        Log.d("AddressSearch", "Got ${suggestions.size} results for '$currentQuery'")
        isSearching = false
    }

    PremiumBackground {
        Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {

            // ─── Header ───────────────────────────────────────────────────
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = { navController.popBackStack() }) {
                    Icon(Icons.Default.ArrowBack, contentDescription = null, tint = AmberGold)
                }
                Text(
                    text = stringResource(R.string.where_to),
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
            }

            Spacer(modifier = Modifier.height(24.dp))

            // ─── Address inputs ───────────────────────────────────────────
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp)) {
                    TzirTextField(
                        value = pickupAddress,
                        onValueChange = {
                            pickupAddress = it
                            pickupLatLng = null
                            focusedField = 0
                        },
                        label = stringResource(R.string.pickup_location),
                        placeholder = stringResource(R.string.enter_street_city),
                        leadingIcon = { Icon(Icons.Default.MyLocation, null, tint = AmberGold) },
                        trailingIcon = if (pickupLatLng != null) {
                            { Icon(Icons.Default.CheckCircle, null, tint = Color.Green) }
                        } else null
                    )
                    Spacer(Modifier.height(16.dp))
                    TzirTextField(
                        value = deliveryAddress,
                        onValueChange = {
                            deliveryAddress = it
                            deliveryLatLng = null
                            focusedField = 1
                        },
                        label = stringResource(R.string.delivery_destination),
                        placeholder = stringResource(R.string.delivery_destination),
                        leadingIcon = { Icon(Icons.Default.Place, null, tint = Color.Red) },
                        trailingIcon = if (deliveryLatLng != null) {
                            { Icon(Icons.Default.CheckCircle, null, tint = Color.Green) }
                        } else null
                    )
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // ─── Progress bar ─────────────────────────────────────────────
            if (isSearching || geocodingBusy) {
                LinearProgressIndicator(
                    modifier = Modifier.fillMaxWidth().height(2.dp),
                    color = AmberGold
                )
                Spacer(Modifier.height(8.dp))
            }

            Text(
                text = when {
                    isSearching    -> stringResource(R.string.searching)
                    geocodingBusy  -> "מחפש קואורדינטות..."
                    currentQuery.length >= 2 && suggestions.isEmpty() -> stringResource(R.string.no_address_results)
                    else           -> stringResource(R.string.suggestions)
                },
                color = Graphite400,
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold
            )
            Spacer(modifier = Modifier.height(12.dp))

            // ─── Suggestion list ──────────────────────────────────────────
            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.weight(1f)
            ) {
                items(suggestions) { result ->
                    Surface(
                        modifier = Modifier.fillMaxWidth().clickable {
                            // Set the text field
                            val chosen = result.full_address
                            selectedPlaceId = result.placeId
                            isSelecting = true
                            if (focusedField == 0) {
                                pickupAddress = chosen
                                pickupLatLng = null
                            } else {
                                deliveryAddress = chosen
                                deliveryLatLng = null
                            }
                            suggestions = emptyList()

                            // Geocode asynchronously
                            geocodingBusy = true
                        },
                        color = Color.Transparent
                    ) {
                        Row(
                            modifier = Modifier.padding(vertical = 12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Default.History, null, tint = Graphite400, modifier = Modifier.size(18.dp))
                            Spacer(Modifier.width(16.dp))
                            Column {
                                Text(result.full_address, color = Color.White, fontSize = 15.sp)
                                if (result.city.isNotBlank()) {
                                    Text(result.city, color = Graphite400, fontSize = 12.sp)
                                }
                            }
                        }
                    }
                }
            }

            // ─── Geocoding trigger ────────────────────────────────────────
            // Runs when geocodingBusy flips to true (after user selects)
            var showPickupUnverifiedDialog by remember { mutableStateOf(false) }
            var showDeliveryUnverifiedDialog by remember { mutableStateOf(false) }
            
            LaunchedEffect(geocodingBusy) {
                if (!geocodingBusy) return@LaunchedEffect
                
                try {
                    // Improved sequential geocoding
                    val fieldsToGeocode = mutableListOf<Int>()
                    if (pickupLatLng == null && pickupAddress.isNotBlank()) fieldsToGeocode.add(0)
                    if (deliveryLatLng == null && deliveryAddress.isNotBlank()) fieldsToGeocode.add(1)
                    
                    for (field in fieldsToGeocode) {
                        val addr = if (field == 0) pickupAddress else deliveryAddress
                        val pid = if (field == focusedField) selectedPlaceId else ""
                        
                        val encoded = URLEncoder.encode(addr, "UTF-8")
                        val pidParam = if (pid.isNotBlank() && !pid.startsWith("nom_") && !pid.startsWith("local_")) 
                            "&place_id=${URLEncoder.encode(pid, "UTF-8")}" else ""
                        val url = URL("$BASE_URL/api/addresses/geocode?q=$encoded$pidParam")
                        val json = org.json.JSONObject(url.readText())
                        val lat = json.optDouble("lat", Double.NaN)
                        val lng = json.optDouble("lng", Double.NaN)
                        val isVerified = json.optBoolean("is_verified", false)

                        if (!lat.isNaN() && !lng.isNaN()) {
                            val coords = lat to lng
                            if (field == 0) {
                                pickupLatLng = coords
                                if (!isVerified) showPickupUnverifiedDialog = true
                            } else {
                                deliveryLatLng = coords
                                if (!isVerified) showDeliveryUnverifiedDialog = true
                            }
                        }
                    }
                } catch (e: Exception) {
                    Log.e("AddressSearch", "Geocode failed", e)
                } finally {
                    geocodingBusy = false
                }
            }

            // Unverified Pickup Dialog
            if (showPickupUnverifiedDialog) {
                AlertDialog(
                    onDismissRequest = { showPickupUnverifiedDialog = false },
                    title = { Text("כתובת איסוף לא מאומתת", color = Color.White) },
                    text = { Text("כתובת האיסוף שבחרת לא אומתה במערכת גוגל. האם ברצונך להמשיך?", color = Color.White) },
                    confirmButton = {
                        TextButton(onClick = { showPickupUnverifiedDialog = false }) {
                            Text("המשך", color = AmberGold)
                        }
                    },
                    dismissButton = {
                        TextButton(onClick = { 
                            showPickupUnverifiedDialog = false
                            pickupLatLng = null 
                        }) {
                            Text("ערוך כתובת", color = Graphite400)
                        }
                    },
                    containerColor = Graphite900
                )
            }

            // Unverified Delivery Dialog
            if (showDeliveryUnverifiedDialog) {
                AlertDialog(
                    onDismissRequest = { showDeliveryUnverifiedDialog = false },
                    title = { Text("כתובת מסירה לא מאומתת", color = Color.White) },
                    text = { Text("כתובת המסירה שבחרת לא אומתה במערכת גוגל. האם ברצונך להמשיך?", color = Color.White) },
                    confirmButton = {
                        TextButton(onClick = { showDeliveryUnverifiedDialog = false }) {
                            Text("המשך", color = AmberGold)
                        }
                    },
                    dismissButton = {
                        TextButton(onClick = { 
                            showDeliveryUnverifiedDialog = false
                            deliveryLatLng = null 
                        }) {
                            Text("ערוך כתובת", color = Graphite400)
                        }
                    },
                    containerColor = Graphite900
                )
            }

            // ─── Next button ──────────────────────────────────────────────
            val isReady = pickupAddress.isNotBlank() && deliveryAddress.isNotBlank()
            TzirButton(
                text = if (geocodingBusy) "בודק כתובות..." else stringResource(R.string.next_summary),
                onClick = {
                    if (pickupLatLng != null && deliveryLatLng != null) {
                        navController.navigate("order_summary/$pickupAddress/$deliveryAddress/${pickupLatLng!!.first}/${pickupLatLng!!.second}/${deliveryLatLng!!.first}/${deliveryLatLng!!.second}")
                    } else {
                        // Trigger one-time geocoding for both if missing
                        geocodingBusy = true
                    }
                },
                modifier = Modifier.fillMaxWidth().height(56.dp).navigationBarsPadding(),
                enabled = isReady && !geocodingBusy
            )
        }
    }
}
