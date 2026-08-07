package com.tzir.delivery.courier.ui.courier

import android.content.Context
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.core.tween
import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.tzir.delivery.courier.R
import com.tzir.delivery.courier.model.User
import com.tzir.delivery.courier.network.KtorClientFactory
import com.tzir.delivery.courier.repository.CourierRepository
import com.tzir.delivery.courier.ui.components.*
import com.tzir.delivery.courier.ui.theme.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

// Preference keys
const val PREF_NAV_APP = "pref_nav_app"
const val PREF_MAP_THEME = "pref_map_theme"
const val PREF_NOTIFICATIONS = "pref_notifications"
const val PREF_DARK_MODE = "pref_dark_mode"

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
fun SettingsScreen(
    onBack: () -> Unit,
    user: User? = null,
    courierRepository: CourierRepository? = null,
    onVehicleSettings: () -> Unit = {},
    onRouteClick: () -> Unit = {},
    onCalendarClick: () -> Unit = {},
    onDocumentsClick: () -> Unit = {},
    onAcademyClick: () -> Unit = {},
    onSupportClick: () -> Unit = {},
    onLogout: () -> Unit = {}
) {
    val context = LocalContext.current
    val prefs = context.getSharedPreferences("tzir_prefs", Context.MODE_PRIVATE)
    val scope = rememberCoroutineScope()

    var darkModeEnabled by remember {
        mutableStateOf(DarkModeState.isDarkTheme)
    }
    var showSettingsSheet by remember { mutableStateOf(false) }

    // ── Profile photo (Feature #6) ──────────────────────────────
    var photoUrl by remember { mutableStateOf(prefs.getString("pref_profile_photo", null)) }
    var photoMenuOpen by remember { mutableStateOf(false) }
    var uploadingPhoto by remember { mutableStateOf(false) }

    fun savePhotoToPrefs(url: String?) {
        prefs.edit().apply {
            if (url == null) remove("pref_profile_photo") else putString("pref_profile_photo", url)
        }.apply()
        photoUrl = url
    }

    val photoPicker = rememberLauncherForActivityResult(
        ActivityResultContracts.PickVisualMedia()
    ) { uri: Uri? ->
        if (uri != null) {
            scope.launch {
                uploadingPhoto = true
                val bytes = withContext(Dispatchers.IO) {
                    context.contentResolver.openInputStream(uri)?.use { it.readBytes() }
                }
                if (bytes != null) {
                    val uploaded = courierRepository?.uploadImage(bytes)
                    val absolute = if (uploaded != null && uploaded.startsWith("/")) {
                        KtorClientFactory.resolveBaseUrl() + uploaded
                    } else uploaded
                    savePhotoToPrefs(absolute)
                }
                uploadingPhoto = false
            }
        }
        photoMenuOpen = false
    }

    val backgroundColor = MaterialTheme.colorScheme.background
    val cardBg = MaterialTheme.colorScheme.surface
    val separatorColor = MaterialTheme.colorScheme.outlineVariant
    val onBg = MaterialTheme.colorScheme.onBackground
    val onSurfaceText = MaterialTheme.colorScheme.onSurface
    val onSurfaceVariant = MaterialTheme.colorScheme.onSurfaceVariant
    val surfaceVariant = MaterialTheme.colorScheme.surfaceVariant

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(backgroundColor)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState()),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(Modifier.statusBarsPadding())
            Spacer(Modifier.height(16.dp))

            // ── Title ──────────────────────────────────────────────────────
            Text(
                "עוד",
                color = onBg,
                fontWeight = FontWeight.Black,
                fontSize = 28.sp
            )

            Spacer(Modifier.height(20.dp))

            // ── Avatar ─────────────────────────────────────────────────────
            Box {
                Box(
                    modifier = Modifier
                        .size(80.dp)
                        .clip(CircleShape)
                        .border(3.dp, BrandBlue, CircleShape)
                        .background(surfaceVariant)
                        .clickable { photoMenuOpen = true },
                    contentAlignment = Alignment.Center
                ) {
                    if (photoUrl != null) {
                        AsyncImage(
                            model = photoUrl,
                            contentDescription = null,
                            modifier = Modifier.size(80.dp).clip(CircleShape),
                            contentScale = androidx.compose.ui.layout.ContentScale.Crop
                        )
                    } else {
                        Icon(
                            Icons.Default.Person,
                            contentDescription = null,
                            tint = BrandBlue,
                            modifier = Modifier.size(44.dp)
                        )
                    }
                    if (uploadingPhoto) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(20.dp),
                            strokeWidth = 2.dp
                        )
                    }
                }

                DropdownMenu(
                    expanded = photoMenuOpen,
                    onDismissRequest = { photoMenuOpen = false }
                ) {
                    DropdownMenuItem(
                        text = { Text("הוספת תמונה") },
                        leadingIcon = { Icon(Icons.Default.AddPhotoAlternate, null) },
                        onClick = {
                            photoMenuOpen = false
                            photoPicker.launch(
                                PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)
                            )
                        }
                    )
                    DropdownMenuItem(
                        text = { Text("ללא תמונה") },
                        leadingIcon = { Icon(Icons.Default.Delete, null) },
                        onClick = {
                            photoMenuOpen = false
                            savePhotoToPrefs(null)
                        }
                    )
                }
            }

            Spacer(Modifier.height(10.dp))

            Text(
                user?.fullName ?: user?.username ?: "ישראל",
                color = onBg,
                fontWeight = FontWeight.Bold,
                fontSize = 18.sp
            )

            Spacer(Modifier.height(20.dp))

            // ── Profile Card ───────────────────────────────────────────────
            MoreCard(modifier = Modifier.padding(horizontal = 16.dp)) {
                MoreRow(
                    leadingContent = {
                        Box(
                            modifier = Modifier
                                .size(36.dp)
                                .clip(CircleShape)
                                .background(surfaceVariant)
                                .border(1.5.dp, BrandBlue, CircleShape),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(Icons.Default.Person, null, tint = BrandBlue, modifier = Modifier.size(20.dp))
                        }
                    },
                    trailingContent = {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Surface(
                                color = BrandBlue,
                                shape = RoundedCornerShape(6.dp)
                            ) {
                                Text(
                                    "שליח מתחיל",
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Black,
                                    color = Color.Black,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                                )
                            }
                            Spacer(Modifier.width(10.dp))
                            Column(horizontalAlignment = Alignment.End) {
                                Text(user?.fullName ?: user?.username ?: "ישראל", color = onSurfaceText, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                                Text("מזהה: ${user?.id ?: ""}", color = onSurfaceVariant, fontSize = 11.sp)
                            }
                            Spacer(Modifier.width(10.dp))
                            Icon(Icons.Default.ChevronRight, null, tint = onSurfaceVariant, modifier = Modifier.size(18.dp))
                        }
                    },
                    onClick = {},
                    showDivider = false,
                    cardBg = cardBg
                )
            }

            Spacer(Modifier.height(12.dp))

            // ── Navigation & Tools Card ────────────────────────────────────
            MoreCard(modifier = Modifier.padding(horizontal = 16.dp)) {
                MoreRow(
                    icon = "🗺️",
                    label = "תכנון מסלולים",
                    onClick = onRouteClick,
                    cardBg = cardBg
                )
                HorizontalDivider(color = separatorColor, thickness = 0.5.dp)
                MoreRow(
                    icon = "📅",
                    label = "יומן עבודה",
                    onClick = onCalendarClick,
                    cardBg = cardBg
                )
                HorizontalDivider(color = separatorColor, thickness = 0.5.dp)
                MoreRow(
                    icon = "📄",
                    label = "מסמכים ורגולציות",
                    onClick = onDocumentsClick,
                    cardBg = cardBg
                )
                HorizontalDivider(color = separatorColor, thickness = 0.5.dp)
                MoreRow(
                    icon = "🚗",
                    label = "ניהול כלי רכב",
                    onClick = onVehicleSettings,
                    cardBg = cardBg,
                    showDivider = false
                )
            }

            Spacer(Modifier.height(12.dp))

            // ── Academy & Support Card ─────────────────────────────────────
            MoreCard(modifier = Modifier.padding(horizontal = 16.dp)) {
                // Academy row — BrandBlue highlighted
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(BrandBlue.copy(alpha = 0.08f))
                        .clickable { onAcademyClick() }
                        .padding(horizontal = 16.dp, vertical = 14.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Surface(
                            color = BrandBlue,
                            shape = RoundedCornerShape(6.dp)
                        ) {
                            Text(
                                "חדש",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Black,
                                color = Color.Black,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }
                        Spacer(Modifier.width(10.dp))
                        Text(
                            "🎓  TZIR Academy",
                            color = BrandBlue,
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                    Icon(Icons.Default.ChevronRight, null, tint = BrandBlue.copy(alpha = 0.6f), modifier = Modifier.size(18.dp))
                }

                HorizontalDivider(color = separatorColor, thickness = 0.5.dp)

                MoreRow(
                    icon = "💬",
                    label = "צ'אט ותמיכה",
                    onClick = onSupportClick,
                    cardBg = cardBg,
                    showDivider = false
                )
            }

            Spacer(Modifier.height(12.dp))

            // ── Settings & Dark Mode Card ──────────────────────────────────
            MoreCard(modifier = Modifier.padding(horizontal = 16.dp)) {
                MoreRow(
                    icon = "⚙️",
                    label = "הגדרות",
                    onClick = { showSettingsSheet = true },
                    cardBg = cardBg
                )
                HorizontalDivider(color = separatorColor, thickness = 0.5.dp)
                // Dark mode toggle row
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(cardBg)
                        .padding(horizontal = 16.dp, vertical = 10.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("🌙", fontSize = 16.sp)
                        Spacer(Modifier.width(12.dp))
                        Text("מצב לילה", color = onSurfaceText, fontSize = 15.sp, fontWeight = FontWeight.Medium)
                    }
                    Switch(
                        checked = darkModeEnabled,
                        onCheckedChange = {
                            darkModeEnabled = it
                            prefs.edit().putBoolean(PREF_DARK_MODE, it).apply()
                            DarkModeState.isDarkTheme = it
                        },
                        colors = SwitchDefaults.colors(
                            checkedTrackColor = BrandBlue,
                            checkedThumbColor = Color.White,
                            uncheckedTrackColor = Color(0xFF3A3A3C),
                            uncheckedThumbColor = Color.Gray
                        )
                    )
                }
            }

            Spacer(Modifier.height(12.dp))

            // ── Logout Card ────────────────────────────────────────────────
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp)
                    .clip(RoundedCornerShape(14.dp))
                    .background(cardBg)
                    .clickable { onLogout() }
                    .padding(horizontal = 16.dp, vertical = 14.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        "התנתק",
                        color = Color(0xFFFF3B30),
                        fontSize = 16.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                    Spacer(Modifier.width(10.dp))
                    Icon(
                        Icons.Default.ExitToApp,
                        contentDescription = null,
                        tint = Color(0xFFFF3B30),
                        modifier = Modifier.size(20.dp)
                    )
                }
            }

            Spacer(Modifier.height(32.dp))
            Spacer(Modifier.navigationBarsPadding())
        }
    }

    // ── Settings sub-sheet ─────────────────────────────────────────────────────
    if (showSettingsSheet) {
        SettingsSubSheet(onDismiss = { showSettingsSheet = false })
    }
}

