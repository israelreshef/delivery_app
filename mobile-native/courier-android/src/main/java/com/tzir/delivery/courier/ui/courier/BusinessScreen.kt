package com.tzir.delivery.courier.ui.courier

import androidx.compose.animation.*
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tzir.delivery.courier.model.CourierReceipt
import com.tzir.delivery.courier.model.ExpenseCategory
import com.tzir.delivery.courier.repository.BusinessRepository
import com.tzir.delivery.courier.repository.Expense
import com.tzir.delivery.courier.repository.ExpenseRepository
import com.tzir.delivery.courier.ui.components.*
import com.tzir.delivery.courier.ui.theme.*
import com.tzir.delivery.courier.util.DocumentOpener
import kotlinx.coroutines.launch

// ─────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────

enum class BusinessCategory(
    val label: String,
    val description: String,
    val icon: ImageVector,
    val color: Color
) {
    RECEIPTS(
        label = "קבלות",
        description = "הפקת קבלות ואישורי תשלום ללקוחות",
        icon = Icons.Default.Receipt,
        color = Color(0xFF3B82F6)
    ),
    REPORTS(
        label = "דוחות",
        description = "דוחות הכנסות, מע\"מ וסיכום שנתי",
        icon = Icons.Default.BarChart,
        color = Color(0xFF10B981)
    ),
    EXPENSES(
        label = "הוצאות",
        description = "מעקב הוצאות, תשלומים ועלויות",
        icon = Icons.Default.AccountBalanceWallet,
        color = Color(0xFFF59E0B)
    )
}

private fun money(value: Double): String = "₪${String.format("%.0f", value)}"

// ─────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────

@Composable
fun BusinessScreen(
    businessRepository: BusinessRepository? = null,
    expenseRepository: ExpenseRepository? = null
) {
    var selectedCategory by remember { mutableStateOf<BusinessCategory?>(null) }

    val overview by (businessRepository?.overview?.collectAsState()
        ?: remember { mutableStateOf(com.tzir.delivery.courier.model.BusinessOverview()) })

    LaunchedEffect(Unit) {
        businessRepository?.refresh()
        expenseRepository?.refresh()
    }

    PremiumBackground {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
        ) {
            Spacer(Modifier.height(24.dp))

            AnimatedContent(
                targetState = selectedCategory,
                transitionSpec = {
                    if (targetState != null) {
                        (slideInHorizontally { -it } + fadeIn()) togetherWith
                                (slideOutHorizontally { it } + fadeOut())
                    } else {
                        (slideInHorizontally { it } + fadeIn()) togetherWith
                                (slideOutHorizontally { -it } + fadeOut())
                    }
                },
                label = "business_nav"
            ) { category ->
                when (category) {
                    null -> CategoryListView(
                        overview = overview,
                        onCategorySelected = { selectedCategory = it }
                    )
                    BusinessCategory.RECEIPTS -> ReceiptsView(
                        businessRepository = businessRepository,
                        onBack = { selectedCategory = null }
                    )
                    BusinessCategory.REPORTS -> ReportsView(
                        businessRepository = businessRepository,
                        onBack = { selectedCategory = null }
                    )
                    BusinessCategory.EXPENSES -> ExpensesView(
                        expenseRepository = expenseRepository,
                        onBack = { selectedCategory = null }
                    )
                }
            }
        }
    }
}

// ─────────────────────────────────────────────
// Category List View
// ─────────────────────────────────────────────

