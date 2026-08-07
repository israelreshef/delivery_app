@file:Suppress("UNCHECKED_CAST")

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
import com.tzir.delivery.courier.model.PaymentMethod
import com.tzir.delivery.courier.repository.PaymentRepository
import com.tzir.delivery.courier.ui.components.PremiumBackground
import com.tzir.delivery.courier.ui.theme.*
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PaymentMethodsScreen(
    onBack: () -> Unit,
    paymentRepository: PaymentRepository? = null
) {
    val methods by (paymentRepository?.paymentMethods?.collectAsState()
        ?: remember { mutableStateOf(emptyList<PaymentMethod>()) })
    var showAddDialog by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(paymentRepository) {
        paymentRepository?.fetchPaymentMethods()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("אמצעי תשלום") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Filled.ArrowBack, contentDescription = "חזור")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color.Transparent,
                    titleContentColor = BrandBlue,
                    navigationIconContentColor = BrandBlue
                )
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { showAddDialog = true },
                containerColor = BrandBlue
            ) {
                Icon(Icons.Filled.Add, contentDescription = "הוסף אמצעי תשלום", tint = Color.White)
            }
        },
        containerColor = Color.Transparent
    ) { padding ->
        PremiumBackground {
            Column(
                modifier = Modifier
                    .padding(padding)
                    .fillMaxSize()
            ) {
                if (methods.isEmpty()) {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(
                                Icons.Filled.Payment,
                                contentDescription = null,
                                modifier = Modifier.size(64.dp),
                                tint = TextGray
                            )
                            Spacer(modifier = Modifier.height(12.dp))
                            Text("לא הוגדרו אמצעי תשלום", color = TextGray, fontSize = 16.sp)
                            Text("לחץ על + כדי להוסיף", color = TextGray, fontSize = 14.sp)
                        }
                    }
                } else {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        items(methods) { method ->
                            PaymentMethodCard(
                                method = method,
                                onSetDefault = {
                                    scope.launch {
                                        paymentRepository?.setDefaultPaymentMethod(method.id)
                                    }
                                },
                                onDelete = {
                                    scope.launch {
                                        paymentRepository?.deletePaymentMethod(method.id)
                                    }
                                }
                            )
                        }
                    }
                }
            }
        }
    }

    if (showAddDialog) {
        AddPaymentMethodDialog(
            onDismiss = { showAddDialog = false },
            onConfirm = { type, label, details, isDefault ->
                scope.launch {
                    paymentRepository?.addPaymentMethod(type, label, details, isDefault)
                    showAddDialog = false
                }
            }
        )
    }
}

@Composable
private fun PaymentMethodCard(
    method: PaymentMethod,
    onSetDefault: () -> Unit,
    onDelete: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = Navy950)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = when (method.methodType) {
                    "bank_transfer" -> Icons.Filled.AccountBalance
                    "paypal" -> Icons.Filled.Payment
                    "bit" -> Icons.Filled.MobileFriendly
                    else -> Icons.Filled.AttachMoney
                },
                contentDescription = null,
                tint = BrandBlue,
                modifier = Modifier.size(36.dp)
            )
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = method.label,
                    color = TextOfficial,
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp
                )
                Text(
                    text = when (method.methodType) {
                        "bank_transfer" -> "העברה בנקאית"
                        "paypal" -> "PayPal"
                        "bit" -> "Bit"
                        "cash" -> "מזומן"
                        else -> method.methodType
                    },
                    color = TextGray,
                    fontSize = 14.sp
                )
                method.details.forEach { (key, value) ->
                    Text(
                        text = "$key: $value",
                        color = TextGray,
                        fontSize = 12.sp
                    )
                }
            }
            if (method.isDefault) {
                Text(
                    text = "ברירת מחדל",
                    color = BrandBlue,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold
                )
            } else {
                TextButton(onClick = onSetDefault) {
                    Text("קבע כברירת מחדל", color = BrandBlue, fontSize = 12.sp)
                }
            }
            IconButton(onClick = onDelete) {
                Icon(Icons.Filled.Delete, contentDescription = "מחק", tint = Color(0xFFE53935))
            }
        }
    }
}

