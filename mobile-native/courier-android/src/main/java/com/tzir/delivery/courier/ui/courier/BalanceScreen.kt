package com.tzir.delivery.courier.ui.courier

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
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
import com.tzir.delivery.courier.repository.PaymentRepository
import com.tzir.delivery.courier.ui.components.*
import com.tzir.delivery.courier.ui.theme.*
import kotlinx.coroutines.launch
import androidx.compose.foundation.text.KeyboardOptions

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BalanceScreen(
    onBack: () -> Unit,
    paymentRepository: PaymentRepository? = null,
    onPaymentMethodsClick: (() -> Unit)? = null
) {
    val balance by (paymentRepository?.walletBalance?.collectAsState() ?: remember { mutableStateOf(com.tzir.delivery.courier.repository.WalletBalance(0.0, "ILS")) })
    val withdrawalHistory by (paymentRepository?.withdrawalHistory?.collectAsState() ?: remember { mutableStateOf(emptyList()) })
    val scope = rememberCoroutineScope()
    var showWithdrawDialog by remember { mutableStateOf(false) }

    LaunchedEffect(paymentRepository) {
        paymentRepository?.refresh()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("ארנק", fontWeight = FontWeight.Black, color = BrandBlue) },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.Transparent, titleContentColor = BrandBlue),
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "חזור", tint = BrandBlue)
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(onClick = { showWithdrawDialog = true }, containerColor = BrandBlue, contentColor = Navy950, shape = RoundedCornerShape(14.dp)) {
                Text("💰", fontSize = 22.sp)
            }
        },
        containerColor = Color.Transparent
    ) { padding ->
        PremiumBackground {
            Column(
                modifier = Modifier.padding(padding).fillMaxSize()
            ) {
                // Balance Card
                Card(
                    modifier = Modifier.fillMaxWidth().padding(16.dp),
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(containerColor = Navy950),
                    elevation = CardDefaults.cardElevation(4.dp)
                ) {
                    Column(modifier = Modifier.padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("יתרה זמינה", color = Color.White.copy(alpha = 0.6f), fontSize = 14.sp)
                        Spacer(Modifier.height(8.dp))
                        Text("₪${"%,.0f".format(balance.balance)}", color = BrandBlue, fontSize = 48.sp, fontWeight = FontWeight.Black)
                        Spacer(Modifier.height(4.dp))
                        Text(balance.currency, color = Color.White.copy(alpha = 0.4f), fontSize = 14.sp)
                        if (balance.pendingWithdrawals.isNotEmpty()) {
                            Spacer(Modifier.height(12.dp))
                            val pendingTotal = balance.pendingWithdrawals.sumOf { it.amount }
                            Surface(color = BrandBlue.copy(alpha = 0.15f), shape = RoundedCornerShape(8.dp)) {
                                Text("₪${"%,.0f".format(pendingTotal)} בהמתנה לאישור", modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp), fontSize = 13.sp, fontWeight = FontWeight.Bold, color = BrandBlue)
                            }
                        }
                    }
                }

                // Withdraw button
                Button(
                    onClick = { showWithdrawDialog = true },
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp).height(52.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = BrandBlue),
                    shape = RoundedCornerShape(14.dp)
                ) {
                    Text("💰", fontSize = 18.sp)
                    Spacer(Modifier.width(8.dp))
                    Text("משוך כספים", fontWeight = FontWeight.Black, color = Navy950, fontSize = 16.sp)
                }

                Spacer(Modifier.height(8.dp))

                // Payment Methods button
                onPaymentMethodsClick?.let { onPM ->
                    OutlinedButton(
                        onClick = onPM,
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp).height(44.dp),
                        shape = RoundedCornerShape(14.dp),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = BrandBlue)
                    ) {
                        Icon(Icons.Filled.Payment, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("נהל אמצעי תשלום", fontSize = 14.sp)
                    }
                    Spacer(Modifier.height(8.dp))
                }

                Spacer(Modifier.height(24.dp))

                // History header
                Row(modifier = Modifier.padding(horizontal = 16.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text("היסטוריית משיכות", fontWeight = FontWeight.ExtraBold, fontSize = 16.sp, color = TextOfficial, modifier = Modifier.weight(1f))
                    Surface(color = BrandBlue.copy(alpha = 0.1f), shape = RoundedCornerShape(6.dp)) {
                        Text("${withdrawalHistory.size} בקשות", modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp), fontSize = 11.sp, color = BrandBlue)
                    }
                }

                Spacer(Modifier.height(12.dp))

                if (withdrawalHistory.isEmpty()) {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("💰", fontSize = 48.sp)
                            Spacer(Modifier.height(12.dp))
                            Text("אין בקשות משיכה קודמות", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 16.sp, fontWeight = FontWeight.Medium)
                        }
                    }
                } else {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 80.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        items(withdrawalHistory) { w ->
                            WithdrawalItem(w)
                        }
                    }
                }
            }
        }
    }

    if (showWithdrawDialog) {
        WithdrawDialog(
            balance = balance.balance,
            onDismiss = { showWithdrawDialog = false },
            onConfirm = { amount, details ->
                scope.launch {
                    val error = paymentRepository?.createWithdrawal(amount, details)
                    showWithdrawDialog = false
                }
            }
        )
    }
}

