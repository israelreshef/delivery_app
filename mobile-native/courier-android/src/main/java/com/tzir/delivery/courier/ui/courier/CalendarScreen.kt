package com.tzir.delivery.courier.ui.courier

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tzir.delivery.courier.ui.components.*
import kotlinx.coroutines.launch
import com.tzir.delivery.courier.ui.theme.*
import android.provider.CalendarContract
import android.content.Context
import androidx.compose.ui.platform.LocalContext
import androidx.core.content.ContextCompat
import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts

enum class WorkLogViewType { HOURS_24, WEEK, MONTH, YEAR }

data class CalendarEvent(
    val title: String,
    val startTime: Long,
    val endTime: Long,
    val source: String
)

data class ShiftEntry(
    val id: String,
    val date: String,
    val time: String,
    val status: String // upcoming, completed
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CalendarScreen(onBack: () -> Unit) {
    val context = LocalContext.current
    var selectedView by remember { mutableStateOf(WorkLogViewType.HOURS_24) }
    var externalEvents by remember { mutableStateOf<List<CalendarEvent>>(emptyList()) }
    
    val bookedSlots = remember { 
        mutableStateMapOf<Int, String>().apply {
            put(8, "איסוף - תל אביב מרכז")
            put(9, "בדרך לירושלים")
            put(10, "מסירה - רחביה")
            put(13, "איסוף - פתח תקווה")
        }
    }
    
    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (granted) {
            externalEvents = loadExternalCalendarEvents(context)
        }
    }

    LaunchedEffect(Unit) {
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.READ_CALENDAR) == PackageManager.PERMISSION_GRANTED) {
            externalEvents = loadExternalCalendarEvents(context)
        } else {
            permissionLauncher.launch(Manifest.permission.READ_CALENDAR)
        }
    }

    var selectedHour by remember { mutableStateOf<Int?>(null) }
    var locationInput by remember { mutableStateOf("") }
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            Column {
                TopAppBar(
                    title = { Text("יומן עבודה", fontWeight = FontWeight.Bold) },
                    navigationIcon = {
                        IconButton(onClick = onBack) {
                            Text("✕", fontSize = 20.sp, fontWeight = FontWeight.Bold)
                        }
                    },
                    actions = {
                        TextButton(onClick = { 
                            scope.launch { 
                                snackbarHostState.showSnackbar("מחשב אופטימיזציית מסלול...") 
                            }
                        }) {
                            Text("אופטימיזציה", color = PrimaryTurquoise, fontWeight = FontWeight.Bold)
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.Transparent, titleContentColor = MaterialTheme.colorScheme.onBackground)
                )
                
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    listOf(
                        WorkLogViewType.HOURS_24 to "24ש",
                        WorkLogViewType.WEEK     to "שבוע",
                        WorkLogViewType.MONTH    to "חודש",
                        WorkLogViewType.YEAR     to "שנה"
                    ).forEach { (type, label) ->
                        FilterChip(
                            selected = selectedView == type,
                            onClick  = { selectedView = type },
                            label    = { Text(label, fontSize = 13.sp) },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = PrimaryTurquoise.copy(alpha = 0.2f),
                                selectedLabelColor = PrimaryTurquoise
                            )
                        )
                    }
                }
            }
        },
        containerColor = Color.Transparent
    ) { padding ->
        PremiumBackground {
            Column(
                modifier = Modifier
                    .padding(padding)
                    .fillMaxSize()
        ) {
            // Summary Header
            GlassCard(
                modifier = Modifier.padding(16.dp).fillMaxWidth(),
                cornerRadius = 24.dp
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Text("היום, 18 בפברואר", fontWeight = FontWeight.Black, fontSize = 18.sp, color = TextOfficial)
                    Spacer(modifier = Modifier.height(8.dp))
                    TzirButton(
                        text = "חפש התאמה לחורים בזמן",
                        onClick = { 
                            scope.launch { 
                                snackbarHostState.showSnackbar("מחפש משלוחים מתאימים לחלונות הזמן...") 
                            }
                        },
                        modifier = Modifier.fillMaxWidth().height(48.dp)
                    )
                }
            }

            // Timeline / View Switcher
            when (selectedView) {
                WorkLogViewType.HOURS_24 -> {
                    LazyColumn(
                        modifier = Modifier.weight(1f).padding(horizontal = 16.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        items(24) { hour ->
                            // Merge booked slots and external events for this hour
                            val isBooked = bookedSlots.containsKey(hour)
                            val location = bookedSlots[hour] ?: ""
                            
                            // Check for external events in this hour
                            val hourStart = java.util.Calendar.getInstance().apply {
                                set(java.util.Calendar.HOUR_OF_DAY, hour)
                                set(java.util.Calendar.MINUTE, 0)
                            }.timeInMillis
                            val hourEnd = hourStart + 3600000
                            
                            val matchingExternal = externalEvents.filter { 
                                it.startTime < hourEnd && it.endTime > hourStart
                            }

                            val finalLocation = if (matchingExternal.isNotEmpty()) {
                                if (location.isNotBlank()) "$location | ${matchingExternal.first().title}"
                                else matchingExternal.first().title
                            } else location

                            TimelineHourItem(
                                hour = hour,
                                isBooked = isBooked || matchingExternal.isNotEmpty(),
                                location = finalLocation,
                                sourceLabel = if (matchingExternal.isNotEmpty()) matchingExternal.first().source else null,
                                onClick = { selectedHour = hour; locationInput = location }
                            )
                        }
                    }
                }
                else -> {
                    Box(modifier = Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) {
                        Text("תצוגת ${selectedView.name} בקרוב...", color = Graphite400)
                    }
                }
            }
        }
        }
        // ... (Quick Input Dialog omitted for brevity, keeping same)

        // Quick Input Dialog
        if (selectedHour != null) {
            AlertDialog(
                onDismissRequest = { selectedHour = null },
                title = { Text("קבע מיקום ל-${selectedHour}:00") },
                text = {
                    TextField(
                        value = locationInput,
                        onValueChange = { locationInput = it },
                        placeholder = { Text("הזן מידע (למשל: תל אביב)") },
                        modifier = Modifier.fillMaxWidth()
                    )
                },
                confirmButton = {
                    Button(onClick = {
                        if (locationInput.isNotBlank()) {
                            bookedSlots[selectedHour!!] = locationInput
                        } else {
                            bookedSlots.remove(selectedHour!!)
                        }
                        selectedHour = null
                    }) { Text("שמור") }
                },
                dismissButton = {
                    TextButton(onClick = { selectedHour = null }) { Text("ביטול") }
                }
            )
        }
    }
}

