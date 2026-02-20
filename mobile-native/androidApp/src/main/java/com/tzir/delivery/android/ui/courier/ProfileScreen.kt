
package com.tzir.delivery.android.ui.courier

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import com.tzir.delivery.shared.model.User
import com.tzir.delivery.android.R
import com.tzir.delivery.android.ui.components.*
import androidx.compose.foundation.shape.RoundedCornerShape
import kotlinx.coroutines.launch

@Composable
fun ProfileScreen(
    repository: com.tzir.delivery.shared.repository.CourierRepository,
    onLogout: () -> Unit,
    onWorkerRatingClick: () -> Unit
) {
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    var documents by remember { mutableStateOf<List<Map<String, Any>>>(emptyList()) }
    
    LaunchedEffect(Unit) {
        documents = repository.getDocuments()
    }

    PremiumBackground {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp)
                .verticalScroll(rememberScrollState()),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = stringResource(R.string.your_profile),
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold,
                color = TextOfficial
            )
            
            Spacer(modifier = Modifier.height(24.dp))

            // 1. Profile Header with Worker Rating
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = AppleWhite),
                shape = RoundedCornerShape(20.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Row(
                    modifier = Modifier.padding(16.dp).fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(stringResource(R.string.account_info), fontWeight = FontWeight.Bold, color = Color.Gray)
                        Spacer(modifier = Modifier.height(8.dp))
                        Text("ישראל ישראלי", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                        Text("israel@example.com", color = Color.Gray)
                        Text("050-1234567", color = Color.Gray)
                    }
                    
                    // Worker Rating Button
                    Surface(
                        onClick = onWorkerRatingClick,
                        shape = RoundedCornerShape(12.dp),
                        color = PrimaryTurquoise.copy(alpha = 0.1f),
                        border = androidx.compose.foundation.BorderStroke(1.dp, PrimaryTurquoise)
                    ) {
                        Column(
                            modifier = Modifier.padding(12.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text("⭐ 4.9", fontWeight = FontWeight.Black, fontSize = 18.sp, color = TextOfficial)
                            Text(stringResource(R.string.worker_rating), fontSize = 10.sp, color = TextOfficial)
                        }
                    }
                }
            }
            
            Spacer(modifier = Modifier.height(24.dp))

            // 2. Vehicle Info Section
            Text(
                text = stringResource(R.string.vehicle_info),
                modifier = Modifier.fillMaxWidth(),
                fontWeight = FontWeight.Bold,
                fontSize = 18.sp,
                color = TextOfficial
            )
            Spacer(modifier = Modifier.height(12.dp))
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
            ) {
                Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text("🛵", fontSize = 24.sp)
                    Spacer(modifier = Modifier.width(16.dp))
                    Column {
                        Text(stringResource(R.string.vehicle_type), color = Color.Gray, fontSize = 12.sp)
                        Text("Scooter (Yamaha TMAX)", fontWeight = FontWeight.SemiBold)
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // 3. Collapsible Documents Section
            var isDocumentsExpanded by remember { mutableStateOf(false) }
            
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                onClick = { isDocumentsExpanded = !isDocumentsExpanded }
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = stringResource(R.string.compliance_docs),
                            fontWeight = FontWeight.Bold,
                            fontSize = 18.sp,
                            color = TextOfficial
                        )
                        Text(if (isDocumentsExpanded) "▲" else "▼", color = TextGray)
                    }
                    
                    androidx.compose.animation.AnimatedVisibility(visible = isDocumentsExpanded) {
                        Column(modifier = Modifier.padding(top = 16.dp)) {
                            val docTypes: List<Pair<String, Int>> = listOf(
                                "id_card" to R.string.doc_id,
                                "license" to R.string.doc_license,
                                "insurance" to R.string.doc_insurance
                            )

                            docTypes.forEach { (type, labelRes) ->
                                val doc = documents.find { it["document_type"] == type }
                                val status = doc?.get("status") as? String ?: "not_uploaded"
                                
                                ComplianceItem(
                                    label = stringResource(labelRes),
                                    status = status,
                                    onUpload = {
                                        scope.launch {
                                            documents = repository.getDocuments()
                                        }
                                    },
                                    repository = repository,
                                    scope = scope
                                )
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // 4. Financial Profile Section
            Text(
                text = stringResource(R.string.financial_profile),
                modifier = Modifier.fillMaxWidth(),
                fontWeight = FontWeight.Bold,
                fontSize = 18.sp,
                color = TextOfficial
            )
            
            Spacer(modifier = Modifier.height(12.dp))
            
            OfficialCard(
                modifier = Modifier.fillMaxWidth(),
                cornerRadius = 24.dp
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    // Summary Row
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column {
                            Text(stringResource(R.string.income), color = Color.White.copy(alpha=0.7f), fontSize = 12.sp)
                            Text("₪12,450", color = Color.White, fontWeight = FontWeight.Black, fontSize = 20.sp)
                        }
                        Column(horizontalAlignment = Alignment.End) {
                            Text(stringResource(R.string.expenses), color = Color.White.copy(alpha=0.7f), fontSize = 12.sp)
                            Text("-₪1,200", color = Color(0xFFFF5252), fontWeight = FontWeight.Black, fontSize = 20.sp)
                        }
                    }
                    
                    Spacer(modifier = Modifier.height(20.dp))
                    HorizontalDivider(color = Color.White.copy(alpha = 0.1f))
                    Spacer(modifier = Modifier.height(20.dp))
                    
                    // Net Profit
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("רווח נקי", color = Color.White, fontWeight = FontWeight.Bold)
                        Text("₪11,250", color = Color(0xFF00E676), fontWeight = FontWeight.Black, fontSize = 24.sp)
                    }

                    Spacer(modifier = Modifier.height(24.dp))
                    
                    // Graph placeholder (reusing EarningsGraph if available or simple Canvas)
                    // Assuming EarningsGraph is available from EarningsScreen.kt (same package)
                    Text("מגמה חודשית", color = Color.White.copy(alpha=0.5f), fontSize = 10.sp)
                    Spacer(modifier = Modifier.height(8.dp))
                    // Mock data for graph
                    EarningsGraph(data = listOf(80f, 120f, 110f, 140f, 130f, 160f, 150f))
                }
            }

            Spacer(modifier = Modifier.height(32.dp))

            Text(
                text = stringResource(R.string.help_center),
                modifier = Modifier.fillMaxWidth(),
                fontWeight = FontWeight.Bold,
                fontSize = 18.sp,
                color = TextOfficial
            )

            Spacer(modifier = Modifier.height(12.dp))

            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(stringResource(R.string.contact_support), fontWeight = FontWeight.SemiBold)
                    Spacer(modifier = Modifier.height(8.dp))
                    TzirButton(
                        text = stringResource(R.string.contact_support),
                        onClick = {
                            val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://wa.me/972502222222"))
                            context.startActivity(intent)
                        }
                    )
                }
            }

            Spacer(modifier = Modifier.height(48.dp))
            
            TextButton(
                onClick = onLogout,
                modifier = Modifier.fillMaxWidth().height(52.dp),
                colors = ButtonDefaults.textButtonColors(contentColor = Color(0xFFD32F2F))
            ) {
                Text(stringResource(R.string.logout), fontWeight = FontWeight.Bold, fontSize = 16.sp)
            }
        }
    }
}