@Composable
fun WithdrawDialog(
    balance: Double,
    onDismiss: () -> Unit,
    onConfirm: (Double, String) -> Unit
) {
    var amountText by remember { mutableStateOf("") }
    var paymentDetails by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("משיכת כספים", fontWeight = FontWeight.Black) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text("יתרה זמינה: ₪${"%,.0f".format(balance)}", fontSize = 14.sp, color = TextGray)
                OutlinedTextField(
                    value = amountText,
                    onValueChange = { amountText = it; error = null },
                    label = { Text("סכום למשיכה (₪)") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal)
                )
                OutlinedTextField(
                    value = paymentDetails,
                    onValueChange = { paymentDetails = it },
                    label = { Text("אמצעי תשלום (ביט/העברה)") },
                    placeholder = { Text("למשל: 050-1234567") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )
                error?.let {
                    Text(it, color = Color.Red, fontSize = 12.sp)
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val amount = amountText.toDoubleOrNull()
                    if (amount == null || amount <= 0) {
                        error = "יש להזין סכום תקין"
                    } else if (amount > balance) {
                        error = "הסכום חורג מהיתרה הזמינה"
                    } else if (paymentDetails.isBlank()) {
                        error = "יש להזין אמצעי תשלום"
                    } else {
                        onConfirm(amount, paymentDetails)
                    }
                },
                colors = ButtonDefaults.buttonColors(containerColor = BrandBlue),
                enabled = amountText.isNotBlank() && paymentDetails.isNotBlank()
            ) {
                Text("אישור בקשה", color = Navy950, fontWeight = FontWeight.Bold)
            }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("ביטול") } }
    )
}

@Composable
fun WithdrawalItem(w: com.tzir.delivery.courier.repository.WithdrawalRequestItem) {
    val statusColor = when (w.status) {
        "approved" -> Color(0xFF22C55E)
        "rejected" -> Color(0xFFEF4444)
        else -> BrandBlue
    }
    val statusText = when (w.status) {
        "approved" -> "אושר"
        "rejected" -> "נדחה"
        else -> "ממתין לאישור"
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = AppleWhite),
        elevation = CardDefaults.cardElevation(1.dp)
    ) {
        Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Surface(modifier = Modifier.size(44.dp), shape = RoundedCornerShape(12.dp), color = statusColor.copy(alpha = 0.12f)) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        when (w.status) {
                            "approved" -> Icons.Default.CheckCircle
                            "rejected" -> Icons.Default.Cancel
                            else -> Icons.Default.HourglassEmpty
                        },
                        contentDescription = null, tint = statusColor, modifier = Modifier.size(22.dp)
                    )
                }
            }
            Spacer(Modifier.width(14.dp))
            Column(Modifier.weight(1f)) {
                Text("₪${"%,.0f".format(w.amount)}", fontWeight = FontWeight.Black, fontSize = 16.sp, color = TextOfficial)
                Text(statusText, fontSize = 12.sp, color = statusColor, fontWeight = FontWeight.SemiBold)
                if (w.paymentDetails != null) {
                    Text(w.paymentDetails, fontSize = 11.sp, color = TextGray)
                }
            }
            if (w.createdAt != null) {
                Text(w.createdAt.take(10), fontSize = 11.sp, color = TextGray)
            }
        }
    }
}
