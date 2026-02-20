package com.tzir.delivery.android.ui.courier

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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tzir.delivery.android.ui.components.*

// Preference keys
const val PREF_NAV_APP = "pref_nav_app"
const val PREF_MAP_THEME = "pref_map_theme"
const val PREF_NOTIFICATIONS = "pref_notifications"

// Navigation app options
enum class NavApp(val label: String, val packageScheme: String) {
    WAZE("Waze", "waze"),
    GOOGLE_MAPS("Google Maps", "google.navigation"),
    DEFAULT("ניווט ברירת מחדל", "default")
}

// Map theme options
enum class MapTheme(val label: String) {
    AUTO("אוטומטי (יום/לילה)"),
    MIDNIGHT("Midnight Neon"),
    SILVER("Silver Classic")
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(onBack: () -> Unit) {
    val context = LocalContext.current
    val prefs = context.getSharedPreferences("tzir_prefs", Context.MODE_PRIVATE)

    var selectedNavApp by remember {
        mutableStateOf(
            NavApp.values().find { it.name == prefs.getString(PREF_NAV_APP, NavApp.WAZE.name) }
                ?: NavApp.WAZE
        )
    }
    var selectedMapTheme by remember {
        mutableStateOf(
            MapTheme.values().find { it.name == prefs.getString(PREF_MAP_THEME, MapTheme.AUTO.name) }
                ?: MapTheme.AUTO
        )
    }
    var notificationsEnabled by remember {
        mutableStateOf(prefs.getBoolean(PREF_NOTIFICATIONS, true))
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("הגדרות", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Text("✕", fontSize = 20.sp, fontWeight = FontWeight.Bold)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.White)
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .padding(padding)
                .fillMaxSize()
                .background(AppleGray)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(24.dp)
        ) {
            // Navigation App Section
            SettingsSection(title = "🗺️ אפליקציית ניווט") {
                NavApp.values().forEach { app ->
                    SettingsRadioRow(
                        label = app.label,
                        selected = selectedNavApp == app,
                        onClick = {
                            selectedNavApp = app
                            prefs.edit().putString(PREF_NAV_APP, app.name).apply()
                        }
                    )
                }
            }

            // Map Theme Section
            SettingsSection(title = "🌙 ערכת נושא מפה") {
                MapTheme.values().forEach { theme ->
                    SettingsRadioRow(
                        label = theme.label,
                        selected = selectedMapTheme == theme,
                        onClick = {
                            selectedMapTheme = theme
                            prefs.edit().putString(PREF_MAP_THEME, theme.name).apply()
                        }
                    )
                }
            }

            // Notifications Section
            SettingsSection(title = "🔔 התראות") {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 4.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        "התראות משימות חדשות",
                        fontSize = 15.sp,
                        color = TextOfficial,
                        fontWeight = FontWeight.Medium
                    )
                    Switch(
                        checked = notificationsEnabled,
                        onCheckedChange = {
                            notificationsEnabled = it
                            prefs.edit().putBoolean(PREF_NOTIFICATIONS, it).apply()
                        },
                        colors = SwitchDefaults.colors(
                            checkedTrackColor = PrimaryTurquoise,
                            checkedThumbColor = AppleWhite
                        )
                    )
                }
            }

            // App Info Section
            SettingsSection(title = "ℹ️ אודות") {
                InfoRow("גרסת אפליקציה", "1.0.4")
                InfoRow("שרת Backend", "מחובר ✅")
                InfoRow("מנוע Real-time", "פעיל ✅")
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
            color = TextOfficial,
            modifier = Modifier.padding(bottom = 8.dp)
        )
        GlassCard(modifier = Modifier.fillMaxWidth(), cornerRadius = 20.dp) {
            Column(modifier = Modifier.padding(16.dp), content = content)
        }
    }
}

@Composable
fun SettingsRadioRow(label: String, selected: Boolean, onClick: () -> Unit) {
    val bgColor by animateColorAsState(
        targetValue = if (selected) PrimaryTurquoise.copy(alpha = 0.1f) else Color.Transparent,
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
        Text(label, fontSize = 15.sp, color = Color(0xFF001C44), fontWeight = FontWeight.Medium)
        if (selected) {
            Surface(
                color = PrimaryTurquoise,
                shape = CircleShape,
                modifier = Modifier.size(24.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        Icons.Default.Check,
                        contentDescription = null,
                        tint = Color.White,
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
        Text(value, fontSize = 14.sp, color = TextOfficial, fontWeight = FontWeight.Bold)
    }
}
