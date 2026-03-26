package com.tzir.delivery.courier.ui.courier

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.LocalGasStation
import androidx.compose.material.icons.filled.Build
import androidx.compose.material.icons.filled.DirectionsCar
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tzir.delivery.courier.ui.theme.AppleGray
import com.tzir.delivery.courier.ui.theme.AppleWhite
import com.tzir.delivery.courier.ui.components.GlassCard
import com.tzir.delivery.courier.ui.theme.PrimaryTurquoise
import com.tzir.delivery.courier.ui.theme.TextOfficial
import com.tzir.delivery.courier.ui.theme.*
import com.tzir.delivery.courier.ui.components.PremiumBackground


data class Expense(val id: Int, val category: String, val description: String, val amount: Double, val date: String)

val expenseCategories = listOf("דלק", "תיקון", "בלאי רכב", "חניה", "אחר")

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ExpenseScreen(onBack: () -> Unit) {
    val expenses = remember {
        mutableStateListOf(
            Expense(1, "דלק", "תדלוק בפז", 180.0, "06/03/2026"),
            Expense(2, "תיקון", "החלפת שמן", 320.0, "01/03/2026"),
            Expense(3, "בלאי רכב", "טבעות בלם", 450.0, "20/02/2026"),
            Expense(4, "דלק", "תדלוק בסונול", 210.0, "15/02/2026")
        )
    }
    var showAddDialog by remember { mutableStateOf(false) }
    val total = expenses.sumOf { it.amount }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("ניהול הוצאות", fontWeight = FontWeight.Black, color = Amber) },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.Transparent, titleContentColor = Amber),
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "חזור", tint = Amber)
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(onClick = { showAddDialog = true }, containerColor = Amber, contentColor = Navy950, shape = RoundedCornerShape(14.dp)) {
                Icon(Icons.Default.Add, contentDescription = "הוסף הוצאה")
            }
        },
        containerColor = Color.Transparent
    ) { padding ->
        PremiumBackground {
            Column(modifier = Modifier.padding(padding).fillMaxSize()) {
            // Summary card
            Card(
                modifier = Modifier.fillMaxWidth().padding(16.dp),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = Navy950),
                elevation = CardDefaults.cardElevation(4.dp)
            ) {
                Row(modifier = Modifier.padding(20.dp), verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text("סה\"כ הוצאות החודש", color = Color.White.copy(alpha = 0.6f), fontSize = 13.sp)
                        Text("₪${String.format("%.0f", total)}", color = Amber, fontSize = 36.sp, fontWeight = FontWeight.Black)
                    }
                    Column(horizontalAlignment = Alignment.End) {
                        val fuel = expenses.filter { it.category == "דלק" }.sumOf { it.amount }
                        val repair = expenses.filter { it.category == "תיקון" || it.category == "בלאי רכב" }.sumOf { it.amount }
                        Text("דלק: ₪${String.format("%.0f", fuel)}", color = Color.White.copy(alpha = 0.8f), fontSize = 13.sp)
                        Text("תיקונים: ₪${String.format("%.0f", repair)}", color = Color.White.copy(alpha = 0.8f), fontSize = 13.sp)
                    }
                }
            }

            // Category breakdown chips
            Row(modifier = Modifier.padding(horizontal = 16.dp).fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                expenseCategories.take(3).forEach { cat ->
                    val catTotal = expenses.filter { it.category == cat }.sumOf { it.amount }
                    if (catTotal > 0) {
                        Surface(color = PrimaryTurquoise.copy(alpha = 0.1f), shape = RoundedCornerShape(8.dp)) {
                            Text("$cat ₪${String.format("%.0f", catTotal)}", modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp), fontSize = 12.sp, fontWeight = FontWeight.Bold, color = PrimaryTurquoise)
                        }
                    }
                }
            }

            Spacer(Modifier.height(12.dp))

            Text("פירוט הוצאות", modifier = Modifier.padding(horizontal = 16.dp), fontWeight = FontWeight.ExtraBold, fontSize = 16.sp, color = TextOfficial)
            Spacer(Modifier.height(8.dp))

            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 80.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                items(expenses.sortedByDescending { it.date }, key = { it.id }) { exp ->
                    ExpenseRow(expense = exp, onDelete = { expenses.removeIf { e -> e.id == exp.id } })
                }
            }
        }
        }
    }

    if (showAddDialog) {
        AddExpenseDialog(
            onDismiss = { showAddDialog = false },
            onSave = { cat, desc, amount ->
                expenses.add(Expense(expenses.size + 100, cat, desc, amount, "06/03/2026"))
                showAddDialog = false
            }
        )
    }
}

@Composable
fun ExpenseRow(expense: Expense, onDelete: () -> Unit) {
    val icon: ImageVector = when (expense.category) {
        "דלק" -> Icons.Default.LocalGasStation
        "תיקון", "בלאי רכב" -> Icons.Default.Build
        else -> Icons.Default.DirectionsCar
    }
    val color = when (expense.category) {
        "דלק" -> Color(0xFF3B82F6)
        "תיקון" -> Color(0xFFEF4444)
        "בלאי רכב" -> Color(0xFFF59E0B)
        else -> Color.Gray
    }

    Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(14.dp), colors = CardDefaults.cardColors(containerColor = AppleWhite), elevation = CardDefaults.cardElevation(1.dp)) {
        Row(modifier = Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
            Surface(modifier = Modifier.size(40.dp), shape = RoundedCornerShape(10.dp), color = color.copy(alpha = 0.12f)) {
                Box(contentAlignment = Alignment.Center) { Icon(icon, contentDescription = null, tint = color, modifier = Modifier.size(20.dp)) }
            }
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(expense.description, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = TextOfficial)
                Text("${expense.category} · ${expense.date}", fontSize = 12.sp, color = TextGray)
            }
            Text("₪${String.format("%.0f", expense.amount)}", fontWeight = FontWeight.Black, fontSize = 16.sp, color = color)
            Spacer(Modifier.width(8.dp))
            IconButton(onClick = onDelete, modifier = Modifier.size(32.dp)) {
                Icon(Icons.Default.Delete, contentDescription = "מחק", tint = Color.LightGray, modifier = Modifier.size(16.dp))
            }
        }
    }
}

@Composable
fun AddExpenseDialog(onDismiss: () -> Unit, onSave: (String, String, Double) -> Unit) {
    var selectedCat by remember { mutableStateOf(expenseCategories[0]) }
    var desc by remember { mutableStateOf("") }
    var amount by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("הוצאה חדשה", fontWeight = FontWeight.Black) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text("קטגוריה:", fontSize = 13.sp, color = TextGray)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    expenseCategories.forEach { cat ->
                        FilterChip(
                            selected = selectedCat == cat,
                            onClick = { selectedCat = cat },
                            label = { Text(cat, fontSize = 12.sp) },
                            colors = FilterChipDefaults.filterChipColors(selectedContainerColor = Navy950, selectedLabelColor = Amber)
                        )
                    }
                }
                OutlinedTextField(desc, { desc = it }, label = { Text("תיאור") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                OutlinedTextField(amount, { amount = it }, label = { Text("סכום (₪)") }, modifier = Modifier.fillMaxWidth(), singleLine = true, keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = androidx.compose.ui.text.input.KeyboardType.Decimal))
            }
        },
        confirmButton = {
            Button(onClick = { amount.toDoubleOrNull()?.let { onSave(selectedCat, desc, it) } }, colors = ButtonDefaults.buttonColors(containerColor = Navy950)) {
                Text("שמור", color = Amber)
            }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("ביטול") } }
    )
}
