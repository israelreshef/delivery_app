package com.tzir.delivery.android.ui.courier

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.Place
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.draw.clip
import com.tzir.delivery.android.ui.components.*
import com.tzir.delivery.shared.repository.CourierRepository
import com.tzir.delivery.shared.location.LocationManager
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@Composable
fun RouteOptimizationScreen(repository: CourierRepository, onBack: () -> Unit, onApprove: () -> Unit) {
    var step by remember { mutableStateOf(0) } // 0: Input, 1: Calculation, 2: Result
    var address by remember { mutableStateOf("") }
    var time by remember { mutableStateOf("") }
    var optimizedPoints by remember { mutableStateOf<List<Map<String, Any>>>(emptyList()) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    
    PremiumBackground {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp)
                .verticalScroll(rememberScrollState())
        ) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(
                    onClick = onBack,
                    modifier = Modifier.background(Color.White, CircleShape)
                ) {
                    Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                }
                Spacer(modifier = Modifier.width(16.dp))
                Text(
                    text = "תכנון מסלול חכם",
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Black,
                    color = TextOfficial
                )
            }
            
            Spacer(modifier = Modifier.height(32.dp))
            
            AnimatedVisibility(visible = step == 0) {
                Column(verticalArrangement = Arrangement.spacedBy(24.dp)) {
                    OfficialCard(cornerRadius = 24.dp) {
                        Column(modifier = Modifier.padding(24.dp)) {
                            Text("לאן נוסעים?", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = TextOfficial)
                            Spacer(modifier = Modifier.height(16.dp))
                            
                            // Address Input
                            OutlinedTextField(
                                value = address,
                                onValueChange = { address = it },
                                label = { Text("כתובת יעד / אזור") },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(12.dp),
                                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedContainerColor = Color.White,
                                    unfocusedContainerColor = Color.White
                                )
                            )
                            Spacer(modifier = Modifier.height(16.dp))
                            
                            // Time Input
                            OutlinedTextField(
                                value = time,
                                onValueChange = { time = it },
                                label = { Text("שעת הגעה רצויה") },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(12.dp),
                                leadingIcon = { Icon(Icons.Default.DateRange, contentDescription = null) },
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedContainerColor = Color.White,
                                    unfocusedContainerColor = Color.White
                                )
                            )
                        }
                    }
                    
                    AppleButton(
                        text = "חשב מסלול אופטימלי",
                        onClick = { 
                            step = 1 
                            scope.launch {
                                // Default location if GPS missing (Tel Aviv)
                                val lat = LocationManager.instance?.currentLocation?.value?.first ?: 32.0853
                                val lng = LocationManager.instance?.currentLocation?.value?.second ?: 34.7818
                                
                                val res = repository.optimizeRoute(lat, lng)
                                if (res != null && res["optimized_route"] != null) {
                                    val points = res["optimized_route"] as? List<Map<String, Any>>
                                    if (points != null && points.isNotEmpty()) {
                                        optimizedPoints = points
                                        step = 2
                                    } else {
                                        errorMessage = "לא נמצאו נקודות למסלול בשרת"
                                        step = 0
                                    }
                                } else {
                                    errorMessage = res?.get("message") as? String ?: "חישוב המסלול נכשל"
                                    step = 0
                                }
                            }
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(56.dp)
                    )
                }
            }
            
            AnimatedVisibility(visible = step == 1) {
                // Calculation runs in coroutine, just show loader
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 40.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    CircularProgressIndicator(color = PrimaryTurquoise, strokeWidth = 6.dp, modifier = Modifier.size(64.dp))
                    Spacer(modifier = Modifier.height(24.dp))
                    Text("מחשב את המסלול המהיר ביותר...", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = TextOfficial)
                    Text("בודק עומסי תנועה ומשלוחים נוספים בדרך...", fontSize = 14.sp, color = Color.Gray)
                }
            }
            
            AnimatedVisibility(visible = step == 2) {
                Column(verticalArrangement = Arrangement.spacedBy(24.dp)) {
                    // Result Header
                    Text("ההצעה שלנו עבורך:", fontSize = 20.sp, fontWeight = FontWeight.Black, color = TextOfficial)
                    
                    // Main Route Card
                    OfficialCard(cornerRadius = 24.dp) {
                        Column(modifier = Modifier.padding(24.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.Place, null, tint = PrimaryTurquoise)
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("מסלול נוכחי משודרג", fontWeight = FontWeight.Bold)
                            }
                            HorizontalDivider(modifier = Modifier.padding(vertical = 12.dp))
                            
                            optimizedPoints.forEachIndexed { index, point ->
                                val type = point["type"] as? String ?: ""
                                val orderNum = point["order_number"] as? String
                                val desc = if (type == "courier_location") "המיקום שלך" else "${if (type == "pickup") "איסוף" else "מסירה"} - הזמנה $orderNum"
                                RouteStep(time = "STEP ${index+1}", description = desc)
                            }
                        }
                    }
                    
                    // "Fill the Gaps" - Suggested Deliveries
                    Text("📦 משלוחים על הדרך (+₪85)", fontSize = 18.sp, fontWeight = FontWeight.Black, color = Color(0xFF2E7D32))
                    Card(
                        modifier = Modifier.fillMaxWidth().shadow(8.dp, RoundedCornerShape(24.dp)),
                        shape = RoundedCornerShape(24.dp),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFFE8F5E9))
                    ) {
                        Column(modifier = Modifier.padding(24.dp)) {
                            Text("נמצאו 2 משלוחים שמתאימים בול!", fontSize = 14.sp, color = Color(0xFF1B5E20))
                            Spacer(modifier = Modifier.height(12.dp))
                            RouteStep("10:10", "איסוף נוסף - קניון עזריאלי (+₪40)")
                            RouteStep("10:35", "מסירה - דרך בגין 5 (+₪45)")
                        }
                    }
                    
                    Spacer(modifier = Modifier.height(16.dp))
                    
                    AppleButton(
                        text = "אשר מסלול וצא לדרך",
                        onClick = onApprove,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(56.dp)
                    )
                }
            }
        }
    }
}

@Composable
fun RouteStep(time: String, description: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(time, fontWeight = FontWeight.Bold, color = PrimaryTurquoise, modifier = Modifier.width(50.dp))
        Box(
            modifier = Modifier
                .size(8.dp)
                .background(Color.Gray.copy(alpha=0.3f), CircleShape)
        )
        Spacer(modifier = Modifier.width(12.dp))
        Text(description, fontSize = 14.sp, color = TextOfficial)
    }
}
