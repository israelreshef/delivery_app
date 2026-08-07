package com.tzir.delivery.courier.ui.courier

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.res.stringResource
import com.tzir.delivery.courier.R
import com.tzir.delivery.courier.repository.CourierRepository
import com.tzir.delivery.courier.ui.components.*
import com.tzir.delivery.courier.ui.theme.*
import com.tzir.delivery.courier.util.DocumentOpener
import kotlinx.coroutines.launch
import java.util.Calendar

data class CourierDocument(
    val id: String,
    val title: String,
    val description: String,
    val status: String,
    val expiryDate: String
)

data class TaxFormItem(
    val id: String,
    val title: String,
    val description: String,
    val kind: String,
    val period: String,
    val available: Boolean
)

data class ReportHistoryItem(
    val id: Int,
    val formId: String,
    val title: String,
    val periodType: String,
    val periodLabel: String,
    val periodYear: Int,
    val periodMonth: Int?,
    val status: String,
    val filename: String,
    val createdAt: String
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DocumentsScreen(onBack: () -> Unit, repository: CourierRepository? = null) {
    val scope = rememberCoroutineScope()
    var docs by remember { mutableStateOf<List<CourierDocument>>(emptyList()) }
    var taxForms by remember { mutableStateOf<List<TaxFormItem>>(emptyList()) }
    var reportHistory by remember { mutableStateOf<List<ReportHistoryItem>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var errorMsg by remember { mutableStateOf<String?>(null) }

    val context = LocalContext.current
    val calendar = remember { Calendar.getInstance() }
    var periodForm by remember { mutableStateOf<TaxFormItem?>(null) }

    fun mapHistory(rawHistory: List<Map<String, Any>>): List<ReportHistoryItem> =
        rawHistory.map { obj ->
            ReportHistoryItem(
                id = obj["id"]?.toString()?.toIntOrNull() ?: 0,
                formId = obj["form_id"]?.toString() ?: "",
                title = obj["title"]?.toString() ?: "",
                periodType = obj["period"]?.toString() ?: "",
                periodLabel = obj["period_label"]?.toString() ?: "",
                periodYear = obj["period_year"]?.toString()?.toIntOrNull() ?: 0,
                periodMonth = obj["period_month"]?.toString()?.toIntOrNull(),
                status = obj["status"]?.toString() ?: "up_to_date",
                filename = obj["filename"]?.toString() ?: "",
                createdAt = obj["created_at"]?.toString() ?: ""
            )
        }

    fun refreshReportHistory() {
        scope.launch {
            repository?.let { repo ->
                val rawHistory = repo.getReportHistory()
                reportHistory = mapHistory(rawHistory)
            }
        }
    }

    LaunchedEffect(repository) {
        if (repository != null) {
            try {
                val rawList = repository.getDocuments()
                if (rawList.isNotEmpty()) {
                    docs = rawList.mapIndexed { index, obj ->
                        CourierDocument(
                            id = obj["id"]?.toString() ?: (index + 1).toString(),
                            title = (obj["title"]?.toString()
                                ?: obj["document_type"]?.toString()
                                ?: "מסמך ${index + 1}"),
                            description = obj["description"]?.toString() ?: "",
                            status = obj["status"]?.toString() ?: "pending",
                            expiryDate = obj["expiry_date"]?.toString()
                                ?: obj["expiryDate"]?.toString() ?: "N/A"
                        )
                    }
                }
                val rawForms = repository.getTaxForms()
                taxForms = rawForms.map { obj ->
                    TaxFormItem(
                        id = obj["id"]?.toString() ?: "",
                        title = obj["title"]?.toString() ?: "",
                        description = obj["description"]?.toString() ?: "",
                        kind = obj["kind"]?.toString() ?: "auto",
                        period = obj["period"]?.toString() ?: "",
                        available = (obj["available"] as? Boolean) ?: true
                    )
                }
                val rawHistory = repository.getReportHistory()
                reportHistory = mapHistory(rawHistory)
                isLoading = false
            } catch (e: Exception) {
                errorMsg = "שגיאה בטעינת מסמכים"
                isLoading = false
            }
        } else {
            isLoading = false
        }
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
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.Transparent, titleContentColor = MaterialTheme.colorScheme.onBackground)
            )
        },
        containerColor = Color.Transparent
    ) { padding ->
        PremiumBackground {
            Column(
                modifier = Modifier
                    .padding(padding)
                    .fillMaxSize()
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
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            
            Spacer(modifier = Modifier.height(24.dp))
            
            if (isLoading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        CircularProgressIndicator(color = BrandBlue)
                        Spacer(modifier = Modifier.height(12.dp))
                        Text("טוען מסמכים...", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 14.sp)
                    }
                }
            } else {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                if (docs.isEmpty()) {
                    item {
                        Box(modifier = Modifier.fillMaxWidth().padding(vertical = 32.dp), contentAlignment = Alignment.Center) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text("📄", fontSize = 48.sp)
                                Spacer(modifier = Modifier.height(12.dp))
                                Text(errorMsg ?: "אין מסמכים להצגה", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 14.sp)
                            }
                        }
                    }
                } else {
                item {
                    Text("דוחות מס (הכנסה/מע\"מ)", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = TextGray)
                }

                if (taxForms.isEmpty()) {
                    item {
                        Box(modifier = Modifier.fillMaxWidth().padding(vertical = 16.dp), contentAlignment = Alignment.Center) {
                            Text("אין טפסי מס זמינים כעת", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 14.sp)
                        }
                    }
                } else {
                    items(taxForms) { form ->
                        TaxFormCard(
                            form = form,
                            onGenerate = { periodForm = form },
                            onBlank = {
                                scope.launch {
                                    val bytes = repository?.downloadBlankForm(form.id)
                                    if (bytes != null) {
                                        DocumentOpener.openBytes(context, bytes, "${form.title}.pdf", "pdf")
                                    }
                                }
                            }
                        )
                    }
                }

                item {
                    Spacer(modifier = Modifier.height(16.dp))
                    Text("דוחות שנוצרו", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = TextGray)
                }

                if (reportHistory.isEmpty()) {
                    item {
                        Box(modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp), contentAlignment = Alignment.Center) {
                            Text("עוד לא נוצר אף דוח", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 14.sp)
                        }
                    }
                } else {
                    items(reportHistory) { report ->
                        ReportHistoryCard(
                            report = report,
                            onDownload = {
                                scope.launch {
                                    val bytes = repository?.downloadReport(report.id)
                                    if (bytes != null) {
                                        DocumentOpener.openBytes(
                                            context,
                                            bytes,
                                            report.filename.ifEmpty { "report_${report.id}.pdf" },
                                            "pdf"
                                        )
                                    }
                                }
                            },
                            onDelete = {
                                scope.launch {
                                    repository?.deleteReport(report.id)
                                    refreshReportHistory()
                                }
                            },
                            onRefresh = {
                                scope.launch {
                                    repository?.generateTaxForm(
                                        report.formId,
                                        report.periodMonth,
                                        report.periodYear
                                    )
                                    refreshReportHistory()
                                }
                            }
                        )
                    }
                }

                item {
                    Spacer(modifier = Modifier.height(16.dp))
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
        }
    }

    periodForm?.let { form ->
        PeriodPickerDialog(
            form = form,
            onDismiss = { periodForm = null },
            onConfirm = { month, year ->
                scope.launch {
                    val bytes = repository?.generateTaxForm(form.id, month, year)
                    if (bytes != null) {
                        DocumentOpener.openBytes(context, bytes, "${form.title}_$year.pdf", "pdf")
                    }
                    refreshReportHistory()
                }
            }
        )
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
                Text(description, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
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
        else -> BrandBlue
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
                Text(doc.description, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
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
                        Text("בתוקף עד: ${doc.expiryDate}", fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
            
            IconButton(onClick = { /* View / Edit placeholder */ }) {
                Text("👁️", fontSize = 18.sp)
            }
        }
    }
}

@Composable
fun TaxFormCard(form: TaxFormItem, onGenerate: () -> Unit, onBlank: () -> Unit) {
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
                    .background(BrandBlue.copy(alpha = 0.1f), CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Text("🧾", fontSize = 20.sp)
            }

            Spacer(modifier = Modifier.width(16.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(form.title, fontWeight = FontWeight.Bold, fontSize = 16.sp, color = TextOfficial)
                Text(form.description, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)

                if (!form.available) {
                    Spacer(modifier = Modifier.height(4.dp))
                    Text("לא זמין בעונת הדיווח הנוכחית", fontSize = 11.sp, color = MaterialTheme.colorScheme.error)
                    return@Row
                }

                Spacer(modifier = Modifier.height(10.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    if (form.kind == "auto") {
                        TzirButton(
                            text = "צור דוח",
                            modifier = Modifier.weight(1f),
                            onClick = onGenerate
                        )
                    }
                    if (form.period == "year") {
                        TzirButton(
                            text = "טופס ריק",
                            modifier = Modifier.weight(1f),
                            onClick = onBlank
                        )
                    }
                }
                if (form.kind == "blank") {
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        "הטופס ממולא בפרטים שלך",
                        fontSize = 11.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }
}

@Composable
fun ReportHistoryCard(
    report: ReportHistoryItem,
    onDownload: () -> Unit,
    onDelete: () -> Unit,
    onRefresh: () -> Unit
) {
    val needsRefresh = report.status == "needs_refresh"
    val statusColor = if (needsRefresh) Warning else Success
    val statusBg = if (needsRefresh) WarningBg else SuccessBg

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
                    .background(statusBg, CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    if (needsRefresh) "🔄" else "📄",
                    fontSize = 20.sp
                )
            }

            Spacer(modifier = Modifier.width(16.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(report.title, fontWeight = FontWeight.Bold, fontSize = 16.sp, color = TextOfficial)
                Text(
                    "תקופה: ${report.periodLabel} · נוצר ב: ${report.createdAt.take(10)}",
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(modifier = Modifier.height(4.dp))
                Surface(
                    color = statusBg,
                    shape = RoundedCornerShape(4.dp)
                ) {
                    Text(
                        if (needsRefresh) "דורש רענון" else "עדכני",
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = statusColor
                    )
                }
            }

            Column(horizontalAlignment = Alignment.End) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    if (needsRefresh) {
                        TzirButton(
                            text = "רענן",
                            modifier = Modifier.weight(1f),
                            onClick = onRefresh
                        )
                    }
                    TzirButton(
                        text = "הורד",
                        modifier = Modifier.weight(1f),
                        onClick = onDownload
                    )
                    TzirButton(
                        text = "מחק",
                        modifier = Modifier.weight(1f),
                        onClick = onDelete
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PeriodPickerDialog(
    form: TaxFormItem,
    onDismiss: () -> Unit,
    onConfirm: (month: Int?, year: Int) -> Unit
) {
    val currentYear = Calendar.getInstance().get(Calendar.YEAR)
    val currentMonth = Calendar.getInstance().get(Calendar.MONTH) + 1
    var month by remember { mutableStateOf(currentMonth) }
    var year by remember { mutableStateOf(currentYear) }
    var monthExpanded by remember { mutableStateOf(false) }
    val isMonthly = form.period == "month"

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("יצירת דוח - ${form.title}") },
        text = {
            Column {
                if (isMonthly) {
                    Text("חודש", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = TextOfficial)
                    Box {
                        OutlinedButton(
                            onClick = { monthExpanded = true },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text("$month / $year")
                        }
                        DropdownMenu(expanded = monthExpanded, onDismissRequest = { monthExpanded = false }) {
                            for (m in 1..12) {
                                DropdownMenuItem(
                                    text = { Text("$m/$year") },
                                    onClick = { month = m; monthExpanded = false }
                                )
                            }
                        }
                    }
                } else {
                    Text("שנה", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = TextOfficial)
                }
                Spacer(modifier = Modifier.height(8.dp))
                Text("הדוח יופק מהפעילות העסקית שלך בתקופה הנבחרת.", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        },
        confirmButton = {
            TextButton(onClick = {
                val m = if (isMonthly) month else null
                onConfirm(m, year)
                onDismiss()
            }) {
                Text("צור דוח", fontWeight = FontWeight.Bold)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("ביטול") }
        },
        containerColor = MaterialTheme.colorScheme.surface
    )
}