@Composable
fun ComplianceItem(
    label: String, 
    status: String, 
    onUpload: () -> Unit,
    repository: com.tzir.delivery.shared.repository.CourierRepository, 
    scope: kotlinx.coroutines.CoroutineScope
) {
    val context = LocalContext.current
    
    val launcher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        uri?.let {
            scope.launch {
                val inputStream = context.contentResolver.openInputStream(it)
                val bytes = inputStream?.readBytes()
                if (bytes != null) {
                    val url = repository.uploadImage(bytes)
                    if (url != null) {
                        onUpload()
                    }
                }
            }
        }
    }

    Card(
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
        colors = CardDefaults.cardColors(containerColor = AppleWhite),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        shape = RoundedCornerShape(20.dp)
    ) {
        Row(
            modifier = Modifier.padding(16.dp).fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(label, fontWeight = FontWeight.SemiBold)
                
                val statusTextRes = when(status) {
                    "approved" -> R.string.status_approved
                    "pending" -> R.string.status_pending
                    "rejected" -> R.string.status_rejected
                    else -> R.string.status_not_uploaded
                }
                
                Text(
                    text = stringResource(statusTextRes),
                    fontSize = 12.sp,
                    color = when(status) {
                        "approved" -> Color(0xFF2E7D32)
                        "pending" -> Color(0xFFF57C00)
                        "rejected" -> Color.Red
                        else -> TextGray
                    }
                )
            }
            TextButton(
                onClick = { launcher.launch("image/*") },
                colors = ButtonDefaults.textButtonColors(contentColor = PrimaryTurquoise)
            ) {
                Text(
                    if (status == "not_uploaded") stringResource(R.string.upload) else stringResource(R.string.update),
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }
}