@Composable
private fun AddPaymentMethodDialog(
    onDismiss: () -> Unit,
    onConfirm: (String, String, Map<String, String>, Boolean) -> Unit
) {
    var selectedType by remember { mutableStateOf("bank_transfer") }
    var labelText by remember { mutableStateOf("") }
    var accountNumber by remember { mutableStateOf("") }
    var bankName by remember { mutableStateOf("") }
    var branchNumber by remember { mutableStateOf("") }
    var phoneNumber by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var isDefault by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("הוספת אמצעי תשלום", color = TextOfficial) },
        text = {
            Column {
                if (error != null) {
                    Text(error!!, color = Color(0xFFE53935), fontSize = 14.sp)
                    Spacer(modifier = Modifier.height(8.dp))
                }
                Text("סוג אמצעי תשלום", color = TextGray, fontSize = 14.sp)
                Spacer(modifier = Modifier.height(4.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf("bank_transfer" to "העברה בנקאית", "paypal" to "PayPal", "bit" to "Bit", "cash" to "מזומן").forEach { (value, label) ->
                        FilterChip(
                            selected = selectedType == value,
                            onClick = { selectedType = value; error = null },
                            label = { Text(label, fontSize = 12.sp) }
                        )
                    }
                }
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedTextField(
                    value = labelText,
                    onValueChange = { labelText = it; error = null },
                    label = { Text("שם (תווית)") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )
                Spacer(modifier = Modifier.height(8.dp))
                when (selectedType) {
                    "bank_transfer" -> {
                        OutlinedTextField(
                            value = bankName,
                            onValueChange = { bankName = it },
                            label = { Text("שם הבנק") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        OutlinedTextField(
                            value = branchNumber,
                            onValueChange = { branchNumber = it },
                            label = { Text("מס' סניף") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                            keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Number)
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        OutlinedTextField(
                            value = accountNumber,
                            onValueChange = { accountNumber = it },
                            label = { Text("מס' חשבון") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                            keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Number)
                        )
                    }
                    "paypal" -> {
                        OutlinedTextField(
                            value = email,
                            onValueChange = { email = it },
                            label = { Text("דוא\"ל PayPal") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                            keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Email)
                        )
                    }
                    "bit" -> {
                        OutlinedTextField(
                            value = phoneNumber,
                            onValueChange = { phoneNumber = it },
                            label = { Text("מספר טלפון") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                            keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Phone)
                        )
                    }
                }
                Spacer(modifier = Modifier.height(8.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Checkbox(checked = isDefault, onCheckedChange = { isDefault = it })
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("הגדר כברירת מחדל", color = TextGray, fontSize = 14.sp)
                }
            }
        },
        confirmButton = {
            TextButton(
                onClick = {
                    when {
                        labelText.isBlank() -> error = "נא להזין שם (תווית)"
                        selectedType == "bank_transfer" && (bankName.isBlank() || accountNumber.isBlank()) -> error = "נא למלא את פרטי הבנק"
                        selectedType == "paypal" && email.isBlank() -> error = "נא להזין דוא\"ל"
                        selectedType == "bit" && phoneNumber.isBlank() -> error = "נא להזין מספר טלפון"
                        else -> {
                            val details = when (selectedType) {
                                "bank_transfer" -> mapOf("bank" to bankName, "branch" to branchNumber, "account" to accountNumber)
                                "paypal" -> mapOf("email" to email)
                                "bit" -> mapOf("phone" to phoneNumber)
                                else -> emptyMap()
                            }
                            onConfirm(selectedType, labelText, details, isDefault)
                        }
                    }
                },
                enabled = labelText.isNotBlank()
            ) {
                Text("הוסף", color = BrandBlue)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("ביטול", color = TextGray)
            }
        },
        containerColor = Navy950
    )
}