@Composable
private fun CategoryListView(
    overview: com.tzir.delivery.courier.model.BusinessOverview,
    onCategorySelected: (BusinessCategory) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text(
            "ניהול עסקי",
            fontSize = 34.sp,
            fontWeight = FontWeight.Black,
            color = MaterialTheme.colorScheme.onSurface
        )
        Text(
            "קבלות, דוחות וניהול הוצאות",
            fontSize = 15.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(bottom = 4.dp)
        )

        // Real summary mini-cards
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            SummaryMiniCard("הכנסות החודש", money(overview.monthlyRevenue), BusinessCategory.REPORTS.color, Modifier.weight(1f))
            SummaryMiniCard("הוצאות החודש", money(overview.expensesTotal), BusinessCategory.EXPENSES.color, Modifier.weight(1f))
            SummaryMiniCard("רווח נקי", money(overview.monthlyProfit), BusinessCategory.RECEIPTS.color, Modifier.weight(1f))
        }

        Spacer(Modifier.height(8.dp))

        BusinessCategory.entries.forEach { cat ->
            val subtitle = when (cat) {
                BusinessCategory.RECEIPTS -> "${overview.receiptsCount} קבלות החודש"
                BusinessCategory.REPORTS -> "${overview.deliveriesCount} משלוחים החודש"
                BusinessCategory.EXPENSES -> "${money(overview.expensesTotal)} החודש"
            }
            GlassCard(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onCategorySelected(cat) },
                cornerRadius = 20.dp
            ) {
                Row(
                    modifier = Modifier.padding(20.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Surface(
                        shape = RoundedCornerShape(16.dp),
                        color = cat.color.copy(alpha = 0.15f),
                        modifier = Modifier.size(56.dp)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(cat.icon, contentDescription = null, tint = cat.color, modifier = Modifier.size(28.dp))
                        }
                    }
                    Spacer(Modifier.width(16.dp))
                    Column(Modifier.weight(1f)) {
                        Text(cat.label, fontSize = 18.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
                        Spacer(Modifier.height(2.dp))
                        Text(cat.description, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Spacer(Modifier.height(2.dp))
                        Text(subtitle, fontSize = 12.sp, fontWeight = FontWeight.Medium, color = cat.color)
                    }
                    Icon(
                        Icons.Default.ChevronLeft,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f),
                        modifier = Modifier.size(22.dp)
                    )
                }
            }
        }

        Spacer(Modifier.height(32.dp))
    }
}

@Composable
private fun SummaryMiniCard(label: String, value: String, color: Color, modifier: Modifier = Modifier) {
    GlassCard(modifier = modifier, cornerRadius = 16.dp) {
        Column(
            modifier = Modifier.padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(value, fontSize = 15.sp, fontWeight = FontWeight.Black, color = color)
            Spacer(Modifier.height(4.dp))
            Text(label, fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = FontWeight.Medium)
        }
    }
}

// ─────────────────────────────────────────────
// Shared header
// ─────────────────────────────────────────────

