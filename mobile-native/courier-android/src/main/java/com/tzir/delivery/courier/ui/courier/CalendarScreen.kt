package com.tzir.delivery.courier.ui.courier

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.provider.CalendarContract
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import com.tzir.delivery.courier.repository.CalendarRepository
import com.tzir.delivery.courier.ui.components.*
import com.tzir.delivery.courier.ui.theme.*
import com.tzir.delivery.courier.util.PricingCalculator
import kotlinx.coroutines.launch
import java.util.*

// ─── View modes ───────────────────────────────────────────────────────────────
enum class CalendarViewMode { DAY, WEEK, MONTH, YEAR }

// ─── Simple delivery entry for the calendar ───────────────────────────────────
data class CalendarDelivery(
    val id: Int,
    val address: String,
    val pickupAddress: String = "",
    val dropoffAddress: String = "",
    val hour: Int,
    val minute: Int = 0,
    val durationMin: Int = 45,
    val status: String = "completed"
) 

// ─── Main CalendarScreen ──────────────────────────────────────────────────────
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CalendarScreen(
    onBack: () -> Unit,
    calendarRepository: CalendarRepository? = null
) {
    val context = LocalContext.current
    var viewMode by remember { mutableStateOf(CalendarViewMode.MONTH) }
    val deliveries by (calendarRepository?.deliveries?.collectAsState() ?: remember { mutableStateOf(emptyMap<Int, List<CalendarDelivery>>()) })
    val today = remember { Calendar.getInstance() }

    LaunchedEffect(Unit) {
        calendarRepository?.refresh()
        val prefs = context.getSharedPreferences("TzirCalendar", Context.MODE_PRIVATE)
        val plannedJson = prefs.getString("planned_routes_today", null)
        if (plannedJson != null) {
            try {
                val jsonArr = org.json.JSONArray(plannedJson)
                val todStops = mutableListOf<CalendarDelivery>()
                for (i in 0 until jsonArr.length()) {
                    val obj = jsonArr.getJSONObject(i)
                    todStops.add(CalendarDelivery(
                        id = obj.getInt("id"),
                        address = obj.getString("address"),
                        hour = obj.getInt("hour"),
                        minute = obj.getInt("minute"),
                        durationMin = obj.getInt("durationMin"),
                        status = obj.getString("status")
                    ))
                }
                if (todStops.isNotEmpty()) {
                    calendarRepository?.setDayDeliveries(today.get(Calendar.DAY_OF_MONTH), todStops)
                }
            } catch (e: Exception) {
                android.util.Log.e("CalendarScreen", "Error loading local plans", e)
            }
        }
    }

    var selectedDay by remember { mutableStateOf(today.get(Calendar.DAY_OF_MONTH)) }
    var currentMonth by remember { mutableStateOf(today.get(Calendar.MONTH)) } // 0-based
    var currentYear by remember { mutableStateOf(today.get(Calendar.YEAR)) }

    LaunchedEffect(currentMonth, currentYear) {
        calendarRepository?.refresh(
            year = currentYear,
            month = currentMonth + 1
        )
    }

    var calendarSynced by remember { mutableStateOf(false) }
    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted -> if (granted) calendarSynced = true }

    val darkBg = MaterialTheme.colorScheme.background
    val cardBg = MaterialTheme.colorScheme.surface
    val separator = MaterialTheme.colorScheme.outlineVariant

    val monthNames = listOf("ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר")
    val dayLetters  = listOf("א","ב","ג","ד","ה","ו","ש") // Sun–Sat

    Box(modifier = Modifier.fillMaxSize().background(darkBg)) {
        Column(modifier = Modifier.fillMaxSize()) {

            Spacer(Modifier.statusBarsPadding())

            // ── Top bar ────────────────────────────────────────────────────
            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Month / year navigation
                IconButton(onClick = {
                    if (currentMonth == 0) { currentMonth = 11; currentYear-- }
                    else currentMonth--
                }) {
                    Icon(Icons.Default.ChevronLeft, null, tint = MaterialTheme.colorScheme.onBackground, modifier = Modifier.size(22.dp))
                }

                Text(
                    "${monthNames[currentMonth]} $currentYear",
                    color = MaterialTheme.colorScheme.onBackground,
                    fontWeight = FontWeight.Black,
                    fontSize = 20.sp,
                    modifier = Modifier.weight(1f),
                    textAlign = TextAlign.Center
                )

                IconButton(onClick = {
                    if (currentMonth == 11) { currentMonth = 0; currentYear++ }
                    else currentMonth++
                }) {
                    Icon(Icons.Default.ChevronRight, null, tint = MaterialTheme.colorScheme.onBackground, modifier = Modifier.size(22.dp))
                }

                // Sync button
                IconButton(onClick = {
                    val hasPerm = ContextCompat.checkSelfPermission(context, Manifest.permission.READ_CALENDAR) == PackageManager.PERMISSION_GRANTED
                    if (hasPerm) calendarSynced = true
                    else permissionLauncher.launch(Manifest.permission.READ_CALENDAR)
                }) {
                    Icon(
                        if (calendarSynced) Icons.Default.Sync else Icons.Default.CalendarMonth,
                        null,
                        tint = if (calendarSynced) Color(0xFF34C759) else BrandBlue,
                        modifier = Modifier.size(22.dp)
                    )
                }
            }

            // ── View mode tabs ─────────────────────────────────────────────
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 4.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(cardBg),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                listOf(
                    CalendarViewMode.YEAR  to "שנה",
                    CalendarViewMode.MONTH to "חודש",
                    CalendarViewMode.WEEK  to "שבוע",
                    CalendarViewMode.DAY   to "יום"
                ).forEach { (mode, label) ->
                    val selected = viewMode == mode
                    val bg by animateColorAsState(
                        if (selected) BrandBlue else Color.Transparent,
                        animationSpec = tween(200), label = "tab_$label"
                    )
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .padding(4.dp)
                            .clip(RoundedCornerShape(10.dp))
                            .background(bg)
                            .clickable { viewMode = mode }
                            .padding(vertical = 10.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            label,
                            color = if (selected) Color.Black else MaterialTheme.colorScheme.onSurfaceVariant,
                            fontWeight = if (selected) FontWeight.Black else FontWeight.Normal,
                            fontSize = 14.sp
                        )
                    }
                }
            }

            Spacer(Modifier.height(12.dp))

            // ── Main content by mode ───────────────────────────────────────
            when (viewMode) {
                CalendarViewMode.MONTH -> MonthView(
                    year = currentYear, month = currentMonth,
                    deliveries = deliveries, today = today,
                    selectedDay = selectedDay,
                    onDayClick = { selectedDay = it },
                    cardBg = cardBg, separator = separator, dayLetters = dayLetters
                )
                CalendarViewMode.WEEK -> WeekView(
                    year = currentYear, month = currentMonth,
                    deliveries = deliveries, today = today,
                    selectedDay = selectedDay,
                    onDayClick = { selectedDay = it },
                    cardBg = cardBg, separator = separator, dayLetters = dayLetters,
                    monthNames = monthNames
                )
                CalendarViewMode.DAY -> DayView(
                    day = selectedDay, month = currentMonth, year = currentYear,
                    deliveries = deliveries[selectedDay] ?: emptyList(),
                    calendarRepository = calendarRepository,
                    cardBg = cardBg, separator = separator, monthNames = monthNames
                )
                CalendarViewMode.YEAR -> YearView(
                    year = currentYear, deliveries = deliveries, today = today,
                    onMonthClick = { m ->
                        currentMonth = m
                        viewMode = CalendarViewMode.MONTH
                    },
                    cardBg = cardBg, dayLetters = dayLetters, monthNames = monthNames
                )
            }
        }
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// MONTH VIEW
// ──────────────────────────────────────────────────────────────────────────────
@Composable
fun MonthView(
    year: Int, month: Int,
    deliveries: Map<Int, List<CalendarDelivery>>,
    today: Calendar,
    selectedDay: Int,
    onDayClick: (Int) -> Unit,
    cardBg: Color, separator: Color, dayLetters: List<String>
) {
    val cal = Calendar.getInstance().apply { set(year, month, 1) }
    val daysInMonth = cal.getActualMaximum(Calendar.DAY_OF_MONTH)
    // Sunday=1 → offset 0, so shift to put Sunday first
    val firstDow = (cal.get(Calendar.DAY_OF_WEEK) - 1) // 0=Sun

    val todayDay = if (today.get(Calendar.MONTH) == month && today.get(Calendar.YEAR) == year)
        today.get(Calendar.DAY_OF_MONTH) else -1

    LazyColumn(modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp)) {
        item {
            // Calendar grid card
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(20.dp))
                    .background(cardBg)
                    .padding(16.dp)
            ) {
                Column {
                    // Day-of-week header (RTL: ש ו ה ד ג ב א)
                    Row(modifier = Modifier.fillMaxWidth()) {
                        listOf("ש","ו","ה","ד","ג","ב","א").forEach { d ->
                            Text(d, modifier = Modifier.weight(1f), textAlign = TextAlign.Center,
                                color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                    Spacer(Modifier.height(8.dp))

                    // Grid cells
                    var day = 1
                    // In RTL, offset means empty cells at the END (left side)
                    val rtlOffset = (7 - firstDow) % 7

                    val totalCells = rtlOffset + daysInMonth
                    val rows = (totalCells + 6) / 7

                    repeat(rows) { row ->
                        Row(modifier = Modifier.fillMaxWidth()) {
                            repeat(7) { col ->
                                val cellIndex = row * 7 + col
                                val d = cellIndex - rtlOffset + 1
                                if (d in 1..daysInMonth) {
                                    val hasWork = deliveries.containsKey(d)
                                    val isToday = d == todayDay
                                    val isSelected = d == selectedDay
                                    Box(
                                        modifier = Modifier
                                            .weight(1f)
                                            .aspectRatio(1f)
                                            .padding(2.dp)
                                            .clip(CircleShape)
                                            .background(
                                                when {
                                                    isSelected && hasWork -> BrandBlue
                                                    isToday -> Color.White
                                                    hasWork -> BrandBlue.copy(alpha = 0.25f)
                                                    else -> Color.Transparent
                                                }
                                            )
                                            .border(
                                                width = if (isSelected && !hasWork) 1.5.dp else 0.dp,
                                                color = if (isSelected) BrandBlue else Color.Transparent,
                                                shape = CircleShape
                                            )
                                            .clickable { onDayClick(d) },
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Text(
                                            "$d",
                                            color = when {
                                                isSelected && hasWork -> Color.Black
                                                isToday -> Color.Black
                                                hasWork -> BrandBlue
                                                else -> MaterialTheme.colorScheme.onSurfaceVariant
                                            },
                                            fontSize = 13.sp,
                                            fontWeight = if (isToday || isSelected) FontWeight.Black else FontWeight.Normal
                                        )
                                    }
                                } else {
                                    Box(modifier = Modifier.weight(1f).aspectRatio(1f))
                                }
                            }
                        }
                    }
                }
            }

            Spacer(Modifier.height(20.dp))

            // Selected day deliveries
            val dayDeliveries = deliveries[selectedDay] ?: emptyList()
            if (dayDeliveries.isNotEmpty()) {
                Text("משלוחים ב-$selectedDay", color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                Spacer(Modifier.height(10.dp))
                dayDeliveries.forEach { delivery ->
                    DeliveryListCard(delivery = delivery, separator = separator)
                    Spacer(Modifier.height(8.dp))
                }
            } else {
                Box(
                    modifier = Modifier.fillMaxWidth().padding(vertical = 24.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text("אין משלוחים ביום זה", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 14.sp)
                }
            }
            Spacer(Modifier.navigationBarsPadding())
        }
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// WEEK VIEW
// ──────────────────────────────────────────────────────────────────────────────
@Composable
fun WeekView(
    year: Int, month: Int,
    deliveries: Map<Int, List<CalendarDelivery>>,
    today: Calendar,
    selectedDay: Int,
    onDayClick: (Int) -> Unit,
    cardBg: Color, separator: Color,
    dayLetters: List<String>, monthNames: List<String>
) {
    // Find the week containing selectedDay
    val cal = Calendar.getInstance().apply { set(year, month, selectedDay) }
    val dowSunday = cal.get(Calendar.DAY_OF_WEEK) - 1 // 0=Sun
    val weekStart = Calendar.getInstance().apply {
        set(year, month, selectedDay)
        add(Calendar.DAY_OF_MONTH, -dowSunday)
    }

    val daysInMonth = Calendar.getInstance().apply { set(year, month, 1) }.getActualMaximum(Calendar.DAY_OF_MONTH)
    val todayDay = if (today.get(Calendar.MONTH) == month && today.get(Calendar.YEAR) == year)
        today.get(Calendar.DAY_OF_MONTH) else -1

    // Build 7 day slots (Sun→Sat) then display RTL (Sat first)
    val weekDays = (0..6).map { offset ->
        val c = Calendar.getInstance().apply {
            timeInMillis = weekStart.timeInMillis
            add(Calendar.DAY_OF_MONTH, offset)
        }
        Triple(c.get(Calendar.DAY_OF_MONTH), c.get(Calendar.MONTH), c.get(Calendar.DAY_OF_WEEK) - 1)
    }
    // RTL: show Sat(6) to Sun(0)
    val rtlWeekDays = weekDays.reversed()

    val selectedDayDeliveries = deliveries[selectedDay] ?: emptyList()

    LazyColumn(modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp)) {
        item {
            // Week strip card (compact)
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp))
                    .background(cardBg)
                    .padding(horizontal = 12.dp, vertical = 10.dp)
            ) {
                Row(modifier = Modifier.fillMaxWidth()) {
                    rtlWeekDays.forEach { (day, m, dowIdx) ->
                        val hasWork = deliveries.containsKey(day) && m == month
                        val isToday = day == todayDay && m == month
                        val isSelected = day == selectedDay && m == month
                        Column(
                            modifier = Modifier
                                .weight(1f)
                                .clickable { if (m == month && day in 1..daysInMonth) onDayClick(day) },
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            // Day letter (ש ו ה ד ג ב א)
                            val hebrewLetters = listOf("ש","ו","ה","ד","ג","ב","א")
                            Text(hebrewLetters[dowIdx], color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 10.sp)
                            Spacer(Modifier.height(4.dp))
                            // Day number circle
                            Box(
                                modifier = Modifier
                                    .size(32.dp)
                                    .clip(CircleShape)
                                    .background(
                                        when {
                                            isSelected && hasWork -> BrandBlue
                                            isToday -> Color.White
                                            hasWork -> BrandBlue.copy(alpha = 0.2f)
                                            else -> Color.Transparent
                                        }
                                    )
                                    .border(
                                        width = if (isSelected && !hasWork) 1.5.dp else 0.dp,
                                        color = if (isSelected) BrandBlue else Color.Transparent,
                                        shape = CircleShape
                                    ),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    if (m == month) "$day" else "",
                                    color = when {
                                        isSelected && hasWork -> Color.Black
                                        isToday -> Color.Black
                                        hasWork -> BrandBlue
                                        else -> MaterialTheme.colorScheme.onSurfaceVariant
                                    },
                                    fontSize = 13.sp,
                                    fontWeight = if (isToday || isSelected) FontWeight.Black else FontWeight.Normal
                                )
                            }
                            // Work dot
                            if (hasWork && m == month) {
                                Spacer(Modifier.height(3.dp))
                                Box(modifier = Modifier.size(4.dp).clip(CircleShape).background(BrandBlue))
                            } else {
                                Spacer(Modifier.height(7.dp))
                            }
                        }
                    }
                }
            }

            Spacer(Modifier.height(16.dp))

            // Selected day header
            val hebrewDayNames = listOf("ראשון","שני","שלישי","רביעי","חמישי","שישי","שבת")
            val selCal = Calendar.getInstance().apply { set(year, month, selectedDay) }
            val selDow = selCal.get(Calendar.DAY_OF_WEEK) - 1
            Text(
                "יום ${hebrewDayNames[selDow]}, $selectedDay ב${monthNames[month]}",
                color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.Bold, fontSize = 16.sp
            )
            Spacer(Modifier.height(10.dp))

            if (selectedDayDeliveries.isNotEmpty()) {
                selectedDayDeliveries.forEach { delivery ->
                    DeliveryListCard(delivery = delivery, separator = separator)
                    Spacer(Modifier.height(8.dp))
                }
            } else {
                Box(modifier = Modifier.fillMaxWidth().padding(vertical = 20.dp), contentAlignment = Alignment.Center) {
                    Text("אין משלוחים ביום זה", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 14.sp)
                }
            }
            Spacer(Modifier.navigationBarsPadding())
        }
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// DAY VIEW
// ──────────────────────────────────────────────────────────────────────────────
@Composable
fun DayView(
    day: Int, month: Int, year: Int,
    deliveries: List<CalendarDelivery>,
    calendarRepository: CalendarRepository? = null,
    cardBg: Color, separator: Color, monthNames: List<String>
) {
    val totalDeliveries = deliveries.size
    val totalEarnings = deliveries.sumOf {
        PricingCalculator.estimateEarnings(
            distanceKm = 5.0, weightKg = 2.0, waitMinutes = 5.0, hour = it.hour
        )
    }.toInt()
    val totalMinutes = deliveries.sumOf { it.durationMin }

    val scope = rememberCoroutineScope()
    var editingHour by remember { mutableStateOf<Int?>(null) }

    Column(modifier = Modifier.fillMaxSize()) {
        // Stats strip
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            StatChip("$totalDeliveries משלוחים", BrandBlue, Modifier.weight(1f))
            StatChip("₪$totalEarnings", Color(0xFF34C759), Modifier.weight(1f))
            StatChip("${totalMinutes / 60}ש ${totalMinutes % 60}ד", Color(0xFF60A5FA), Modifier.weight(1f))
        }

        Spacer(Modifier.height(12.dp))

        // Timeline
        LazyColumn(
            modifier = Modifier.weight(1f).padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(0.dp)
        ) {
            items((7..19).toList()) { hour ->
                val delivery = deliveries.find { it.hour == hour }
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(if (delivery != null) 72.dp else 40.dp)
                        .clickable { editingHour = hour },
                    verticalAlignment = Alignment.Top
                ) {
                    // Hour label
                    Text(
                        "${hour.toString().padStart(2,'0')}:00",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        fontSize = 11.sp,
                        modifier = Modifier.width(44.dp).padding(top = 6.dp),
                        textAlign = TextAlign.End
                    )
                    Spacer(Modifier.width(10.dp))
                    // Timeline line + block
                    Column(modifier = Modifier.weight(1f)) {
                        HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant, thickness = 0.5.dp)
                        if (delivery != null) {
                            Spacer(Modifier.height(3.dp))
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(60.dp)
                                    .clip(RoundedCornerShape(10.dp))
                                    .background(BrandBlue.copy(alpha = 0.12f))
                                    .border(1.dp, BrandBlue.copy(alpha = 0.4f), RoundedCornerShape(10.dp))
                                    .padding(horizontal = 12.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Box(
                                    modifier = Modifier.width(3.dp).fillMaxHeight(0.7f)
                                        .clip(RoundedCornerShape(2.dp)).background(BrandBlue)
                                )
                                Spacer(Modifier.width(10.dp))
                                Column {
                                    val displayAddress = delivery.dropoffAddress.ifBlank { delivery.address }
                                    Text("🚚  $displayAddress", color = MaterialTheme.colorScheme.onSurface, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, maxLines = 1)
                                    Text(
                                        "${hour.toString().padStart(2,'0')}:00 — ${delivery.durationMin} דק'",
                                        color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp
                                    )
                                }
                            }
                        }
                    }
                }
            }
            item { Spacer(Modifier.navigationBarsPadding().height(16.dp)) }
        }
    }

    editingHour?.let { hour ->
        AddScheduleDialog(
            title = "הוספת משלוח בשעה ${hour.toString().padStart(2, '0')}:00",
            onDismiss = { editingHour = null },
            onConfirm = { entryTitle, pickup, dropoff, endTime ->
                val dateStr = "%04d-%02d-%02d".format(year, month + 1, day)
                val startStr = "${hour.toString().padStart(2, '0')}:00"
                scope.launch {
                    calendarRepository?.createScheduleEntry(
                        title = entryTitle,
                        date = dateStr,
                        start = startStr,
                        end = endTime,
                        pickupAddress = pickup,
                        dropoffAddress = dropoff,
                    )
                }
                editingHour = null
            }
        )
    }
}

