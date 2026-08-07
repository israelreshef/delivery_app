package com.tzir.delivery.courier.ui.courier

import android.content.Intent
import android.net.Uri
import androidx.compose.animation.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tzir.delivery.courier.model.ClientOrder
import com.tzir.delivery.courier.model.ClientTask
import com.tzir.delivery.courier.model.CourierContact
import com.tzir.delivery.courier.repository.ContactRepository
import com.tzir.delivery.courier.ui.UiState
import com.tzir.delivery.courier.ui.theme.*
import com.tzir.delivery.courier.ui.components.PremiumBackground
import kotlinx.coroutines.launch
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.drop
import kotlinx.coroutines.flow.filter

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ClientDetailScreen(
    client: CourierContact,
    contactRepository: ContactRepository?,
    onBack: () -> Unit,
    onEdit: (() -> Unit)? = null
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var showQuoteDialog by remember { mutableStateOf(false) }
    var showLogDialog by remember { mutableStateOf(false) }
    var showDeleteConfirm by remember { mutableStateOf(false) }
    var showEditDialog by remember { mutableStateOf(false) }
    var showTaskDialog by remember { mutableStateOf(false) }
    var ordersState by remember { mutableStateOf<UiState<List<ClientOrder>>>(UiState.Loading) }
    var tasksState by remember { mutableStateOf<UiState<List<ClientTask>>>(UiState.Loading) }
    var taskState by remember { mutableStateOf<UiState<Unit>?>(null) }
    val isOffline by contactRepository?.isOffline?.collectAsState() ?: remember { mutableStateOf(false) }

    suspend fun loadClientOrders(): UiState<List<ClientOrder>> {
        val wasOffline = isOffline
        return try {
            val result = contactRepository?.getClientOrders(client.id)
            if (result.isNullOrEmpty()) UiState.Success(emptyList())
            else UiState.Success(result)
        } catch (e: Exception) {
            if (wasOffline || e.message?.contains("connect", ignoreCase = true) == true ||
                e.message?.contains("timeout", ignoreCase = true) == true ||
                e.message?.contains("Unable to resolve host", ignoreCase = true) == true
            ) UiState.Error("מצב לא מקוון — לא ניתן לטעון הזמנות", e)
            else UiState.Error(e.message ?: "שגיאה בטעינת הזמנות", e)
        }
    }

    suspend fun loadClientTasks(): UiState<List<ClientTask>> {
        val wasOffline = isOffline
        return try {
            val result = contactRepository?.getClientTasks(client.id)
            if (result.isNullOrEmpty()) UiState.Success(emptyList())
            else UiState.Success(result)
        } catch (e: Exception) {
            if (wasOffline || e.message?.contains("connect", ignoreCase = true) == true ||
                e.message?.contains("timeout", ignoreCase = true) == true ||
                e.message?.contains("Unable to resolve host", ignoreCase = true) == true
            ) UiState.Error("מצב לא מקוון — לא ניתן לטעון משימות", e)
            else UiState.Error(e.message ?: "שגיאה בטעינת משימות", e)
        }
    }

    LaunchedEffect(client.id) {
        ordersState = loadClientOrders()
        tasksState = loadClientTasks()
    }

    LaunchedEffect(Unit) {
        snapshotFlow { isOffline }
            .drop(1)
            .filter { !it && (ordersState is UiState.Error || tasksState is UiState.Error) }
            .collect {
                val prevOrders = ordersState
                val ordersResult = loadClientOrders()
                ordersState = when {
                    ordersResult is UiState.Success -> ordersResult
                    prevOrders is UiState.Error -> prevOrders
                    else -> ordersResult
                }
                val prevTasks = tasksState
                val tasksResult = loadClientTasks()
                tasksState = when {
                    tasksResult is UiState.Success -> tasksResult
                    prevTasks is UiState.Error -> prevTasks
                    else -> tasksResult
                }
            }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(client.name, fontWeight = FontWeight.Black, color = BrandBlue) },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.Transparent, titleContentColor = BrandBlue),
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "חזור", tint = BrandBlue)
                    }
                },
                actions = {
                    IconButton(onClick = { showDeleteConfirm = true }) {
                        Icon(Icons.Default.Delete, contentDescription = "מחק", tint = Color(0xFFEF4444))
                    }
                    IconButton(onClick = { showEditDialog = true }) {
                        Icon(Icons.Default.Edit, contentDescription = "ערוך", tint = BrandBlue)
                    }
                }
            )
        },
        containerColor = Color.Transparent
    ) { padding ->
        PremiumBackground {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                // ─── Header: Avatar + Name + Tags ───────────────────────────
                item {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Box(
                            modifier = Modifier
                                .size(80.dp)
                                .background(Navy950, CircleShape),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                client.name.first().toString(),
                                color = BrandBlue,
                                fontWeight = FontWeight.Black,
                                fontSize = 36.sp
                            )
                        }
                        Spacer(Modifier.height(12.dp))
                        Text(client.name, fontWeight = FontWeight.Black, fontSize = 22.sp, color = Navy950)
                        if (client.company.isNotBlank()) {
                            Text(client.company, fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        Spacer(Modifier.height(8.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            if (client.isVIP) {
                                Surface(color = Color(0xFFF59E0B), shape = RoundedCornerShape(8.dp)) {
                                    Text("VIP", modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp), fontSize = 12.sp, fontWeight = FontWeight.Black, color = Color.White)
                                }
                            }
                            if (client.isBusiness) {
                                Surface(color = Color(0xFF3B82F6).copy(alpha = 0.15f), shape = RoundedCornerShape(8.dp)) {
                                    Text("עסק", modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp), fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color(0xFF3B82F6))
                                }
                            }
                            if (client.notes.isNotBlank()) {
                                Surface(color = Color(0xFF10B981).copy(alpha = 0.1f), shape = RoundedCornerShape(8.dp)) {
                                    Text("פעיל", modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp), fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color(0xFF10B981))
                                }
                            }
                        }
                        if (client.lastInteraction.isNotBlank()) {
                            Spacer(Modifier.height(4.dp))
                            Text("אינטראקציה אחרונה: ${client.lastInteraction}", fontSize = 11.sp, color = BrandBlue)
                        }
                    }
                }

                // ─── Action Buttons ─────────────────────────────────────────
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceEvenly
                    ) {
                        ActionCircle(Icons.Default.Call, "שיחה", Color(0xFF2E7D32), Color(0xFFE8F5E9)) {
                            context.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:${client.phone}")))
                        }
                        ActionCircle(Icons.Default.Message, "SMS", Color(0xFF1565C0), Color(0xFFE3F2FD)) {
                            context.startActivity(Intent(Intent.ACTION_SENDTO, Uri.parse("smsto:${client.phone}")))
                        }
                        ActionCircle(Icons.Default.RequestQuote, "הצעת מחיר", Color(0xFFF59E0B), Color(0xFFFFFBEB)) {
                            showQuoteDialog = true
                        }
                        ActionCircle(Icons.Default.EditNote, "תיעוד", Color(0xFF7C3AED), Color(0xFFEDE9FE)) {
                            showLogDialog = true
                        }
                        ActionCircle(Icons.Default.Assignment, "משימה", Color(0xFF0891B2), Color(0xFFCFFAFE)) {
                            showTaskDialog = true
                        }
                    }
                }

                // ─── KPIs ──────────────────────────────────────────────────
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        ClientKpiCard("משלוחים", "${client.totalDeliveries}", Color(0xFF3B82F6), Modifier.weight(1f))
                        ClientKpiCard("הכנסה", "₪${String.format("%.0f", client.totalRevenue)}", Color(0xFF10B981), Modifier.weight(1f))
                        ClientKpiCard("ממוצע", "₪${if (client.totalDeliveries > 0) String.format("%.0f", client.totalRevenue / client.totalDeliveries) else "0"}", Color(0xFFF59E0B), Modifier.weight(1f))
                    }
                }

                // ─── Order History ─────────────────────────────────────────
                item {
                    SectionCard(title = "היסטוריית הזמנות") {
                        when (val state = ordersState) {
                            is UiState.Loading -> {
                                Box(modifier = Modifier.fillMaxWidth().padding(20.dp), contentAlignment = Alignment.Center) {
                                    CircularProgressIndicator(color = BrandBlue, modifier = Modifier.size(24.dp))
                                }
                            }
                            is UiState.Error -> {
                                Column(modifier = Modifier.padding(vertical = 8.dp)) {
                                    Text("שגיאה בטעינת הזמנות", fontSize = 13.sp, color = Color(0xFFEF4444))
                                    Text(state.message, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                            }
                            is UiState.Success -> {
                                if (state.data.isEmpty()) {
                                    Text("אין הזמנות קודמות ללקוח זה", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(vertical = 8.dp))
                                } else {
                                    state.data.forEach { order ->
                                    Row(
                                        modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Column(Modifier.weight(1f)) {
                                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                                Text("#${order.orderNumber}", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Navy950)
                                                OrderStatusBadge(order.status)
                                            }
                                            Text(order.pickupAddress, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1)
                                            Text("→ ${order.dropoffAddress}", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1)
                                        }
                                        Column(horizontalAlignment = Alignment.End) {
                                            if (order.deliveryFee > 0) {
                                                Text("₪${String.format("%.0f", order.deliveryFee)}", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Color(0xFF10B981))
                                            }
                                            order.createdAt?.let {
                                                Text(it.take(10), fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                            }
                                        }
                                    }
                                    if (order != state.data.last()) {
                                        HorizontalDivider(color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.3f))
                                    }
                                    }
                                }
                            }
                        }
                    }
                }

                // ─── Follow-up Tasks ─────────────────────────────────────────
                item {
                    SectionCard(title = "משימות פולו-אפ") {
                        when (val state = tasksState) {
                            is UiState.Loading -> {
                                Box(modifier = Modifier.fillMaxWidth().padding(20.dp), contentAlignment = Alignment.Center) {
                                    CircularProgressIndicator(color = BrandBlue, modifier = Modifier.size(24.dp))
                                }
                            }
                            is UiState.Error -> {
                                Column(modifier = Modifier.padding(vertical = 8.dp)) {
                                    Text("שגיאה בטעינת משימות", fontSize = 13.sp, color = Color(0xFFEF4444))
                                    Text(state.message, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                            }
                            is UiState.Success -> {
                                if (state.data.isEmpty()) {
                                    Text("אין משימות פולו-אפ ללקוח זה", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(vertical = 8.dp))
                                } else {
                                    state.data.forEach { task ->
                                        val priorityLabel = when (task.priority) { "high" -> "גבוהה"; "medium" -> "בינונית"; else -> "נמוכה" }
                                        val priorityColor = when (task.priority) { "high" -> Color(0xFFEF4444); "medium" -> Color(0xFFF59E0B); else -> Color(0xFF9CA3AF) }
                                        Row(
                                            modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp),
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Column(Modifier.weight(1f)) {
                                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                                    Text(task.title, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Navy950)
                                                    Surface(shape = RoundedCornerShape(4.dp), color = priorityColor.copy(alpha = 0.15f)) {
                                                        Text(priorityLabel, fontSize = 10.sp, color = priorityColor, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                                                    }
                                                    if (task.status == "open") {
                                                        Surface(shape = RoundedCornerShape(4.dp), color = BrandBlue.copy(alpha = 0.15f)) {
                                                            Text("פתוח", fontSize = 10.sp, color = BrandBlue, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                                                        }
                                                    }
                                                }
                                                if (task.description.isNotBlank()) {
                                                    Text(task.description, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 2)
                                                }
                                                if (task.dueDate != null) {
                                                    Text("יעד: ${task.dueDate.take(10)}", fontSize = 10.sp, color = Color(0xFFEF4444))
                                                }
                                            }
                                        }
                                        if (task != state.data.last()) {
                                            HorizontalDivider(color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.3f))
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // ─── Contact Info ──────────────────────────────────────────
                item {
                    SectionCard(title = "פרטי קשר") {
                        DetailRow(Icons.Default.Phone, client.phone) {
                            context.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:${client.phone}")))
                        }
                        if (client.email.isNotBlank()) {
                            HorizontalDivider(color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.3f))
                            DetailRow(Icons.Default.Email, client.email)
                        }
                        client.addresses.forEachIndexed { i, addr ->
                            HorizontalDivider(color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.3f))
                            DetailRow(Icons.Default.LocationOn, addr)
                        }
                    }
                }

                // ─── Notes ─────────────────────────────────────────────────
                if (client.notes.isNotBlank()) {
                    item {
                        SectionCard(title = "הערות") {
                            Text(client.notes, fontSize = 14.sp, color = Color.DarkGray)
                        }
                    }
                }

                // ─── Tags ──────────────────────────────────────────────────
                if (client.tags.isNotEmpty()) {
                    item {
                        SectionCard(title = "תגיות") {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                client.tags.forEach { tag ->
                                    Surface(
                                        color = BrandBlue.copy(alpha = 0.15f),
                                        shape = RoundedCornerShape(6.dp)
                                    ) {
                                        Text(
                                            tag,
                                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.SemiBold,
                                            color = BrandBlue
                                        )
                                    }
                                }
                            }
                        }
                    }
                }

                // ─── Timestamps ────────────────────────────────────────────
                item {
                    Card(
                        shape = RoundedCornerShape(14.dp),
                        colors = CardDefaults.cardColors(containerColor = AppleWhite),
                        elevation = CardDefaults.cardElevation(2.dp)
                    ) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            if (client.createdAt.isNotBlank()) {
                                DetailRow(Icons.Default.CalendarToday, "נוצר: ${client.createdAt}")
                            }
                            if (client.updatedAt.isNotBlank() && client.updatedAt != client.createdAt) {
                                HorizontalDivider(color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.3f))
                                DetailRow(Icons.Default.Update, "עודכן: ${client.updatedAt}")
                            }
                        }
                    }
                }

                // ─── Delete Button ─────────────────────────────────────────
                item {
                    Spacer(Modifier.height(20.dp))
                    OutlinedButton(
                        onClick = { showDeleteConfirm = true },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        border = BorderStroke(1.dp, Color(0xFFEF4444)),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFFEF4444))
                    ) {
                        Icon(Icons.Default.Delete, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(8.dp))
                        Text("מחק לקוח", fontWeight = FontWeight.Bold)
                    }
                    Spacer(Modifier.height(40.dp))
                }
            }
        }
    }

    // ─── Quote Dialog ───────────────────────────────────────────────────────
    if (showQuoteDialog) {
        QuoteDialog(
            client = client,
            onDismiss = { showQuoteDialog = false },
            onSend = { desc, price ->
                contactRepository?.let { repo ->
                    scope.launch { repo.sendQuote(client.id, desc, price) }
                }
                showQuoteDialog = false
            }
        )
    }

    // ─── Log Interaction Dialog ─────────────────────────────────────────────
    if (showLogDialog) {
        LogInteractionDialog(
            onDismiss = { showLogDialog = false },
            onSave = { message ->
                contactRepository?.let { repo ->
                    scope.launch { repo.logInteraction(client.id, message) }
                }
                showLogDialog = false
            }
        )
    }

    // ─── Delete Confirmation ────────────────────────────────────────────────
    if (showDeleteConfirm) {
        AlertDialog(
            onDismissRequest = { showDeleteConfirm = false },
            title = { Text("מחיקת לקוח", fontWeight = FontWeight.Black) },
            text = { Text("האם אתה בטוח שברצונך למחוק את ${client.name}? הפעולה不可逆.") },
            confirmButton = {
                Button(
                    onClick = {
                        contactRepository?.let { repo ->
                            scope.launch {
                                repo.deleteClient(client.id)
                                onBack()
                            }
                        }
                        showDeleteConfirm = false
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEF4444))
                ) { Text("מחק", color = Color.White) }
            },
            dismissButton = { TextButton(onClick = { showDeleteConfirm = false }) { Text("ביטול") } }
        )
    }

    // ─── Edit Dialog ────────────────────────────────────────────────────────
    if (showEditDialog) {
        EditClientDialog(
            client = client,
            onDismiss = { showEditDialog = false },
            onSave = { name, company, phone, email, addresses, isVIP, isBusiness, notes, tags ->
                contactRepository?.let { repo ->
                    scope.launch {
                        repo.updateClient(client.id, mapOf(
                            "name" to name,
                            "company" to company,
                            "phone" to phone,
                            "email" to email,
                            "addresses" to addresses,
                            "is_vip" to isVIP,
                            "is_business" to isBusiness,
                            "notes" to notes,
                            "tags" to tags
                        ))
                    }
                }
                showEditDialog = false
            }
        )
    }

    // ─── Follow-up Task Dialog ────────────────────────────────────────────────
    if (showTaskDialog) {
        FollowUpTaskDialog(
            clientName = client.name,
            state = taskState,
            onDismiss = { showTaskDialog = false; taskState = null },
            onCreate = { title, description, dueDate, priority ->
                scope.launch {
                    taskState = UiState.Loading
                    try {
                        contactRepository?.createClientTask(client.id, title, description, dueDate, priority)
                        showTaskDialog = false
                        taskState = null
                        tasksState = loadClientTasks()
                        ordersState = loadClientOrders()
                    } catch (e: Exception) {
                        taskState = UiState.Error(e.message ?: "שגיאה ביצירת משימה")
                    }
                }
            }
        )
    }
}

