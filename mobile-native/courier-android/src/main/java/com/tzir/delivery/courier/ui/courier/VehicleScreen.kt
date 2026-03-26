package com.tzir.delivery.courier.ui.courier

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.background
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tzir.delivery.courier.ui.components.*
import com.tzir.delivery.courier.ui.theme.*
import java.util.Calendar

data class Vehicle(
    val id: Int,
    val plate: String,
    val type: String,
    val insuranceExpiry: String,
    val testExpiry: String,
    val storageTypes: List<String>,
    val isPrimary: Boolean = false
)

fun daysUntil(dateStr: String): Int {
    return try {
        val parts = dateStr.split("/")
        val cal = Calendar.getInstance()
        val now = Calendar.getInstance()
        cal.set(parts[2].toInt(), parts[1].toInt() - 1, parts[0].toInt())
        ((cal.timeInMillis - now.timeInMillis) / (1000 * 60 * 60 * 24)).toInt()
    } catch (e: Exception) { 999 }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun VehicleScreen(onBack: () -> Unit) {
    val sampleVehicles = remember { mutableStateListOf(
        Vehicle(1, "123-45-678", "מכונית", "15/04/2026", "30/06/2026", listOf("קירור", "רגיל", "שברירי"), isPrimary = true),
        Vehicle(2, "98-765-43", "קטנוע", "20/03/2026", "01/02/2027", listOf("רגיל", "מכתבים"))
    )}
    
    var showAddDialog by remember { mutableStateOf(false) }
    var expandedId by remember { mutableStateOf<Int?>(null) }

    PremiumBackground {
        Scaffold(
            topBar = {
                CenterAlignedTopAppBar(
                    title = { Text("ניהול כלי רכב", fontWeight = FontWeight.Black, color = AmberGold) },
                    navigationIcon = {
                        IconButton(onClick = onBack) {
                            Icon(Icons.Default.ArrowBack, contentDescription = "חזור", tint = AmberGold)
                        }
                    },
                    colors = TopAppBarDefaults.centerAlignedTopAppBarColors(containerColor = Color.Transparent)
                )
            },
            floatingActionButton = {
                FloatingActionButton(
                    onClick = { showAddDialog = true },
                    containerColor = AmberGold,
                    contentColor = Graphite950,
                    shape = RoundedCornerShape(16.dp),
                    elevation = FloatingActionButtonDefaults.elevation(defaultElevation = 8.dp)
                ) {
                    Icon(Icons.Default.Add, contentDescription = "הוסף רכב")
                }
            },
            containerColor = Color.Transparent
        ) { padding ->
            LazyColumn(
                modifier = Modifier.padding(padding).fillMaxSize(),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Alerts section
                val urgentAlerts = sampleVehicles.filter { v ->
                    daysUntil(v.insuranceExpiry) <= 30 || daysUntil(v.testExpiry) <= 30
                }
                if (urgentAlerts.isNotEmpty()) {
                    item {
                        GlassCard(modifier = Modifier.fillMaxWidth()) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text("⚠️", fontSize = 18.sp)
                                    Spacer(Modifier.width(8.dp))
                                    Text("התראות פקיעה", fontWeight = FontWeight.Black, fontSize = 16.sp, color = AmberGold)
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

                // Vehicle cards
                items(sampleVehicles, key = { it.id }) { vehicle ->
                    VehiclePremiumCard(
                        vehicle = vehicle,
                        expanded = expandedId == vehicle.id,
                        onExpand = { expandedId = if (expandedId == vehicle.id) null else vehicle.id },
                        onSetPrimary = {
                            val idx = sampleVehicles.indexOf(vehicle)
                            sampleVehicles.indices.forEach { i ->
                                sampleVehicles[i] = sampleVehicles[i].copy(isPrimary = i == idx)
                            }
                        },
                        onDelete = { sampleVehicles.remove(vehicle) }
                    )
                }

                item { Spacer(Modifier.height(80.dp)) }
            }
        }
    }

    if (showAddDialog) {
        AddVehicleDialog(
            onDismiss = { showAddDialog = false },
            onSave = { plate, type, insExp, testExp, storage ->
                sampleVehicles.add(Vehicle(sampleVehicles.size + 100, plate, type, insExp, testExp, storage, sampleVehicles.isEmpty()))
                showAddDialog = false
            }
        )
    }
}

@Composable
fun AlertRow(label: String, msg: String, critical: Boolean) {
    Row(modifier = Modifier.padding(vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
        Box(modifier = Modifier.size(6.dp).background(if (critical) Color.Red else AmberGold, CircleShape))
        Spacer(Modifier.width(10.dp))
        Column {
            Text(label, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Color.White)
            Text(msg, fontSize = 12.sp, color = Color.Gray)
        }
    }
}

@Composable
fun VehiclePremiumCard(vehicle: Vehicle, expanded: Boolean, onExpand: () -> Unit, onSetPrimary: () -> Unit, onDelete: () -> Unit) {
    val insDays = daysUntil(vehicle.insuranceExpiry)
    val testDays = daysUntil(vehicle.testExpiry)
    val hasAlert = insDays <= 30 || testDays <= 30

    GlassCard(
        modifier = Modifier.fillMaxWidth().clickable { onExpand() },
        opacity = if (vehicle.isPrimary) 0.9f else 0.7f
    ) {
        Column(modifier = Modifier.padding(20.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                val emoji = when (vehicle.type) {
                    "קטנוע" -> "🛵"; "ואן" -> "🚐"; "משאית" -> "🚛"; else -> "🚗"
                }
                Surface(modifier = Modifier.size(48.dp), shape = CircleShape, color = AmberGold.copy(alpha = 0.1f)) {
                    Box(contentAlignment = Alignment.Center) { Text(emoji, fontSize = 24.sp) }
                }
                Spacer(Modifier.width(16.dp))
                Column(Modifier.weight(1f)) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(vehicle.plate, fontWeight = FontWeight.Black, fontSize = 18.sp, color = Color.White)
                        if (vehicle.isPrimary) {
                            Surface(color = AmberGold, shape = RoundedCornerShape(6.dp)) {
                                Text("ראשי", modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp), fontSize = 10.sp, fontWeight = FontWeight.Black, color = Graphite950)
                            }
                        }
                    }
                    Text(vehicle.type, fontSize = 13.sp, color = Color.Gray)
                }
                Icon(if (expanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore, null, tint = Color.Gray)
            }

            AnimatedVisibility(visible = expanded, enter = expandVertically(), exit = shrinkVertically()) {
                Column(modifier = Modifier.padding(top = 20.dp)) {
                    HorizontalDivider(color = Color.White.copy(alpha = 0.1f))
                    Spacer(Modifier.height(16.dp))

                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        ExpiryBox("ביטוח", vehicle.insuranceExpiry, insDays, Modifier.weight(1f))
                        ExpiryBox("טסט", vehicle.testExpiry, testDays, Modifier.weight(1f))
                    }

                    Spacer(Modifier.height(16.dp))

                    Text("סוגי אחסון:", fontSize = 12.sp, color = Color.Gray, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(8.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        vehicle.storageTypes.forEach { s ->
                            Surface(color = Color.White.copy(alpha = 0.05f), shape = RoundedCornerShape(8.dp)) {
                                Text(s, modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp), fontSize = 12.sp, color = Color.White, fontWeight = FontWeight.Medium)
                            }
                        }
                    }

                    Spacer(Modifier.height(24.dp))
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        if (!vehicle.isPrimary) {
                            Button(onClick = onSetPrimary, modifier = Modifier.weight(1f).height(48.dp), colors = ButtonDefaults.buttonColors(containerColor = AmberGold.copy(alpha = 0.15f), contentColor = AmberGold), shape = RoundedCornerShape(12.dp)) {
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
        daysLeft <= 30 -> AmberGold
        else -> SuccessDark
    }
    Surface(modifier = modifier, color = color.copy(alpha = 0.1f), shape = RoundedCornerShape(14.dp)) {
        Column(modifier = Modifier.padding(14.dp)) {
            Text(label, fontSize = 11.sp, color = Color.Gray, fontWeight = FontWeight.Bold)
            Text(date, fontWeight = FontWeight.Black, fontSize = 15.sp, color = color)
            Text(if (daysLeft <= 0) "פג תוקף!" else "בעוד $daysLeft ימים", fontSize = 11.sp, color = color.copy(alpha = 0.7f))
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun AddVehicleDialog(onDismiss: () -> Unit, onSave: (String, String, String, String, List<String>) -> Unit) {
    var plate by remember { mutableStateOf("") }
    var type by remember { mutableStateOf("מכונית") }
    var insExp by remember { mutableStateOf("") }
    var testExp by remember { mutableStateOf("") }
    val selectedStorage = remember { mutableStateListOf<String>() }
    val options = listOf("רגיל", "קירור", "שברירי", "מכתבים", "כבד")

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = Graphite800,
        title = { Text("הוסף כלי רכב", fontWeight = FontWeight.Black, color = Color.White) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                TzirTextField(plate, { plate = it }, "לוחית רישוי *")
                TzirTextField(insExp, { insExp = it }, "פקיעת ביטוח (DD/MM/YYYY) *")
                TzirTextField(testExp, { testExp = it }, "פקיעת טסט")
                
                Text("סוגי אחסון:", fontSize = 13.sp, color = Color.Gray)
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    options.forEach { s ->
                        FilterChip(
                            selected = selectedStorage.contains(s),
                            onClick = { if (selectedStorage.contains(s)) selectedStorage.remove(s) else selectedStorage.add(s) },
                            label = { Text(s) },
                            colors = FilterChipDefaults.filterChipColors(selectedContainerColor = AmberGold, selectedLabelColor = Graphite950)
                        )
                    }
                }
            }
        },
        confirmButton = {
            TzirButton(text = "שמור", onClick = { if(plate.isNotBlank()) onSave(plate, type, insExp, testExp, selectedStorage.toList()) }, modifier = Modifier.width(100.dp))
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("ביטול", color = Color.Gray) }
        }
    )
}
