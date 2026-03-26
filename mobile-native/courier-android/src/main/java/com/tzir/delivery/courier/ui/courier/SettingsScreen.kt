package com.tzir.delivery.courier.ui.courier

import android.content.Context
import android.content.SharedPreferences
import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
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
import com.tzir.delivery.courier.R
import com.tzir.delivery.courier.ui.components.*
import com.tzir.delivery.courier.ui.theme.*

// Preference keys
const val PREF_NAV_APP = "pref_nav_app"
const val PREF_MAP_THEME = "pref_map_theme"
const val PREF_NOTIFICATIONS = "pref_notifications"

// Navigation app options
enum class NavApp(val labelRes: Int, val packageScheme: String) {
    WAZE(R.string.nav_app_waze, "waze"),
    GOOGLE_MAPS(R.string.nav_app_google_maps, "google.navigation"),
    DEFAULT(R.string.nav_app_default, "default")
}

// Map theme options
enum class MapTheme(val labelRes: Int) {
    AUTO(R.string.map_theme_auto),
    MIDNIGHT(R.string.map_theme_midnight),
    SILVER(R.string.map_theme_silver)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(onBack: () -> Unit, onVehicleSettings: () -> Unit = {}) {
    val context = LocalContext.current
    val prefs = context.getSharedPreferences("tzir_prefs", Context.MODE_PRIVATE)

    var selectedNavApp by remember {
        mutableStateOf(
            NavApp.entries.find { it.name == prefs.getString(PREF_NAV_APP, NavApp.WAZE.name) }
                ?: NavApp.WAZE
        )
    }
    var selectedMapTheme by remember {
        mutableStateOf(
            MapTheme.entries.find { it.name == prefs.getString(PREF_MAP_THEME, MapTheme.AUTO.name) }
                ?: MapTheme.AUTO
        )
    }
    var notificationsEnabled by remember {
        mutableStateOf(prefs.getBoolean(PREF_NOTIFICATIONS, true))
    }

    Scaffold(
        topBar = {
            CenterAlignedTopAppBar(
                title = { Text(stringResource(R.string.drawer_settings), fontWeight = FontWeight.Bold, color = Amber) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Text("✕", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = Amber)
                    }
                },
                colors = TopAppBarDefaults.centerAlignedTopAppBarColors(containerColor = Color.Transparent)
            )
        },
        containerColor = Color.Transparent
    ) { padding ->
        PremiumBackground {
            Column(
                modifier = Modifier
                    .padding(padding)
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(24.dp)
            ) {
                // Navigation App Section
                SettingsSection(title = "🗺️ ${stringResource(R.string.settings_nav_app)}") {
                    NavApp.entries.forEach { app ->
                        SettingsRadioRow(
                            label = stringResource(app.labelRes),
                            selected = selectedNavApp == app,
                            onClick = {
                                selectedNavApp = app
                                prefs.edit().putString(PREF_NAV_APP, app.name).apply()
                            }
                        )
                    }
                }

                // Map Theme Section
                SettingsSection(title = "🌙 ${stringResource(R.string.settings_map_theme)}") {
                    MapTheme.entries.forEach { theme ->
                        SettingsRadioRow(
                            label = stringResource(theme.labelRes),
                            selected = selectedMapTheme == theme,
                            onClick = {
                                selectedMapTheme = theme
                                prefs.edit().putString(PREF_MAP_THEME, theme.name).apply()
                            }
                        )
                    }
                }

                // Notifications Section
                SettingsSection(title = "🔔 ${stringResource(R.string.settings_notifications)}") {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 4.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            stringResource(R.string.notification_offers),
                            fontSize = 15.sp,
                            color = Color.White,
                            fontWeight = FontWeight.Medium
                        )
                        Switch(
                            checked = notificationsEnabled,
                            onCheckedChange = {
                                notificationsEnabled = it
                                prefs.edit().putBoolean(PREF_NOTIFICATIONS, it).apply()
                            },
                            colors = SwitchDefaults.colors(
                                checkedTrackColor = Amber,
                                checkedThumbColor = Color.White
                            )
                        )
                    }
                }

                // Vehicle Settings Section
                SettingsSection(title = "🚗 ${stringResource(R.string.settings_vehicle)}") {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { onVehicleSettings() }
                            .padding(vertical = 12.dp, horizontal = 4.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(stringResource(R.string.vehicle_management_hint), fontSize = 15.sp, color = Color.White, fontWeight = FontWeight.Medium)
                            Text(stringResource(R.string.click_to_manage), fontSize = 12.sp, color = Color.Gray)
                        }
                        Text("‹", fontSize = 24.sp, color = Amber, fontWeight = FontWeight.Light)
                    }
                }

                // App Info Section
                SettingsSection(title = "ℹ️ ${stringResource(R.string.settings_about)}") {
                    InfoRow(stringResource(R.string.app_version), "1.0.4")
                    InfoRow(stringResource(R.string.backend_server), stringResource(R.string.status_connected))
                    InfoRow(stringResource(R.string.realtime_engine), stringResource(R.string.status_active_verified))
                }
            }
        }
    }
}

@Composable
fun SettingsSection(title: String, content: @Composable ColumnScope.() -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Text(
            title,
            fontWeight = FontWeight.Black,
            fontSize = 16.sp,
            color = Amber,
            modifier = Modifier.padding(bottom = 8.dp)
        )
        GlassCard(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(16.dp), content = content)
        }
    }
}

@Composable
fun SettingsRadioRow(label: String, selected: Boolean, onClick: () -> Unit) {
    val bgColor by animateColorAsState(
        targetValue = if (selected) Amber.copy(alpha = 0.1f) else Color.Transparent,
        label = "bg"
    )
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .background(bgColor, RoundedCornerShape(12.dp))
            .padding(horizontal = 12.dp, vertical = 10.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(label, fontSize = 15.sp, color = if (selected) Amber else Color.White, fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium)
        if (selected) {
            Surface(
                color = Amber,
                shape = CircleShape,
                modifier = Modifier.size(24.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        Icons.Default.Check,
                        contentDescription = null,
                        tint = Navy950,
                        modifier = Modifier.size(14.dp)
                    )
                }
            }
        }
    }
}

@Composable
fun InfoRow(label: String, value: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 6.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(label, fontSize = 14.sp, color = Color.Gray)
        Text(value, fontSize = 14.sp, color = Amber, fontWeight = FontWeight.Bold)
    }
}