// ─── Reusable Components ─────────────────────────────────────────────────────

@Composable
fun ActionCircle(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    iconColor: Color,
    bgColor: Color,
    onClick: () -> Unit
) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        IconButton(
            onClick = onClick,
            modifier = Modifier
                .size(52.dp)
                .background(bgColor, CircleShape)
        ) {
            Icon(icon, contentDescription = label, tint = iconColor, modifier = Modifier.size(24.dp))
        }
        Spacer(Modifier.height(4.dp))
        Text(label, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = FontWeight.Medium)
    }
}

@Composable
fun ClientKpiCard(label: String, value: String, color: Color, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = AppleWhite),
        elevation = CardDefaults.cardElevation(2.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 14.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(value, fontWeight = FontWeight.Black, fontSize = 20.sp, color = color)
            Text(label, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
fun SectionCard(title: String, content: @Composable ColumnScope.() -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = AppleWhite),
        elevation = CardDefaults.cardElevation(2.dp)
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Text(title, fontWeight = FontWeight.Black, fontSize = 14.sp, color = Navy950)
            Spacer(Modifier.height(10.dp))
            content()
        }
    }
}

@Composable
fun DetailRow(icon: androidx.compose.ui.graphics.vector.ImageVector, text: String, onClick: (() -> Unit)? = null) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .then(if (onClick != null) Modifier.clickable { onClick() } else Modifier)
            .padding(vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(icon, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(18.dp))
        Spacer(Modifier.width(10.dp))
        Text(text, fontSize = 14.sp, color = if (onClick != null) Color(0xFF2563EB) else Color.DarkGray)
        if (onClick != null) {
            Spacer(Modifier.weight(1f))
            Icon(Icons.Default.Call, contentDescription = "חייג", tint = Color(0xFF2E7D32), modifier = Modifier.size(16.dp))
        }
    }
}