@Composable
private fun AddScheduleDialog(
    title: String,
    onDismiss: () -> Unit,
    onConfirm: (title: String, pickup: String, dropoff: String, end: String?) -> Unit
) {
    var entryTitle by remember { mutableStateOf("") }
    var pickup by remember { mutableStateOf("") }
    var dropoff by remember { mutableStateOf("") }
    var endTime by remember { mutableStateOf("") }
    var error by remember { mutableStateOf(false) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(title, color = MaterialTheme.colorScheme.onSurface) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(
                    value = entryTitle,
                    onValueChange = { entryTitle = it; error = false },
                    label = { Text("כותרת") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(
                    value = pickup,
                    onValueChange = { pickup = it },
                    label = { Text("כתובת איסוף") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(
                    value = dropoff,
                    onValueChange = { dropoff = it },
                    label = { Text("כתובת יעד") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(
                    value = endTime,
                    onValueChange = { endTime = it },
                    label = { Text("שעת סיום (HH:MM)") },
                    placeholder = { Text("אופציונלי") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                if (error) {
                    Text("נדרשת כותרת", color = Color(0xFFFF6B6B), fontSize = 12.sp)
                }
            }
        },
        confirmButton = {
            TextButton(onClick = {
                if (entryTitle.isBlank()) {
                    error = true
                } else {
                    onConfirm(entryTitle.trim(), pickup.trim(), dropoff.trim(), endTime.trim().ifBlank { null })
                }
            }) {
                Text("שמירה", color = BrandBlue)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("ביטול", color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        },
        containerColor = MaterialTheme.colorScheme.surface,
        titleContentColor = MaterialTheme.colorScheme.onSurface,
        textContentColor = MaterialTheme.colorScheme.onSurface
    )
}

// ──────────────────────────────────────────────────────────────────────────────
// YEAR VIEW
// ──────────────────────────────────────────────────────────────────────────────
@Composable
fun YearView(
    year: Int,
    deliveries: Map<Int, List<CalendarDelivery>>,
    today: Calendar,
    onMonthClick: (Int) -> Unit,
    cardBg: Color, dayLetters: List<String>, monthNames: List<String>
) {
    val totalDeliveries = deliveries.values.sumOf { it.size }
    val totalEarnings = deliveries.values.flatten().sumOf {
        PricingCalculator.estimateEarnings(
            distanceKm = 5.0, weightKg = 2.0, waitMinutes = 5.0, hour = it.hour
        )
    }.toInt()
    val completedDeliveries = deliveries.values.flatten().count { it.status == "completed" || it.status == "delivered" }
    val completionRate = if (totalDeliveries > 0) (completedDeliveries * 100 / totalDeliveries) else 0

    LazyColumn(modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp)) {
        item {
            // Annual stats
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                StatChip("$totalDeliveries משלוחים", BrandBlue, Modifier.weight(1f))
                StatChip("₪$totalEarnings", Color(0xFF34C759), Modifier.weight(1f))
                StatChip("${completionRate}פ ביצוע", Color(0xFF60A5FA), Modifier.weight(1f))
            }
            Spacer(Modifier.height(16.dp))

            // 4x3 month grid
            val rows = (0..11).chunked(3)
            rows.forEach { monthRow ->
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    monthRow.forEach { m ->
                        val isCurrentMonth = m == today.get(Calendar.MONTH) && year == today.get(Calendar.YEAR)
                        val workDays = if (m == today.get(Calendar.MONTH)) deliveries.keys else emptySet<Int>()
                        MiniMonthCard(
                            monthName = monthNames[m],
                            year = year,
                            month = m,
                            workDays = workDays,
                            isCurrentMonth = isCurrentMonth,
                            cardBg = cardBg,
                            modifier = Modifier.weight(1f),
                            onClick = { onMonthClick(m) }
                        )
                    }
                }
                Spacer(Modifier.height(8.dp))
            }
            Spacer(Modifier.navigationBarsPadding())
        }
    }
}

@Composable
fun MiniMonthCard(
    monthName: String,
    year: Int,
    month: Int,
    workDays: Set<Int>,
    isCurrentMonth: Boolean,
    cardBg: Color,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    val cal = Calendar.getInstance().apply { set(year, month, 1) }
    val daysInMonth = cal.getActualMaximum(Calendar.DAY_OF_MONTH)
    val firstDow = cal.get(Calendar.DAY_OF_WEEK) - 1
    val rtlOffset = (7 - firstDow) % 7

    Box(
        modifier = modifier
            .clip(RoundedCornerShape(12.dp))
            .background(cardBg)
            .border(
                width = if (isCurrentMonth) 1.5.dp else 0.dp,
                color = if (isCurrentMonth) BrandBlue else Color.Transparent,
                shape = RoundedCornerShape(12.dp)
            )
            .clickable { onClick() }
            .padding(8.dp)
    ) {
        Column {
            Text(monthName, color = if (isCurrentMonth) BrandBlue else MaterialTheme.colorScheme.onSurface,
                fontSize = 11.sp, fontWeight = FontWeight.Bold,
                modifier = Modifier.fillMaxWidth(), textAlign = TextAlign.Center)
            Spacer(Modifier.height(4.dp))
            // Mini grid
            val totalCells = rtlOffset + daysInMonth
            val rows = (totalCells + 6) / 7
            repeat(rows) { row ->
                Row(modifier = Modifier.fillMaxWidth()) {
                    repeat(7) { col ->
                        val d = row * 7 + col - rtlOffset + 1
                        val hasWork = d in workDays && d in 1..daysInMonth
                        Box(
                            modifier = Modifier.weight(1f).aspectRatio(1f),
                            contentAlignment = Alignment.Center
                        ) {
                            if (d in 1..daysInMonth) {
                                if (hasWork) {
                                    Box(
                                        modifier = Modifier.size(5.dp).clip(CircleShape)
                                            .background(BrandBlue)
                                    )
                                } else {
                                    Box(modifier = Modifier.size(3.dp).clip(CircleShape)
                                        .background(MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.3f)))
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

// ─── Shared components ────────────────────────────────────────────────────────
@Composable
fun DeliveryListCard(delivery: CalendarDelivery, separator: Color) {
    val timeStr = "${delivery.hour.toString().padStart(2,'0')}:${delivery.minute.toString().padStart(2,'0')}"
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(MaterialTheme.colorScheme.surface)
            .border(1.dp, MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(12.dp))
    ) {
        // BrandBlue left accent bar
        Box(modifier = Modifier.width(4.dp).fillMaxHeight().background(BrandBlue))
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text("🚚  ${delivery.address}", color = MaterialTheme.colorScheme.onSurface, fontSize = 14.sp, fontWeight = FontWeight.Medium, maxLines = 1)
                Text(timeStr, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
            }
            Box(
                modifier = Modifier.size(8.dp).clip(CircleShape)
                    .background(if (delivery.status == "completed") Color(0xFF34C759) else BrandBlue)
            )
        }
    }
}

@Composable
fun StatChip(text: String, color: Color, modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(10.dp))
            .background(color.copy(alpha = 0.12f))
            .padding(vertical = 10.dp),
        contentAlignment = Alignment.Center
    ) {
        Text(text, color = color, fontSize = 12.sp, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center)
    }
}