// ── Sub-sheet for nav/map/notification preferences ────────────────────────────
@Composable
fun SettingsSubSheet(onDismiss: () -> Unit) {
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

    val cardBg = MaterialTheme.colorScheme.surface
    val darkBg = MaterialTheme.colorScheme.background
    val separator = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.6f)
    val onSurfaceText = MaterialTheme.colorScheme.onSurface

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(darkBg)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
        ) {
            Spacer(Modifier.statusBarsPadding())

            // Top bar
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 12.dp)
            ) {
                IconButton(onClick = onDismiss, modifier = Modifier.align(Alignment.CenterEnd)) {
                    Icon(Icons.Default.ArrowBack, null, tint = BrandBlue)
                }
                Text(
                    "הגדרות",
                    color = onSurfaceText,
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp,
                    modifier = Modifier.align(Alignment.Center)
                )
            }

            Spacer(Modifier.height(12.dp))

            // Nav App
            Text("🗺️  אפליקציית ניווט", color = BrandBlue, fontWeight = FontWeight.Bold, fontSize = 13.sp, modifier = Modifier.padding(horizontal = 20.dp, vertical = 6.dp))
            MoreCard(modifier = Modifier.padding(horizontal = 16.dp)) {
                NavApp.entries.forEachIndexed { i, app ->
                    SettingsRadioRow(
                        label = context.getString(app.labelRes),
                        selected = selectedNavApp == app,
                        onClick = {
                            selectedNavApp = app
                            prefs.edit().putString(PREF_NAV_APP, app.name).apply()
                        },
                        cardBg = cardBg,
                        showDivider = i < NavApp.entries.size - 1
                    )
                }
            }

            Spacer(Modifier.height(16.dp))

            // Map Theme
            Text("🌙  ערכת מפה", color = BrandBlue, fontWeight = FontWeight.Bold, fontSize = 13.sp, modifier = Modifier.padding(horizontal = 20.dp, vertical = 6.dp))
            MoreCard(modifier = Modifier.padding(horizontal = 16.dp)) {
                MapTheme.entries.forEachIndexed { i, theme ->
                    SettingsRadioRow(
                        label = context.getString(theme.labelRes),
                        selected = selectedMapTheme == theme,
                        onClick = {
                            selectedMapTheme = theme
                            prefs.edit().putString(PREF_MAP_THEME, theme.name).apply()
                        },
                        cardBg = cardBg,
                        showDivider = i < MapTheme.entries.size - 1
                    )
                }
            }

            Spacer(Modifier.height(16.dp))

            // Notifications
            Text("🔔  התראות", color = BrandBlue, fontWeight = FontWeight.Bold, fontSize = 13.sp, modifier = Modifier.padding(horizontal = 20.dp, vertical = 6.dp))
            MoreCard(modifier = Modifier.padding(horizontal = 16.dp)) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(cardBg)
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("הצעות משלוח חדשות", color = onSurfaceText, fontSize = 15.sp)
                    Switch(
                        checked = notificationsEnabled,
                        onCheckedChange = {
                            notificationsEnabled = it
                            prefs.edit().putBoolean(PREF_NOTIFICATIONS, it).apply()
                        },
                        colors = SwitchDefaults.colors(
                            checkedTrackColor = BrandBlue,
                            checkedThumbColor = Color.White,
                            uncheckedTrackColor = Color(0xFF3A3A3C),
                            uncheckedThumbColor = Color.Gray
                        )
                    )
                }
            }

            Spacer(Modifier.height(16.dp))

            // App info
            Text("ℹ️  אודות", color = BrandBlue, fontWeight = FontWeight.Bold, fontSize = 13.sp, modifier = Modifier.padding(horizontal = 20.dp, vertical = 6.dp))
            MoreCard(modifier = Modifier.padding(horizontal = 16.dp)) {
                InfoRow("גרסת אפליקציה", "1.0.4", cardBg = cardBg)
                HorizontalDivider(color = separator, thickness = 0.5.dp)
                InfoRow("שרת Backend", "מחובר", valueColor = Color(0xFF34C759), cardBg = cardBg)
                HorizontalDivider(color = separator, thickness = 0.5.dp)
                InfoRow("מצב חיבור", "תקין", valueColor = Color(0xFF34C759), showDivider = false, cardBg = cardBg)
            }

            Spacer(Modifier.height(32.dp))
            Spacer(Modifier.navigationBarsPadding())
        }
    }
}