@Composable
fun OrderStatusBadge(status: String) {
    val (color, label) = when (status.lowercase()) {
        "delivered" -> Color(0xFF10B981) to "נמסר"
        "in_transit", "picked_up" -> Color(0xFF3B82F6) to "בדרך"
        "assigned" -> Color(0xFFF59E0B) to "הוקצה"
        "pending" -> Color(0xFF9CA3AF) to "ממתין"
        "cancelled" -> Color(0xFFEF4444) to "בוטל"
        "failed" -> Color(0xFFDC2626) to "נכשל"
        "arrived" -> Color(0xFF8B5CF6) to "הגיע"
        else -> Color(0xFF9CA3AF) to status
    }
    Surface(color = color.copy(alpha = 0.12f), shape = RoundedCornerShape(4.dp)) {
        Text(
            label,
            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold,
            color = color
        )
    }
}

// ─── Log Interaction Dialog ──────────────────────────────────────────────────

@Composable
fun LogInteractionDialog(
    onDismiss: () -> Unit,
    onSave: (String) -> Unit
) {
    var message by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("תיעוד אינטראקציה", fontWeight = FontWeight.Black) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("תעד שיחה, הודעה או אינטראקציה עם הלקוח", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                OutlinedTextField(
                    value = message,
                    onValueChange = { message = it },
                    label = { Text("תיאור האינטראקציה") },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(120.dp),
                    maxLines = 5
                )
            }
        },
        confirmButton = {
            Button(
                onClick = { if (message.isNotBlank()) onSave(message) },
                colors = ButtonDefaults.buttonColors(containerColor = Navy950),
                enabled = message.isNotBlank()
            ) { Text("שמור", color = BrandBlue) }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("ביטול") } }
    )
}

