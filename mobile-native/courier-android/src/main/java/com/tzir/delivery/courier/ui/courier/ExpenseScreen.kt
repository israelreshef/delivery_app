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
import com.tzir.delivery.courier.ui.theme.BrandBlue
import com.tzir.delivery.courier.ui.theme.TextOfficial
import com.tzir.delivery.courier.ui.theme.*
import com.tzir.delivery.courier.model.ExpenseCategory
import com.tzir.delivery.courier.repository.Expense
import com.tzir.delivery.courier.repository.ExpenseRepository
import com.tzir.delivery.courier.ui.components.PremiumBackground

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ExpenseScreen(
    onBack: () -> Unit,
    expenseRepository: ExpenseRepository? = null
) {
    val expenses by (expenseRepository?.expenses?.collectAsState() ?: remember { mutableStateOf(emptyList()) })
    var showAddDialog by remember { mutableStateOf(false) }
    val total = expenses.sumOf { it.amount }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("ניהול הוצאות", fontWeight = FontWeight.Black, color = BrandBlue) },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.Transparent, titleContentColor = BrandBlue),
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "חזור", tint = BrandBlue)
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(onClick = { showAddDialog = true }, containerColor = BrandBlue, contentColor = Navy950, shape = RoundedCornerShape(14.dp)) {
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
                        Text("₪${String.format("%.0f", total)}", color = BrandBlue, fontSize = 36.sp, fontWeight = FontWeight.Black)
                    }
                    Column(horizontalAlignment = Alignment.End) {
                        val fuel = expenses.filter { it.category == ExpenseCategory.FUEL }.sumOf { it.amount }
                        val repair = expenses.filter { it.category == ExpenseCategory.VEHICLE_MAINTENANCE }.sumOf { it.amount }
                        Text("דלק: ₪${String.format("%.0f", fuel)}", color = Color.White.copy(alpha = 0.8f), fontSize = 13.sp)
                        Text("תיקונים: ₪${String.format("%.0f", repair)}", color = Color.White.copy(alpha = 0.8f), fontSize = 13.sp)
                    }
                }
            }

            // Category breakdown chips
            Row(modifier = Modifier.padding(horizontal = 16.dp).fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                ExpenseCategory.entries.take(4).forEach { cat ->
                    val catTotal = expenses.filter { it.category == cat }.sumOf { it.amount }
                    if (catTotal > 0) {
                        Surface(color = cat.color.copy(alpha = 0.1f), shape = RoundedCornerShape(8.dp)) {
                            Text("${cat.displayName} ₪${String.format("%.0f", catTotal)}", modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp), fontSize = 12.sp, fontWeight = FontWeight.Bold, color = cat.color)
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
                    ExpenseRow(expense = exp, onDelete = { expenseRepository?.delete(exp.id) })
                }
            }
        }
        }
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

@Composable
fun ExpenseRow(expense: Expense, onDelete: () -> Unit) {
    val icon: ImageVector = expense.category.icon
    val color: Color = expense.category.color

    Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(14.dp), colors = CardDefaults.cardColors(containerColor = AppleWhite), elevation = CardDefaults.cardElevation(1.dp)) {
        Row(modifier = Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
            Surface(modifier = Modifier.size(40.dp), shape = RoundedCornerShape(10.dp), color = color.copy(alpha = 0.12f)) {
                Box(contentAlignment = Alignment.Center) { Icon(icon, contentDescription = null, tint = color, modifier = Modifier.size(20.dp)) }
            }
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(expense.description, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = TextOfficial)
                Text("${expense.category.displayName} · ${expense.date}", fontSize = 12.sp, color = TextGray)
            }
            Text("₪${String.format("%.0f", expense.amount)}", fontWeight = FontWeight.Black, fontSize = 16.sp, color = color)
            Spacer(Modifier.width(8.dp))
            IconButton(onClick = onDelete, modifier = Modifier.size(32.dp)) {
                Icon(Icons.Default.Delete, contentDescription = "מחק", tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(16.dp))
            }
        }
    }
}

@Composable
fun AddExpenseDialog(onDismiss: () -> Unit, onSave: (ExpenseCategory, String, Double) -> Unit) {
    var selectedCat by remember { mutableStateOf(ExpenseCategory.entries.first()) }
    var desc by remember { mutableStateOf("") }
    var amount by remember { mutableStateOf("") }
    var showSubcategoryPicker by remember { mutableStateOf(false) }
    var selectedSubcategory by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("הוצאה חדשה", fontWeight = FontWeight.Black) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text("קטגוריה:", fontSize = 13.sp, color = TextGray)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    ExpenseCategory.entries.take(5).forEach { cat ->
                        FilterChip(
                            selected = selectedCat == cat,
                            onClick = { selectedCat = cat; selectedSubcategory = "" },
                            label = { Text(cat.displayName, fontSize = 12.sp) },
                            colors = FilterChipDefaults.filterChipColors(selectedContainerColor = cat.color, selectedLabelColor = Color.White)
                        )
                    }
                }
                if (selectedCat.subcategories.isNotEmpty()) {
                    Text("תת-קטגוריה:", fontSize = 13.sp, color = TextGray)
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        selectedCat.subcategories.take(4).forEach { sub ->
                            FilterChip(
                                selected = selectedSubcategory == sub,
                                onClick = { selectedSubcategory = sub },
                                label = { Text(sub, fontSize = 11.sp) },
                                colors = FilterChipDefaults.filterChipColors(selectedContainerColor = selectedCat.color.copy(alpha = 0.3f))
                            )
                        }
                    }
                }
                OutlinedTextField(desc, { desc = it }, label = { Text("תיאור") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                OutlinedTextField(amount, { amount = it }, label = { Text("סכום (₪)") }, modifier = Modifier.fillMaxWidth(), singleLine = true, keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = androidx.compose.ui.text.input.KeyboardType.Decimal))
            }
        },
        confirmButton = {
            Button(onClick = { amount.toDoubleOrNull()?.let { onSave(selectedCat, desc, it) } }, colors = ButtonDefaults.buttonColors(containerColor = Navy950)) {
                Text("שמור", color = BrandBlue)
            }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("ביטול") } }
    )
}