// ── Reusable card wrapper ──────────────────────────────────────────────────────
@Composable
fun MoreCard(modifier: Modifier = Modifier, content: @Composable ColumnScope.() -> Unit) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
    ) {
        Column(content = content)
    }
}

// ── Generic menu row ──────────────────────────────────────────────────────────
@Composable
fun MoreRow(
    icon: String? = null,
    label: String = "",
    onClick: () -> Unit,
    cardBg: Color,
    showDivider: Boolean = true,
    leadingContent: (@Composable () -> Unit)? = null,
    trailingContent: (@Composable () -> Unit)? = null
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(cardBg)
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 14.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        if (trailingContent != null) {
            // Custom layout: leading on left side, trailing fills right
            leadingContent?.invoke()
            Spacer(Modifier.width(12.dp))
            trailingContent()
        } else {
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                if (icon != null) {
                    Text(icon, fontSize = 16.sp)
                    Spacer(Modifier.width(12.dp))
                }
                leadingContent?.invoke()
                Text(label, color = MaterialTheme.colorScheme.onSurface, fontSize = 15.sp, fontWeight = FontWeight.Medium)
            }
            Icon(
                Icons.Default.ChevronRight,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.size(18.dp)
            )
        }
    }
}

// ── Radio row for settings sub-sheet ─────────────────────────────────────────
@Composable
fun SettingsRadioRow(
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
    cardBg: Color,
    showDivider: Boolean = true
) {
    val bgColor by animateColorAsState(
        targetValue = if (selected) BrandBlue.copy(alpha = 0.08f) else cardBg,
        animationSpec = tween(200), label = "radio_bg"
    )

    Column {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(bgColor)
                .clickable(onClick = onClick)
                .padding(horizontal = 16.dp, vertical = 14.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(label, fontSize = 15.sp, color = if (selected) BrandBlue else MaterialTheme.colorScheme.onSurface, fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal)
            if (selected) {
                Box(
                    modifier = Modifier.size(22.dp).clip(CircleShape).background(BrandBlue),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(Icons.Default.Check, null, tint = Color.Black, modifier = Modifier.size(13.dp))
                }
            } else {
                Box(modifier = Modifier.size(22.dp).clip(CircleShape).border(1.dp, Color.Gray.copy(0.4f), CircleShape))
            }
        }
        if (showDivider) HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant, thickness = 0.5.dp)
    }
}