// ─── Edit Client Dialog ──────────────────────────────────────────────────────

@Composable
fun EditClientDialog(
    client: CourierContact,
    onDismiss: () -> Unit,
    onSave: (String, String, String, String, List<String>, Boolean, Boolean, String, List<String>) -> Unit
) {
    var name by remember { mutableStateOf(client.name) }
    var company by remember { mutableStateOf(client.company) }
    var phone by remember { mutableStateOf(client.phone) }
    var email by remember { mutableStateOf(client.email) }
    var addressesText by remember { mutableStateOf(client.addresses.joinToString("\n")) }
    var isVIP by remember { mutableStateOf(client.isVIP) }
    var isBusiness by remember { mutableStateOf(client.isBusiness) }
    var notes by remember { mutableStateOf(client.notes) }
    var tagsText by remember { mutableStateOf(client.tags.joinToString(", ")) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("עריכת ${client.name}", fontWeight = FontWeight.Black) },
        text = {
            Column(
                modifier = Modifier.verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                OutlinedTextField(name, { name = it }, label = { Text("שם *") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                OutlinedTextField(company, { company = it }, label = { Text("חברה") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                OutlinedTextField(phone, { phone = it }, label = { Text("טלפון") }, modifier = Modifier.fillMaxWidth(), singleLine = true, keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = androidx.compose.ui.text.input.KeyboardType.Phone))
                OutlinedTextField(email, { email = it }, label = { Text("אימייל") }, modifier = Modifier.fillMaxWidth(), singleLine = true, keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = androidx.compose.ui.text.input.KeyboardType.Email))
                OutlinedTextField(addressesText, { addressesText = it }, label = { Text("כתובות (שורה אחת כל אחת)") }, modifier = Modifier.fillMaxWidth(), minLines = 2, maxLines = 4)
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Switch(checked = isVIP, onCheckedChange = { isVIP = it })
                    Spacer(Modifier.width(8.dp))
                    Text("VIP ⭐", fontSize = 14.sp)
                    Spacer(Modifier.weight(1f))
                    Switch(checked = isBusiness, onCheckedChange = { isBusiness = it })
                    Spacer(Modifier.width(8.dp))
                    Text("עסק", fontSize = 14.sp)
                }
                OutlinedTextField(notes, { notes = it }, label = { Text("הערות") }, modifier = Modifier.fillMaxWidth(), minLines = 2, maxLines = 4)
                OutlinedTextField(tagsText, { tagsText = it }, label = { Text("תגיות (מופרדות בפסיק)") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    if (name.isNotBlank()) {
                        onSave(
                            name, company, phone, email,
                            addressesText.split("\n").map { it.trim() }.filter { it.isNotBlank() },
                            isVIP, isBusiness, notes,
                            tagsText.split(",").map { it.trim() }.filter { it.isNotBlank() }
                        )
                    }
                },
                colors = ButtonDefaults.buttonColors(containerColor = Navy950),
                enabled = name.isNotBlank()
            ) { Text("שמור", color = BrandBlue) }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("ביטול") } }
    )
}

