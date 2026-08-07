package com.tzir.delivery.courier.ui.courier

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tzir.delivery.courier.model.CourierVehicle
import com.tzir.delivery.courier.repository.VehicleRepository
import com.tzir.delivery.courier.ui.components.*
import com.tzir.delivery.courier.ui.theme.*
import kotlinx.coroutines.launch
import kotlinx.datetime.*
import java.util.regex.Pattern

// ─── Vehicle type mapping (API uses English enum, UI shows Hebrew) ───
private val TYPE_LABELS = mapOf(
    "motorcycle" to "אופנוע", "scooter" to "קטנוע", "car" to "מכונית",
    "bicycle" to "אופניים", "van" to "ואן"
)
private val TYPE_EMOJI = mapOf(
    "motorcycle" to "\uD83C\uDFCD️", "scooter" to "\uD83D\uDEF5", "car" to "\uD83D\uDE97",
    "bicycle" to "\uD83D\uDEB2", "van" to "\uD83D\uDE90"
)

// Allowed Israeli license plate: 7-8 chars, e.g. 123-45-678
private val PLATE_PATTERN = Pattern.compile("^\\d{1,2}-?\\d{2,3}-?\\d{3,4}$")

fun daysUntil(date: LocalDate?): Int {
    if (date == null) return 999
    val now = Clock.System.now().toLocalDateTime(TimeZone.currentSystemDefault()).date
    return date.toEpochDays() - now.toEpochDays()
}

// Convert "DD/MM/YYYY" (user input) to ISO "YYYY-MM-DD" for the API (null if invalid)
fun toIsoDate(input: String): String? {
    val trimmed = input.trim()
    if (trimmed.isBlank()) return null
    val parts = trimmed.split("/")
    if (parts.size != 3) return null
    return try {
        val (d, m, y) = Triple(parts[0].toInt(), parts[1].toInt(), parts[2].toInt())
        LocalDate(y, m, d).toString() // serializes as ISO
    } catch (e: Exception) { null }
}

fun validatePlate(plate: String): String? {
    if (plate.isBlank()) return "יש להזין מספר רישוי"
    if (!PLATE_PATTERN.matcher(plate).matches()) return "מספר רישוי לא תקין (למשל 123-45-678)"
    return null
}

fun validateExpiry(input: String, label: String): String? {
    if (input.isBlank()) return null
    val iso = toIsoDate(input) ?: return "תאריך לא תקין (DD/MM/YYYY)"
    val date = LocalDate.parse(iso)
    val now = Clock.System.now().toLocalDateTime(TimeZone.currentSystemDefault()).date
    if (date < now) return "$label פג תוקף!"
    if (date > now.plus(365 * 5, DateTimeUnit.DAY)) return "$label רחוק מדי"
    return null
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun VehicleScreen(onBack: () -> Unit, vehicleRepository: VehicleRepository? = null) {
    val vehicles by (vehicleRepository?.vehicles?.collectAsState() ?: remember { mutableStateOf(emptyList()) })
    val isOffline by (vehicleRepository?.isOffline?.collectAsState() ?: remember { mutableStateOf(false) })
    val scope = rememberCoroutineScope()

    var showAddDialog by remember { mutableStateOf(false) }
    var expandedId by remember { mutableStateOf<Int?>(null) }

    LaunchedEffect(Unit) {
        vehicleRepository?.refresh()
    }

    PremiumBackground {
        Scaffold(
            topBar = {
                CenterAlignedTopAppBar(
                    title = { Text("ניהול כלי רכב", fontWeight = FontWeight.Black, color = BrandBlue) },
                    navigationIcon = {
                        IconButton(onClick = onBack) {
                            Icon(Icons.Default.ArrowBack, contentDescription = "חזור", tint = BrandBlue)
                        }
                    },
                    colors = TopAppBarDefaults.centerAlignedTopAppBarColors(containerColor = Color.Transparent)
                )
            },
            floatingActionButton = {
                FloatingActionButton(
                    onClick = { showAddDialog = true },
                    containerColor = BrandBlue,
                    contentColor = Graphite950,
                    shape = RoundedCornerShape(16.dp),
                    elevation = FloatingActionButtonDefaults.elevation(defaultElevation = 8.dp)
                ) {
                    Icon(Icons.Default.Add, contentDescription = "הוסף רכב")
                }
            },
            containerColor = Color.Transparent
        ) { padding ->
            Column(modifier = Modifier.padding(padding).fillMaxSize()) {
                if (isOffline && vehicles.isNotEmpty()) {
                    Text(
                        "מצב לא מקוון — מציג נתונים שמורים",
                        color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp,
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp)
                    )
                }

                LazyColumn(
                    modifier = Modifier.fillMaxSize().weight(1f),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    val urgentAlerts = vehicles.filter { v ->
                        daysUntil(v.insuranceExpiry) <= 30 || daysUntil(v.testExpiry) <= 30
                    }
                    if (urgentAlerts.isNotEmpty()) {
                        item {
                            GlassCard(modifier = Modifier.fillMaxWidth()) {
                                Column(modifier = Modifier.padding(16.dp)) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Text("⚠️", fontSize = 18.sp)
                                        Spacer(Modifier.width(8.dp))
                                        Text("התראות פקיעה", fontWeight = FontWeight.Black, fontSize = 16.sp, color = BrandBlue)
                                    }
                                    Spacer(Modifier.height(12.dp))
                                    urgentAlerts.forEach { v ->
                                        val insDays = daysUntil(v.insuranceExpiry)
                                        val testDays = daysUntil(v.testExpiry)
                                        if (insDays <= 30) AlertRow("ביטוח ${v.plate}", "פג בעוד $insDays ימים", insDays <= 7)
                                        if (testDays <= 30) AlertRow("טסט ${v.plate}", "פג בעוד $testDays ימים", testDays <= 7)
                                    }
                                }
                            }
                        }
                    }

                    if (vehicles.isEmpty()) {
                        item {
                            Box(modifier = Modifier.fillMaxWidth().padding(top = 48.dp), contentAlignment = Alignment.Center) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Icon(Icons.Default.DirectionsCar, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(64.dp))
                                    Spacer(Modifier.height(12.dp))
                                    Text("אין רכבים רשומים", color = MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = FontWeight.Bold)
                                    Text("הוסף רכב עם כפתור ה+ למטה", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                            }
                        }
                    }

                    items(vehicles, key = { it.id }) { vehicle ->
                        VehiclePremiumCard(
                            vehicle = vehicle,
                            expanded = expandedId == vehicle.id,
                            onExpand = { expandedId = if (expandedId == vehicle.id) null else vehicle.id },
                            onSetPrimary = { scope.launch { vehicleRepository?.setPrimary(vehicle.id) } },
                            onDelete = { scope.launch { vehicleRepository?.deleteVehicle(vehicle.id) } }
                        )
                    }

                    item { Spacer(Modifier.height(80.dp)) }
                }
            }
        }
    }

    if (showAddDialog) {
        AddVehicleDialog(
            onDismiss = { showAddDialog = false },
            onSave = { plate, type, insExp, testExp, storage ->
                scope.launch {
                    vehicleRepository?.addVehicle(
                        plate = plate, type = type,
                        insuranceExpiry = toIsoDate(insExp),
                        testExpiry = toIsoDate(testExp),
                        storageTypes = storage
                    )
                }
                showAddDialog = false
            }
        )
    }
}