// ── Info display row ──────────────────────────────────────────────────────────
@Composable
fun InfoRow(
    label: String,
    value: String,
    valueColor: Color = BrandBlue,
    cardBg: Color,
    showDivider: Boolean = true
) {
    Row(
        modifier = Modifier.fillMaxWidth().background(cardBg).padding(horizontal = 16.dp, vertical = 14.dp),
        horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically
    ) {
        Text(label, fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, fontSize = 14.sp, color = valueColor, fontWeight = FontWeight.SemiBold)
    }
}

// ── Keep legacy composables for backward compat ───────────────────────────────
@Composable
fun PremiumSettingsSection(
    title: String,
    modifier: Modifier = Modifier,
    content: @Composable ColumnScope.() -> Unit
) {
    Column(modifier = modifier) {
        Text(title, fontWeight = FontWeight.Black, fontSize = 13.sp, color = BrandBlue, letterSpacing = 0.5.sp, modifier = Modifier.padding(start = 4.dp, bottom = 10.dp))
        Box(
            modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(18.dp)).background(MaterialTheme.colorScheme.surface).border(0.5.dp, MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(18.dp))
        ) { Column(content = content) }
    }
}

@Composable
fun PremiumActionRow(label: String, subtitle: String? = null, icon: androidx.compose.ui.graphics.vector.ImageVector? = null, onClick: () -> Unit) {
    Row(modifier = Modifier.fillMaxWidth().clickable(onClick = onClick).padding(horizontal = 16.dp, vertical = 14.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
        Column(modifier = Modifier.weight(1f)) {
            Text(label, fontSize = 15.sp, color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.Medium)
            if (subtitle != null) Text(subtitle, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Spacer(Modifier.width(8.dp))
        Icon(Icons.Default.ChevronLeft, null, tint = BrandBlue, modifier = Modifier.size(20.dp))
    }
}

@Composable
fun PremiumInfoRow(label: String, value: String, valueColor: Color = BrandBlue, showDivider: Boolean = true) {
    Column {
        Row(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 14.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Text(label, fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(value, fontSize = 14.sp, color = valueColor, fontWeight = FontWeight.SemiBold)
        }
        if (showDivider) HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant, thickness = 0.5.dp)
    }
}

@Composable
fun PremiumRadioRow(label: String, selected: Boolean, onClick: () -> Unit, showDivider: Boolean = true) {
    val bgColor by animateColorAsState(targetValue = if (selected) BrandBlue.copy(0.08f) else Color.Transparent, animationSpec = tween(200), label = "bg")
    Column {
        Row(modifier = Modifier.fillMaxWidth().clickable(onClick = onClick).background(bgColor).padding(horizontal = 16.dp, vertical = 14.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Text(label, fontSize = 15.sp, color = if (selected) BrandBlue else MaterialTheme.colorScheme.onSurface, fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal)
            if (selected) Box(modifier = Modifier.size(22.dp).clip(CircleShape).background(BrandBlue), contentAlignment = Alignment.Center) { Icon(Icons.Default.Check, null, tint = Color(0xFF080808), modifier = Modifier.size(13.dp)) }
            else Box(modifier = Modifier.size(22.dp).clip(CircleShape).border(1.dp, Color.Gray.copy(0.4f), CircleShape))
        }
        if (showDivider) HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant, thickness = 0.5.dp)
    }
}