@Composable
fun TimelineHourItem(hour: Int, isBooked: Boolean, location: String, sourceLabel: String? = null, onClick: () -> Unit) {
    val displayHour = if (hour < 10) "0$hour:00" else "$hour:00"
    
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .height(80.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(
            modifier = Modifier.width(60.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(displayHour, fontWeight = FontWeight.Bold, color = Color.Gray, fontSize = 12.sp)
            Box(modifier = Modifier.width(2.dp).weight(1f).background(Color.LightGray.copy(alpha = 0.3f)))
        }
        
        Card(
            onClick = onClick,
            modifier = Modifier.weight(1f).fillMaxHeight().padding(vertical = 4.dp),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(
                containerColor = if (isBooked) (if (sourceLabel != null) PrimaryTurquoise.copy(alpha = 0.7f) else PrimaryTurquoise) else AppleWhite
            )
        ) {
            Box(modifier = Modifier.fillMaxSize().padding(12.dp), contentAlignment = Alignment.CenterStart) {
                if (isBooked) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Surface(color = AppleWhite.copy(alpha = 0.2f), shape = CircleShape, modifier = Modifier.size(24.dp)) {
                            Box(contentAlignment = Alignment.Center) { Text(if (sourceLabel != null) "📅" else "📍", fontSize = 12.sp) }
                        }
                        Spacer(modifier = Modifier.width(12.dp))
                        Column {
                            Text(location, color = AppleWhite, fontWeight = FontWeight.Bold)
                            if (sourceLabel != null) {
                                Text(sourceLabel, color = AppleWhite.copy(alpha = 0.7f), fontSize = 10.sp)
                            }
                        }
                    }
                } else {
                    Text("לחץ להוסיף פעילות / מיקום", color = TextGray.copy(alpha = 0.5f), fontSize = 13.sp)
                }
            }
        }
    }
}

fun loadExternalCalendarEvents(context: Context): List<CalendarEvent> {
    val events = mutableListOf<CalendarEvent>()
    val contentResolver = context.contentResolver
    val uri = CalendarContract.Events.CONTENT_URI
    
    val now = System.currentTimeMillis()
    val endOfDay = java.util.Calendar.getInstance().apply {
        set(java.util.Calendar.HOUR_OF_DAY, 23)
        set(java.util.Calendar.MINUTE, 59)
    }.timeInMillis

    val projection = arrayOf(
        CalendarContract.Events.TITLE,
        CalendarContract.Events.DTSTART,
        CalendarContract.Events.DTEND
    )

    val selection = "(${CalendarContract.Events.DTSTART} >= ?) AND (${CalendarContract.Events.DTSTART} <= ?)"
    val selectionArgs = arrayOf(now.toString(), endOfDay.toString())

    try {
        contentResolver.query(uri, projection, selection, selectionArgs, null)?.use { cursor ->
            val titleIdx = cursor.getColumnIndex(CalendarContract.Events.TITLE)
            val startIdx = cursor.getColumnIndex(CalendarContract.Events.DTSTART)
            val endIdx = cursor.getColumnIndex(CalendarContract.Events.DTEND)

            while (cursor.moveToNext()) {
                events.add(
                    CalendarEvent(
                        title = cursor.getString(titleIdx),
                        startTime = cursor.getLong(startIdx),
                        endTime = cursor.getLong(endIdx),
                        source = "Google Calendar"
                    )
                )
            }
        }
    } catch (e: Exception) {
        e.printStackTrace()
    }
    return events
}