@Composable
private fun CategoryHeader(category: BusinessCategory, onBack: () -> Unit) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .clickable { onBack() }
            .padding(bottom = 4.dp)
    ) {
        Icon(Icons.Default.ArrowBack, contentDescription = "חזור", tint = category.color, modifier = Modifier.size(20.dp))
        Spacer(Modifier.width(8.dp))
        Text("חזור", fontSize = 14.sp, color = category.color, fontWeight = FontWeight.Medium)
    }
    Row(verticalAlignment = Alignment.CenterVertically) {
        Surface(shape = RoundedCornerShape(14.dp), color = category.color.copy(alpha = 0.15f), modifier = Modifier.size(48.dp)) {
            Box(contentAlignment = Alignment.Center) {
                Icon(category.icon, contentDescription = null, tint = category.color, modifier = Modifier.size(24.dp))
            }
        }
        Spacer(Modifier.width(14.dp))
        Column {
            Text(category.label, fontSize = 26.sp, fontWeight = FontWeight.Black, color = MaterialTheme.colorScheme.onSurface)
            Text(category.description, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

// ─────────────────────────────────────────────
// Receipts View
// ─────────────────────────────────────────────

@Composable
private fun ReceiptsView(
    businessRepository: BusinessRepository?,
    onBack: () -> Unit
) {
    val category = BusinessCategory.RECEIPTS
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val receipts by (businessRepository?.receipts?.collectAsState()
        ?: remember { mutableStateOf(emptyList<CourierReceipt>()) })
    var showAddDialog by remember { mutableStateOf(false) }
    var statusMessage by remember { mutableStateOf<String?>(null) }

    Column(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        CategoryHeader(category, onBack)

        Button(
            onClick = { showAddDialog = true },
            modifier = Modifier.fillMaxWidth(),
            colors = ButtonDefaults.buttonColors(containerColor = category.color),
            shape = RoundedCornerShape(14.dp)
        ) {
            Icon(Icons.Default.AddCircleOutline, contentDescription = null, modifier = Modifier.size(20.dp))
            Spacer(Modifier.width(8.dp))
            Text("הפקת קבלה חדשה", fontWeight = FontWeight.Bold)
        }

        statusMessage?.let {
            Text(it, fontSize = 13.sp, color = category.color, modifier = Modifier.padding(vertical = 4.dp))
        }

        if (receipts.isEmpty()) {
            EmptyState("אין קבלות עדיין", "הפק קבלה חדשה כדי לשלוח ללקוח כ-PDF או Word")
        } else {
            receipts.forEach { receipt ->
                GlassCard(modifier = Modifier.fillMaxWidth(), cornerRadius = 16.dp) {
                    Column(Modifier.padding(16.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Column(Modifier.weight(1f)) {
                                Text(receipt.clientName, fontSize = 15.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
                                Text("${receipt.receiptNumber} · ${receipt.issueDate}", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            Text(money(receipt.amount), fontSize = 18.sp, fontWeight = FontWeight.Black, color = category.color)
                        }
                        if (!receipt.description.isNullOrBlank()) {
                            Spacer(Modifier.height(6.dp))
                            Text(receipt.description!!, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        Spacer(Modifier.height(10.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            DownloadChip("PDF", Icons.Default.PictureAsPdf, category.color) {
                                scope.launch {
                                    statusMessage = "מוריד PDF..."
                                    val bytes = businessRepository?.downloadReceiptDocument(receipt.id, "pdf")
                                    statusMessage = if (bytes != null &&
                                        DocumentOpener.openBytes(context, bytes, "receipt_${receipt.receiptNumber}.pdf", "pdf")
                                    ) null else "הורדת ה-PDF נכשלה"
                                }
                            }
                            DownloadChip("Word", Icons.Default.Description, category.color) {
                                scope.launch {
                                    statusMessage = "מוריד Word..."
                                    val bytes = businessRepository?.downloadReceiptDocument(receipt.id, "docx")
                                    statusMessage = if (bytes != null &&
                                        DocumentOpener.openBytes(context, bytes, "receipt_${receipt.receiptNumber}.docx", "docx")
                                    ) null else "הורדת ה-Word נכשלה"
                                }
                            }
                        }
                    }
                }
            }
        }

        Spacer(Modifier.height(32.dp))
    }

    if (showAddDialog) {
        AddReceiptDialog(
            color = category.color,
            onDismiss = { showAddDialog = false },
            onSave = { clientName, amount, description, taxId ->
                scope.launch {
                    businessRepository?.createReceipt(clientName, amount, description, "cash", taxId)
                }
                showAddDialog = false
            }
        )
    }
}

@Composable
private fun DownloadChip(label: String, icon: ImageVector, color: Color, onClick: () -> Unit) {
    Surface(
        color = color.copy(alpha = 0.15f),
        shape = RoundedCornerShape(10.dp),
        modifier = Modifier.clickable { onClick() }
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(icon, contentDescription = null, tint = color, modifier = Modifier.size(16.dp))
            Spacer(Modifier.width(6.dp))
            Text(label, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = color)
        }
    }
}

@Composable
private fun AddReceiptDialog(
    color: Color,
    onDismiss: () -> Unit,
    onSave: (String, Double, String?, String?) -> Unit
) {
    var clientName by remember { mutableStateOf("") }
    var amount by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var taxId by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("קבלה חדשה", fontWeight = FontWeight.Black) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(clientName, { clientName = it }, label = { Text("שם הלקוח") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                OutlinedTextField(taxId, { taxId = it }, label = { Text("ע.מ / ח.פ / ת.ז (אופציונלי)") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                OutlinedTextField(description, { description = it }, label = { Text("תיאור") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                OutlinedTextField(
                    amount, { amount = it }, label = { Text("סכום כולל מע\"מ (₪)") },
                    modifier = Modifier.fillMaxWidth(), singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal)
                )
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val amt = amount.toDoubleOrNull()
                    if (clientName.isNotBlank() && amt != null && amt > 0) {
                        onSave(clientName.trim(), amt, description.ifBlank { null }, taxId.ifBlank { null })
                    }
                },
                colors = ButtonDefaults.buttonColors(containerColor = color)
            ) { Text("הפק קבלה", color = Color.White) }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("ביטול") } }
    )
}

// ─────────────────────────────────────────────
// Reports View
// ─────────────────────────────────────────────

@Composable
private fun ReportsView(
    businessRepository: BusinessRepository?,
    onBack: () -> Unit
) {
    val category = BusinessCategory.REPORTS
    val monthly by (businessRepository?.monthlyReport?.collectAsState()
        ?: remember { mutableStateOf(com.tzir.delivery.courier.model.MonthlyReport()) })
    val annual by (businessRepository?.annualReport?.collectAsState()
        ?: remember { mutableStateOf(com.tzir.delivery.courier.model.AnnualReport()) })

    Column(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        CategoryHeader(category, onBack)

        GlassCard(modifier = Modifier.fillMaxWidth(), cornerRadius = 20.dp) {
            Column(Modifier.padding(20.dp)) {
                Text("דוח חודשי · ${monthly.period}", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
                Spacer(Modifier.height(12.dp))
                ReportRow("הכנסות", money(monthly.revenue), category.color)
                ReportRow("משלוחים", "${monthly.deliveriesCount}", MaterialTheme.colorScheme.onSurface)
                ReportRow("הוצאות", money(monthly.expenses), BusinessCategory.EXPENSES.color)
                HorizontalDivider(color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.08f), modifier = Modifier.padding(vertical = 8.dp))
                ReportRow("מע\"מ עסקאות", money(monthly.vatCollected), MaterialTheme.colorScheme.onSurface)
                ReportRow("מע\"מ תשומות", money(monthly.vatDeductible), MaterialTheme.colorScheme.onSurface)
                ReportRow("מע\"מ לתשלום", money(monthly.vatDue), MaterialTheme.colorScheme.onSurface)
                HorizontalDivider(color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.08f), modifier = Modifier.padding(vertical = 8.dp))
                ReportRow("הפרשה פנסיונית", money(monthly.pensionContribution), MaterialTheme.colorScheme.onSurface)
                ReportRow("קרן השתלמות", money(monthly.studyFundContribution), MaterialTheme.colorScheme.onSurface)
                HorizontalDivider(color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.08f), modifier = Modifier.padding(vertical = 8.dp))
                ReportRow("רווח נקי", money(monthly.profit), category.color, bold = true)
            }
        }

        GlassCard(modifier = Modifier.fillMaxWidth(), cornerRadius = 20.dp) {
            Column(Modifier.padding(20.dp)) {
                Text("סיכום שנתי · ${annual.year}", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
                Spacer(Modifier.height(12.dp))
                ReportRow("סה\"כ הכנסות", money(annual.totalRevenue), category.color)
                ReportRow("סה\"כ הוצאות", money(annual.totalExpenses), BusinessCategory.EXPENSES.color)
                ReportRow("רווח נקי שנתי", money(annual.netProfit), category.color, bold = true)
                ReportRow("ממוצע חודשי", money(annual.monthlyAvg), MaterialTheme.colorScheme.onSurface)
                ReportRow("אומדן ביטוח לאומי", money(annual.socialSecurityEstimate), MaterialTheme.colorScheme.onSurface)
                HorizontalDivider(color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.08f), modifier = Modifier.padding(vertical = 8.dp))
                ReportRow("הפרשה פנסיונית שנתית", money(annual.pensionContribution), MaterialTheme.colorScheme.onSurface)
                ReportRow("קרן השתלמות שנתית", money(annual.studyFundContribution), MaterialTheme.colorScheme.onSurface)
                if (annual.taxBracketHint.isNotBlank()) {
                    Spacer(Modifier.height(8.dp))
                    Text(annual.taxBracketHint, fontSize = 13.sp, color = category.color, fontWeight = FontWeight.Medium)
                }
            }
        }

        Spacer(Modifier.height(32.dp))
    }
}

@Composable
private fun ReportRow(label: String, value: String, valueColor: Color, bold: Boolean = false) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(label, fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(
            value,
            fontSize = if (bold) 18.sp else 14.sp,
            fontWeight = if (bold) FontWeight.Black else FontWeight.SemiBold,
            color = valueColor
        )
    }
}

// ─────────────────────────────────────────────
// Expenses View
// ─────────────────────────────────────────────

@Composable
private fun ExpensesView(
    expenseRepository: ExpenseRepository?,
    onBack: () -> Unit
) {
    val category = BusinessCategory.EXPENSES
    val expenses by (expenseRepository?.expenses?.collectAsState()
        ?: remember { mutableStateOf(emptyList<Expense>()) })
    var showAddDialog by remember { mutableStateOf(false) }
    val total = expenses.sumOf { it.amount }

    Column(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        CategoryHeader(category, onBack)

        GlassCard(modifier = Modifier.fillMaxWidth(), cornerRadius = 20.dp) {
            Row(Modifier.padding(20.dp), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("סה\"כ הוצאות החודש", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 13.sp)
                    Text(money(total), color = category.color, fontSize = 32.sp, fontWeight = FontWeight.Black)
                }
                Text("${expenses.size} רשומות", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 13.sp)
            }
        }

        Button(
            onClick = { showAddDialog = true },
            modifier = Modifier.fillMaxWidth(),
            colors = ButtonDefaults.buttonColors(containerColor = category.color),
            shape = RoundedCornerShape(14.dp)
        ) {
            Icon(Icons.Default.AddCircleOutline, contentDescription = null, modifier = Modifier.size(20.dp))
            Spacer(Modifier.width(8.dp))
            Text("הוסף הוצאה", fontWeight = FontWeight.Bold)
        }

        if (expenses.isEmpty()) {
            EmptyState("אין הוצאות עדיין", "הוסף הוצאה כדי לעקוב אחר עלויות ולנצל ניכוי מס")
        } else {
            // By-category breakdown
            val byCategory = ExpenseCategory.entries
                .map { cat -> cat to expenses.filter { it.category == cat }.sumOf { it.amount } }
                .filter { it.second > 0 }
            if (byCategory.isNotEmpty()) {
                GlassCard(modifier = Modifier.fillMaxWidth(), cornerRadius = 16.dp) {
                    Column(Modifier.padding(16.dp)) {
                        Text("לפי קטגוריה", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
                        Spacer(Modifier.height(8.dp))
                        byCategory.forEach { (cat, catTotal) ->
                            Row(
                                modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(cat.icon, contentDescription = null, tint = cat.color, modifier = Modifier.size(18.dp))
                                Spacer(Modifier.width(10.dp))
                                Text(cat.displayName, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.weight(1f))
                                Text(money(catTotal), fontSize = 13.sp, fontWeight = FontWeight.Bold, color = cat.color)
                            }
                        }
                    }
                }
            }

            expenses.sortedByDescending { it.date }.forEach { exp ->
                ExpenseRow(expense = exp, onDelete = { expenseRepository?.delete(exp.id) })
            }
        }

        Spacer(Modifier.height(32.dp))
    }

    if (showAddDialog) {
        AddExpenseDialog(
            onDismiss = { showAddDialog = false },
            onSave = { cat, desc, amount ->
                expenseRepository?.add(Expense(id = 0, category = cat, description = desc, amount = amount))
                showAddDialog = false
            }
        )
    }
}

// ─────────────────────────────────────────────
// Shared
// ─────────────────────────────────────────────

@Composable
private fun EmptyState(title: String, subtitle: String) {
    GlassCard(modifier = Modifier.fillMaxWidth(), cornerRadius = 16.dp) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(Icons.Default.Inbox, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(40.dp))
            Spacer(Modifier.height(12.dp))
            Text(title, fontSize = 15.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
            Spacer(Modifier.height(4.dp))
            Text(subtitle, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, lineHeight = 18.sp)
        }
    }
}
