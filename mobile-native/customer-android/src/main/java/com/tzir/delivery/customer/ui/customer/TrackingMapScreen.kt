package com.tzir.delivery.customer.ui.customer

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import androidx.navigation.NavHostController
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.model.CameraPosition
import com.google.android.gms.maps.model.LatLng
import com.google.maps.android.compose.*
import com.tzir.delivery.customer.repository.CustomerRepository
import com.tzir.delivery.customer.network.SocketManager
import com.tzir.delivery.customer.util.LocationProvider
import androidx.compose.ui.res.stringResource
import com.tzir.delivery.customer.R
import com.tzir.delivery.customer.ui.theme.*
import com.tzir.delivery.customer.ui.components.*
import kotlinx.coroutines.flow.collectLatest

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TrackingMapScreen(
    orderId: String,
    navController: NavHostController,
    repository: CustomerRepository
) {
    val context = LocalContext.current
    val locationProvider = remember { LocationProvider.getInstance(context) }
    val myLocation by locationProvider.currentLocation.collectAsState()
    
    // Courier Location - Start with current location and update via Socket
    var courierLocation by remember { mutableStateOf(LatLng(32.0853, 34.7818)) }
    
    val cameraPositionState = rememberCameraPositionState {
        position = CameraPosition.fromLatLngZoom(courierLocation, 15f)
    }

    // Permission handling
    var hasLocationPermission by remember {
        mutableStateOf(ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED)
    }
    val launcher = rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { p ->
        hasLocationPermission = p.values.all { it }
    }

    LaunchedEffect(Unit) {
        if (!hasLocationPermission) {
            launcher.launch(arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION))
        } else {
            locationProvider.startLocationUpdates()
        }
    }

    // Socket Integration
    LaunchedEffect(orderId) {
        SocketManager.trackDelivery(orderId)
        SocketManager.courierLocationUpdates.collectLatest { data ->
            val lat = data.optDouble("lat", 0.0)
            val lng = data.optDouble("lng", 0.0)
            if (lat != 0.0 && lng != 0.0) {
                courierLocation = LatLng(lat, lng)
                // Optionally animate camera to courier
                cameraPositionState.animate(CameraUpdateFactory.newLatLng(courierLocation))
            }
        }
    }

    // Bridge: If no courier update yet, use local GPS as starting point for dev visibility
    LaunchedEffect(myLocation) {
        if (courierLocation.latitude == 32.0853 && courierLocation.longitude == 34.7818) { // Only if still on default
             myLocation?.let {
                 courierLocation = LatLng(it.latitude, it.longitude)
                 cameraPositionState.position = CameraPosition.fromLatLngZoom(courierLocation, 15f)
             }
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        GoogleMap(
            modifier = Modifier.fillMaxSize(),
            cameraPositionState = cameraPositionState,
            properties = MapProperties(isMyLocationEnabled = hasLocationPermission),
            uiSettings = MapUiSettings(zoomControlsEnabled = false)
        ) {
            // Courier Marker
            Marker(
                state = MarkerState(position = courierLocation),
                title = stringResource(R.string.courier),
                snippet = stringResource(R.string.delivery_on_the_way)
            )
        }

        // Floating Back Button
        IconButton(
            onClick = { navController.popBackStack() },
            modifier = Modifier.statusBarsPadding().padding(16.dp).size(48.dp)
        ) {
            Surface(shape = androidx.compose.foundation.shape.CircleShape, color = Graphite950.copy(alpha = 0.8f)) {
                Icon(Icons.Default.ArrowBack, contentDescription = null, tint = BrandBlue, modifier = Modifier.padding(12.dp))
            }
        }

        // Bottom Info Card
        Column(
            modifier = Modifier.align(Alignment.BottomCenter).padding(16.dp).navigationBarsPadding()
        ) {
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(24.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Surface(shape = androidx.compose.foundation.shape.CircleShape, color = BrandBlue.copy(alpha = 0.1f)) {
                            Icon(Icons.Default.LocalShipping, contentDescription = null, tint = BrandBlue, modifier = Modifier.padding(12.dp))
                        }
                        Spacer(Modifier.width(16.dp))
                        Column {
                            Text(stringResource(R.string.fast_delivery), fontWeight = FontWeight.Bold, color = Color.White)
                            Text(stringResource(R.string.active), color = BrandBlue, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                    Spacer(Modifier.height(16.dp))
                    TzirButton(
                        text = stringResource(R.string.call_courier),
                        onClick = { /* TODO */ },
                        modifier = Modifier.fillMaxWidth().height(48.dp),
                        icon = Icons.Default.Phone
                    )
                }
            }
        }
    }
}
