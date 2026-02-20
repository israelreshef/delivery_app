package com.tzir.delivery.android.ui.courier

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
import com.tzir.delivery.android.ui.components.*
import kotlinx.coroutines.launch

data class ShiftEntry(
    val id: String,
    val date: String,
    val time: String,
    val status: String // upcoming, completed
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CalendarScreen(onBack: () -> Unit) {
    val bookedSlots = remember { 
        mutableStateMapOf<Int, String>().apply {
            put(8, "איסוף - תל אביב מרכז")
            put(9, "בדרך לירושלים")
            put(10, "מסירה - רחביה")
            put(13, "איסוף - פתח תקווה")
        }
    } // Hour -> Location
    var selectedHour by remember { mutableStateOf<Int?>(null) }
    var locationInput by remember { mutableStateOf("") }
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                title = { Text("יומן עבודה 24ש'", fontWeight = FontWeight.Bold) },
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
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.White)
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .padding(padding)
                .fillMaxSize()
                .background(AppleGray)
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

            // 24 Hour Timeline
            LazyColumn(
                modifier = Modifier.weight(1f).padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(24) { hour ->
                    val isBooked = bookedSlots.containsKey(hour)
                    val location = bookedSlots[hour] ?: ""
                    
                    TimelineHourItem(
                        hour = hour,
                        isBooked = isBooked,
                        location = location,
                        onClick = { selectedHour = hour; locationInput = location }
                    )
                }
            }
        }

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
fun TimelineHourItem(hour: Int, isBooked: Boolean, location: String, onClick: () -> Unit) {
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
                containerColor = if (isBooked) PrimaryTurquoise else AppleWhite
            )
        ) {
            Box(modifier = Modifier.fillMaxSize().padding(12.dp), contentAlignment = Alignment.CenterStart) {
                if (isBooked) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Surface(color = AppleWhite.copy(alpha = 0.2f), shape = CircleShape, modifier = Modifier.size(24.dp)) {
                            Box(contentAlignment = Alignment.Center) { Text("📍", fontSize = 12.sp) }
                        }
                        Spacer(modifier = Modifier.width(12.dp))
                        Text(location, color = AppleWhite, fontWeight = FontWeight.Bold)
                    }
                } else {
                    Text("לחץ להוסיף פעילות / מיקום", color = TextGray.copy(alpha = 0.5f), fontSize = 13.sp)
                }
            }
        }
    }
}