// ─── Follow-up Task Dialog ──────────────────────────────────────────────────

@Composable
fun FollowUpTaskDialog(
    clientName: String,
    state: UiState<Unit>?,
    onDismiss: () -> Unit,
    onCreate: (title: String, description: String?, dueDate: String?, priority: String) -> Unit
) {
    var title by rememberSaveable { mutableStateOf("") }
    var description by rememberSaveable { mutableStateOf("") }
    var dueDate by rememberSaveable { mutableStateOf("") }
    var priority by rememberSaveable { mutableStateOf("medium") }

    val isLoading = state is UiState.Loading

    AlertDialog(
        onDismissRequest = { if (!isLoading) onDismiss() },
        title = { Text("משימת פולו-אפ ל$clientName", fontWeight = FontWeight.Black) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(title, { title = it }, label = { Text("כותרת *") }, modifier = Modifier.fillMaxWidth(), singleLine = true, enabled = !isLoading)
                OutlinedTextField(description, { description = it }, label = { Text("תיאור") }, modifier = Modifier.fillMaxWidth(), minLines = 2, maxLines = 4, enabled = !isLoading)
                OutlinedTextField(dueDate, { dueDate = it }, label = { Text("תאריך יעד (YYYY-MM-DD)") }, modifier = Modifier.fillMaxWidth(), singleLine = true, enabled = !isLoading)
                Text("עדיפות", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = FontWeight.SemiBold)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    PriorityChip("נמוכה", "low", priority, { priority = it })
                    PriorityChip("בינונית", "medium", priority, { priority = it })
                    PriorityChip("גבוהה", "high", priority, { priority = it })
                }
                if (isLoading) {
                    LinearProgressIndicator(modifier = Modifier.fillMaxWidth(), color = BrandBlue)
                }
                if (state is UiState.Error) {
                    Text(state.message, fontSize = 13.sp, color = Color(0xFFEF4444))
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    if (title.isNotBlank()) onCreate(title.trim(), description.trim().ifBlank { null }, dueDate.trim().ifBlank { null }, priority)
                },
                colors = ButtonDefaults.buttonColors(containerColor = Navy950),
                enabled = title.isNotBlank() && !isLoading
            ) { Text("צור משימה", color = BrandBlue) }
        },
        dismissButton = {
            TextButton(onClick = onDismiss, enabled = !isLoading) { Text("ביטול") }
        }
    )
}

@Composable
fun PriorityChip(label: String, value: String, selected: String, onSelect: (String) -> Unit) {
    val isSelected = selected == value
    val color = when (value) {
        "high" -> Color(0xFFEF4444)
        "medium" -> Color(0xFFF59E0B)
        else -> Color(0xFF9CA3AF)
    }
    Surface(
        modifier = Modifier.clickable { onSelect(value) },
        shape = RoundedCornerShape(8.dp),
        color = if (isSelected) color.copy(alpha = 0.15f) else Color.Transparent,
        border = if (isSelected) BorderStroke(1.dp, color) else BorderStroke(1.dp, MaterialTheme.colorScheme.onSurfaceVariant)
    ) {
        Text(label, modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp), fontSize = 13.sp, fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal, color = if (isSelected) color else MaterialTheme.colorScheme.onSurfaceVariant)
    }
}