@Composable
fun AlertRow(label: String, msg: String, critical: Boolean) {
    Row(modifier = Modifier.padding(vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
        Box(modifier = Modifier.size(6.dp).background(if (critical) Color.Red else BrandBlue, CircleShape))
        Spacer(Modifier.width(10.dp))
        Column {
            Text(label, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurface)
            Text(msg, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
fun VehiclePremiumCard(vehicle: CourierVehicle, expanded: Boolean, onExpand: () -> Unit, onSetPrimary: () -> Unit, onDelete: () -> Unit) {
    val insDays = daysUntil(vehicle.insuranceExpiry)
    val testDays = daysUntil(vehicle.testExpiry)
    val hasAlert = insDays <= 30 || testDays <= 30
    val emoji = TYPE_EMOJI[vehicle.type] ?: "🚗"
    val typeLabel = TYPE_LABELS[vehicle.type] ?: vehicle.type

    GlassCard(
        modifier = Modifier.fillMaxWidth().clickable { onExpand() },
        opacity = if (vehicle.isPrimary) 0.9f else 0.7f
    ) {
        Column(modifier = Modifier.padding(20.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Surface(modifier = Modifier.size(48.dp), shape = CircleShape, color = BrandBlue.copy(alpha = 0.1f)) {
                    Box(contentAlignment = Alignment.Center) { Text(emoji, fontSize = 24.sp) }
                }
                Spacer(Modifier.width(16.dp))
                Column(Modifier.weight(1f)) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(vehicle.plate, fontWeight = FontWeight.Black, fontSize = 18.sp, color = MaterialTheme.colorScheme.onSurface)
                        if (vehicle.isPrimary) {
                            Surface(color = BrandBlue, shape = RoundedCornerShape(6.dp)) {
                                Text("ראשי", modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp), fontSize = 10.sp, fontWeight = FontWeight.Black, color = Graphite950)
                            }
                        }
                    }
                    Text(typeLabel, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Icon(if (expanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore, null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
            }

            AnimatedVisibility(visible = expanded, enter = expandVertically(), exit = shrinkVertically()) {
                Column(modifier = Modifier.padding(top = 20.dp)) {
                    HorizontalDivider(color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.1f))
                    Spacer(Modifier.height(16.dp))

                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        ExpiryBox("ביטוח", vehicle.insuranceExpiry?.toString() ?: "—", insDays, Modifier.weight(1f))
                        ExpiryBox("טסט", vehicle.testExpiry?.toString() ?: "—", testDays, Modifier.weight(1f))
                    }

                    Spacer(Modifier.height(16.dp))

                    Text("סוגי אחסון:", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(8.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        vehicle.storageTypes.forEach { s ->
                            Surface(color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.05f), shape = RoundedCornerShape(8.dp)) {
                                Text(s, modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp), fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.Medium)
                            }
                        }
                    }

                    Spacer(Modifier.height(24.dp))
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        if (!vehicle.isPrimary) {
                            Button(onClick = onSetPrimary, modifier = Modifier.weight(1f).height(48.dp), colors = ButtonDefaults.buttonColors(containerColor = BrandBlue.copy(alpha = 0.15f), contentColor = BrandBlue), shape = RoundedCornerShape(12.dp)) {
                                Text("הגדר כראשי", fontSize = 13.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                        Button(onClick = onDelete, modifier = Modifier.weight(1f).height(48.dp), colors = ButtonDefaults.buttonColors(containerColor = Color.Red.copy(alpha = 0.15f), contentColor = Color.Red), shape = RoundedCornerShape(12.dp)) {
                            Text("מחק רכב", fontSize = 13.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun ExpiryBox(label: String, date: String, daysLeft: Int, modifier: Modifier = Modifier) {
    val color = when {
        daysLeft <= 7 -> Color.Red
        daysLeft <= 30 -> BrandBlue
        else -> SuccessDark
    }
    Surface(modifier = modifier, color = color.copy(alpha = 0.1f), shape = RoundedCornerShape(14.dp)) {
        Column(modifier = Modifier.padding(14.dp)) {
            Text(label, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = FontWeight.Bold)
            Text(date, fontWeight = FontWeight.Black, fontSize = 15.sp, color = color)
            Text(if (daysLeft <= 0) "פג תוקף!" else "בעוד $daysLeft ימים", fontSize = 11.sp, color = color.copy(alpha = 0.7f))
        }
    }
}

@OptIn(ExperimentalLayoutApi::class, ExperimentalMaterial3Api::class)
@Composable
fun AddVehicleDialog(onDismiss: () -> Unit, onSave: (String, String, String, String, List<String>) -> Unit) {
    var plate by remember { mutableStateOf("") }
    var type by remember { mutableStateOf("car") }
    var insExp by remember { mutableStateOf("") }
    var testExp by remember { mutableStateOf("") }
    val selectedStorage = remember { mutableStateListOf<String>() }
    val options = listOf("רגיל", "קירור", "שברירי", "מכתבים", "כבד")

    var plateError by remember { mutableStateOf<String?>(null) }
    var insError by remember { mutableStateOf<String?>(null) }
    var testError by remember { mutableStateOf<String?>(null) }

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = Graphite800,
        title = { Text("הוסף כלי רכב", fontWeight = FontWeight.Black, color = MaterialTheme.colorScheme.onSurface) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                TzirTextField(plate, { plate = it; plateError = validatePlate(it) }, "לוחית רישוי *", isError = plateError != null, errorText = plateError)
                TzirTextField(insExp, { insExp = it; insError = validateExpiry(it, "ביטוח") }, "פקיעת ביטוח (DD/MM/YYYY)", isError = insError != null, errorText = insError)
                TzirTextField(testExp, { testExp = it; testError = validateExpiry(it, "טסט") }, "פקיעת טסט (DD/MM/YYYY)", isError = testError != null, errorText = testError)

                Text("סוג רכב:", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    TYPE_LABELS.forEach { (key, label) ->
                        FilterChip(
                            selected = type == key,
                            onClick = { type = key },
                            label = { Text(label) },
                            colors = FilterChipDefaults.filterChipColors(selectedContainerColor = BrandBlue, selectedLabelColor = Graphite950)
                        )
                    }
                }

                Spacer(Modifier.height(4.dp))
                Text("סוגי אחסון:", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    options.forEach { s ->
                        FilterChip(
                            selected = selectedStorage.contains(s),
                            onClick = { if (selectedStorage.contains(s)) selectedStorage.remove(s) else selectedStorage.add(s) },
                            label = { Text(s) },
                            colors = FilterChipDefaults.filterChipColors(selectedContainerColor = BrandBlue, selectedLabelColor = Graphite950)
                        )
                    }
                }
            }
        },
        confirmButton = {
            TzirButton(
                text = "שמור",
                onClick = {
                    plateError = validatePlate(plate)
                    insError = validateExpiry(insExp, "ביטוח")
                    testError = validateExpiry(testExp, "טסט")
                    if (plateError == null) onSave(plate, type, insExp, testExp, selectedStorage.toList())
                },
                modifier = Modifier.width(100.dp)
            )
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("ביטול", color = MaterialTheme.colorScheme.onSurfaceVariant) }
        }
    )
}
