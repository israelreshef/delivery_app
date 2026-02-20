package com.tzir.delivery.android.ui.courier

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.KeyboardArrowLeft
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.snapshots.SnapshotStateList
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.res.stringResource
import com.tzir.delivery.android.R
import com.tzir.delivery.android.ui.components.*

data class CourierDocument(
    val id: String,
    val title: String,
    val description: String,
    val status: String, // valid, expiring, expired, pending
    val expiryDate: String
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DocumentsScreen(onBack: () -> Unit) {
    val regBusinessProgress = stringResource(R.string.reg_business_progress)
    val regTaxFile = stringResource(R.string.reg_tax_file)
    val regSocialSecurity = stringResource(R.string.reg_social_security)
    val regAnnualReports = stringResource(R.string.reg_annual_reports)

    // Using remember with SnapshotStateList to avoid calling composables in the lambda
    val docs = remember(regBusinessProgress, regTaxFile, regSocialSecurity, regAnnualReports) {
        val list = SnapshotStateList<CourierDocument>()
        list.addAll(listOf(
            CourierDocument("1", regBusinessProgress, "סיכום פעילות ודירוג עסקי", "valid", "N/A"),
            CourierDocument("2", regTaxFile, "אישור ניהול ספרים ופטור מניכוי מס", "valid", "31/12/2024"),
            CourierDocument("3", regSocialSecurity, "דוח מעמדות ותשלומים", "valid", "N/A"),
            CourierDocument("4", regAnnualReports, "דוח רווח והפסד שנתי - 2023", "valid", "31/05/2024"),
            CourierDocument("5", "רישיון נהיגה", "סוג ג' (עד 12 טון)", "valid", "12/12/2026"),
            CourierDocument("6", "ביטוח חובה", "פול - כל רכב", "expiring", "01/04/2024")
        ))
        list
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("ניהול מסמכים", fontWeight = FontWeight.Bold) },
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
                .padding(16.dp)
        ) {
            Text(
                "המסמכים שלך",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Black,
                color = TextOfficial
            )
            Text(
                "נהל את הרישיונות והאישורים הנדרשים לפעילות",
                fontSize = 14.sp,
                color = Color.Gray
            )
            
            Spacer(modifier = Modifier.height(24.dp))
            
            LazyColumn(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                item {
                    Text("מסמכים עסקיים", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = TextGray)
                }
                
                items(docs) { doc ->
                    DocumentItem(doc)
                }
                
                item {
                    Spacer(modifier = Modifier.height(16.dp))
                    Text("נהלים ורגולציה", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = TextGray)
                }

                item {
                    RegulationItem("קוד אתי והתנהגות שליחים", "הנחיות לשירות אדיב ומקצועי")
                    Spacer(modifier = Modifier.height(12.dp))
                    RegulationItem("בטיחות בדרכים ורכיבה נכונה", "מדריך בטיחות תקופתי מחייב")
                    Spacer(modifier = Modifier.height(12.dp))
                    RegulationItem("תקנון שימוש באפליקציה", "תנאי השימוש הרשמיים של מערכת ציר")
                }

                item {
                    Spacer(modifier = Modifier.height(16.dp))
                    TzirButton(
                        text = "+ הוסף מסמך חדש",
                        onClick = { /* Upload flow placeholder */ },
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }
        }
    }
}

@Composable
fun RegulationItem(title: String, description: String) {
    GlassCard(
        modifier = Modifier.fillMaxWidth(),
        cornerRadius = 16.dp
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text("📜", fontSize = 18.sp)
            Spacer(modifier = Modifier.width(16.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(title, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = TextOfficial)
                Text(description, fontSize = 11.sp, color = Color.Gray)
            }
            Icon(Icons.Default.KeyboardArrowLeft, contentDescription = null, tint = Color.LightGray)
        }
    }
}

@Composable
fun DocumentItem(doc: CourierDocument) {
    val statusColor = when(doc.status) {
        "valid" -> Color(0xFF2E7D32)
        "expiring" -> Color(0xFFFFA000)
        "expired" -> Color(0xFFD32F2F)
        else -> PrimaryTurquoise
    }
    
    val statusText = when(doc.status) {
        "valid" -> "בתוקף"
        "expiring" -> "עומד לפוג"
        "expired" -> "פג תוקף"
        else -> "בבדיקה"
    }

    GlassCard(
        modifier = Modifier.fillMaxWidth(),
        cornerRadius = 24.dp
    ) {
        Row(
            modifier = Modifier.padding(20.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .background(statusColor.copy(alpha = 0.1f), CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    when(doc.status) {
                        "valid" -> "📄"
                        "expiring" -> "⚠️"
                        "expired" -> "❌"
                        else -> "⏳"
                    },
                    fontSize = 20.sp
                )
            }
            
            Spacer(modifier = Modifier.width(16.dp))
            
            Column(modifier = Modifier.weight(1f)) {
                Text(doc.title, fontWeight = FontWeight.Bold, fontSize = 16.sp, color = TextOfficial)
                Text(doc.description, fontSize = 12.sp, color = Color.Gray)
                Spacer(modifier = Modifier.height(4.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Surface(
                        color = statusColor.copy(alpha = 0.2f),
                        shape = RoundedCornerShape(4.dp)
                    ) {
                        Text(
                            statusText, 
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = statusColor
                        )
                    }
                    if (doc.expiryDate != "N/A") {
                        Spacer(modifier = Modifier.width(12.dp))
                        Text("בתוקף עד: ${doc.expiryDate}", fontSize = 10.sp, color = Color.Gray)
                    }
                }
            }
            
            IconButton(onClick = { /* View / Edit placeholder */ }) {
                Text("👁️", fontSize = 18.sp)
            }
        }
    }
}
