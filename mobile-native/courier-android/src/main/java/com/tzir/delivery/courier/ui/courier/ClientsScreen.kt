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
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tzir.delivery.courier.ui.UiState
import com.tzir.delivery.courier.ui.theme.*
import com.tzir.delivery.courier.ui.components.PremiumBackground
import com.tzir.delivery.courier.model.CourierContact
import com.tzir.delivery.courier.model.DeliveryClient
import com.tzir.delivery.courier.repository.ContactRepository
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ClientsScreen(
    onBack: () -> Unit,
    onClientClick: ((CourierContact) -> Unit)? = null,
    contactRepository: ContactRepository? = null
) {
    var searchQuery by remember { mutableStateOf("") }
    var selectedTab by remember { mutableStateOf(0) }
    var showAddDialog by remember { mutableStateOf(false) }
    var showQuoteDialog by remember { mutableStateOf<CourierContact?>(null) }
    var filterVIP by remember { mutableStateOf(false) }
    var filterBusiness by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    val clients by contactRepository?.myClients?.collectAsState() ?: remember { mutableStateOf(emptyList()) }
    val deliveryClients by contactRepository?.deliveryClients?.collectAsState() ?: remember { mutableStateOf(emptyList()) }
    val isOffline by contactRepository?.isOffline?.collectAsState() ?: remember { mutableStateOf(false) }

    val clientsState: UiState<List<CourierContact>> by remember {
        derivedStateOf {
            when {
                isOffline && clients.isNotEmpty() -> UiState.Success(clients)
                clients.isEmpty() && !isOffline -> UiState.Loading
                else -> UiState.Success(clients)
            }
        }
    }

    val deliveryState: UiState<List<DeliveryClient>> by remember {
        derivedStateOf {
            when {
                isOffline && deliveryClients.isNotEmpty() -> UiState.Success(deliveryClients)
                deliveryClients.isEmpty() && !isOffline -> UiState.Loading
                else -> UiState.Success(deliveryClients)
            }
        }
    }

    LaunchedEffect(Unit) {
        contactRepository?.refreshMyClients()
        contactRepository?.refreshDeliveryClients()
    }

    val filtered = clients.filter { c ->
        val matchesSearch = searchQuery.isBlank() ||
            c.name.contains(searchQuery, ignoreCase = true) ||
            c.company.contains(searchQuery, ignoreCase = true) ||
            c.phone.contains(searchQuery, ignoreCase = true)
        val matchesVIP = !filterVIP || c.isVIP
        val matchesBusiness = !filterBusiness || c.isBusiness
        matchesSearch && matchesVIP && matchesBusiness
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("ניהול לקוחות אישיים", fontWeight = FontWeight.Black, color = BrandBlue) },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.Transparent, titleContentColor = BrandBlue),
                actions = {
                    IconButton(onClick = onBack) {
                        Text("✕", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = BrandBlue)
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { showAddDialog = true },
                containerColor = BrandBlue,
                contentColor = Navy950,
                shape = RoundedCornerShape(16.dp)
            ) { Icon(Icons.Default.Add, contentDescription = "הוסף לקוח") }
        },
        containerColor = Color.Transparent
    ) { padding ->
        PremiumBackground {
            Column(modifier = Modifier.padding(padding).fillMaxSize()) {

            Row(
                modifier = Modifier.fillMaxWidth().background(Navy950).padding(horizontal = 16.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                ClientTab("הרשימה שלי", selectedTab == 0, { selectedTab = 0 }, Modifier.weight(1f))
                ClientTab("משלוחים", selectedTab == 1, { selectedTab = 1 }, Modifier.weight(1f))
                ClientTab("סטטיסטיקה", selectedTab == 2, { selectedTab = 2 }, Modifier.weight(1f))
            }

            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
                placeholder = { Text("חיפוש לפי שם, חברה, טלפון...") },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant) },
                shape = RoundedCornerShape(12.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    unfocusedContainerColor = AppleWhite,
                    focusedContainerColor = AppleWhite,
                    unfocusedBorderColor = Color.Transparent,
                    focusedBorderColor = BrandBlue
                ),
                singleLine = true
            )

            if (selectedTab == 0) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 4.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    FilterChip(
                        selected = filterVIP,
                        onClick = { filterVIP = !filterVIP },
                        label = { Text("VIP ⭐", fontSize = 12.sp) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = Color(0xFFF59E0B).copy(alpha = 0.2f),
                            selectedLabelColor = Color(0xFFF59E0B)
                        )
                    )
                    FilterChip(
                        selected = filterBusiness,
                        onClick = { filterBusiness = !filterBusiness },
                        label = { Text("עסק 💼", fontSize = 12.sp) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = Color(0xFF3B82F6).copy(alpha = 0.15f),
                            selectedLabelColor = Color(0xFF3B82F6)
                        )
                    )
                    if (filterVIP || filterBusiness) {
                        TextButton(
                            onClick = { filterVIP = false; filterBusiness = false },
                            modifier = Modifier.height(32.dp)
                        ) {
                            Text("נקה סינון", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                    Spacer(Modifier.weight(1f))
                    Text("${filtered.size} לקוחות", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.align(Alignment.CenterVertically))
                }

                when (val state = clientsState) {
                    is UiState.Loading -> {
                        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            CircularProgressIndicator(color = BrandBlue)
                        }
                    }
                    is UiState.Error -> {
                        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Icon(Icons.Default.ErrorOutline, contentDescription = null, tint = Color(0xFFEF4444), modifier = Modifier.size(48.dp))
                                Spacer(Modifier.height(8.dp))
                                Text(state.message, color = Color(0xFFEF4444), fontSize = 14.sp)
                            }
                        }
                    }
                    else -> {
                        if (isOffline && clients.isNotEmpty()) {
                            Text(
                                "מצב לא מקוון — מציג נתונים שמורים",
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                fontSize = 12.sp,
                                modifier = Modifier.padding(horizontal = 16.dp)
                            )
                        }
                    }
                }

                if (filtered.isEmpty() && clientsState !is UiState.Loading) {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(Icons.Default.People, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(64.dp))
                            Spacer(Modifier.height(12.dp))
                            Text("לא נמצאו לקוחות", color = MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = FontWeight.Bold)
                            if (searchQuery.isNotBlank() || filterVIP || filterBusiness) {
                                Text("נסה לשנות את הסינון", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            } else {
                                Text("הוסף לקוח חדש עם כפתור ה+ למטה", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    }
                } else {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 80.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        items(filtered, key = { it.id }) { client ->
                            FullClientCard(
                                client = client,
                                onClientClick = { onClientClick?.invoke(client) },
                                onSendQuote = { showQuoteDialog = client },
                                onLogInteraction = { msg ->
                                        contactRepository?.let { repo ->
                                            scope.launch { repo.logInteraction(client.id, msg) }
                                        }
                                    }
                            )
                        }
                    }
                }
            } else if (selectedTab == 1) {
                DeliveryClientsTab(deliveryClients)
            } else {
                ClientStatsTab(clients = clients)
            }
        }
        }
    }

    if (showAddDialog) {
        AddClientDialog(
            onDismiss = { showAddDialog = false },
            onSave = { name, company, phone, address, isVIP, isBusiness ->
                contactRepository?.let { repo ->
                    scope.launch { repo.createClient(name, company, phone, addresses = listOf(address), isVIP = isVIP, isBusiness = isBusiness) }
                }
                showAddDialog = false
            }
        )
    }

    showQuoteDialog?.let { client ->
        QuoteDialog(client = client, onDismiss = { showQuoteDialog = null }, onSend = { desc, price ->
            contactRepository?.let { repo ->
                scope.launch { repo.sendQuote(client.id, desc, price) }
            }
            showQuoteDialog = null
        })
    }
}

@Composable
fun DeliveryClientsTab(clients: List<DeliveryClient>) {
    if (clients.isEmpty()) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Icon(Icons.Default.LocalShipping, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(64.dp))
                Spacer(Modifier.height(12.dp))
                Text("אין לקוחות ממשלוחים", color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text("לקוחות יופיעו כאן לאחר שתבצע משלוחים", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
        return
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        items(clients, key = { it.orderId }) { dc ->
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(containerColor = AppleWhite),
                elevation = CardDefaults.cardElevation(2.dp)
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Text(dc.name, fontWeight = FontWeight.Bold, fontSize = 15.sp, color = Navy950)
                    Text(dc.phone, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Spacer(Modifier.height(8.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.LocationOn, contentDescription = null, tint = Color(0xFF10B981), modifier = Modifier.size(14.dp))
                        Spacer(Modifier.width(4.dp))
                        Text("איסוף: ${dc.pickupAddress}", fontSize = 12.sp, color = Color.DarkGray)
                    }
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.LocationOn, contentDescription = null, tint = Color(0xFF3B82F6), modifier = Modifier.size(14.dp))
                        Spacer(Modifier.width(4.dp))
                        Text("מסירה: ${dc.dropoffAddress}", fontSize = 12.sp, color = Color.DarkGray)
                    }
                    if (dc.deliveryDate.isNotBlank()) {
                        Text("תאריך: ${dc.deliveryDate}", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        }
    }
}

@Composable
fun FullClientCard(
    client: CourierContact,
    onClientClick: () -> Unit = {},
    onSendQuote: () -> Unit = {},
    onLogInteraction: (String) -> Unit = {}
) {
    val context = LocalContext.current
    var expanded by remember { mutableStateOf(false) }
    var showLogField by remember { mutableStateOf(false) }
    var logMessage by remember { mutableStateOf("") }
    val borderMod = if (client.isVIP) Modifier.border(2.dp, Color(0xFFF59E0B), RoundedCornerShape(18.dp)) else Modifier

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .then(borderMod)
            .clickable { expanded = !expanded },
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = if (client.isVIP) Color(0xFFFFFBEB) else AppleWhite),
        elevation = CardDefaults.cardElevation(3.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(52.dp)
                        .background(Navy950, CircleShape)
                        .clickable { onClientClick() },
                    contentAlignment = Alignment.Center
                ) {
                    Text(client.name.first().toString(), color = BrandBlue, fontWeight = FontWeight.Black, fontSize = 22.sp)
                }

                Spacer(Modifier.width(14.dp))

                Column(Modifier.weight(1f).clickable { onClientClick() }) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text(client.name, fontWeight = FontWeight.Bold, fontSize = 17.sp, color = Navy950)
                        if (client.isVIP) {
                            Surface(color = Color(0xFFF59E0B), shape = RoundedCornerShape(6.dp)) {
                                Text("VIP", modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp), fontSize = 10.sp, fontWeight = FontWeight.Black, color = MaterialTheme.colorScheme.onSurface)
                            }
                        }
                        if (client.isBusiness) {
                            Surface(color = Color(0xFF3B82F6).copy(alpha = 0.15f), shape = RoundedCornerShape(6.dp)) {
                                Text("עסק", modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp), fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color(0xFF3B82F6))
                            }
                        }
                    }
                    if (client.company.isNotBlank()) Text(client.company, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text("אינטראקציה: ${client.lastInteraction}", fontSize = 11.sp, color = BrandBlue)
                }

                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    IconButton(
                        onClick = { context.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:${client.phone}"))) },
                        modifier = Modifier.size(38.dp).background(Color(0xFFE8F5E9), CircleShape)
                    ) { Icon(Icons.Default.Call, contentDescription = "שיחה", tint = Color(0xFF2E7D32), modifier = Modifier.size(18.dp)) }
                    IconButton(
                        onClick = { context.startActivity(Intent(Intent.ACTION_SENDTO, Uri.parse("smsto:${client.phone}"))) },
                        modifier = Modifier.size(38.dp).background(Color(0xFFE3F2FD), CircleShape)
                    ) { Icon(Icons.Default.Message, contentDescription = "SMS", tint = Color(0xFF1565C0), modifier = Modifier.size(18.dp)) }
                }
            }

            AnimatedVisibility(visible = expanded, enter = expandVertically(), exit = shrinkVertically()) {
                Column(modifier = Modifier.padding(top = 14.dp)) {
                    HorizontalDivider(color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f))
                    Spacer(Modifier.height(12.dp))

                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
                        MiniStat("משלוחים", "${client.totalDeliveries}", Color(0xFF3B82F6))
                        MiniStat("הכנסה", "₪${String.format("%.0f", client.totalRevenue)}", Color(0xFF10B981))
                        MiniStat("ממוצע", "₪${if (client.totalDeliveries > 0) String.format("%.0f", client.totalRevenue / client.totalDeliveries) else "0"}", Color(0xFFF59E0B))
                    }

                    Spacer(Modifier.height(12.dp))

                    client.addresses.forEach { addr ->
                        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(vertical = 2.dp)) {
                            Icon(Icons.Default.LocationOn, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(14.dp))
                            Spacer(Modifier.width(6.dp))
                            Text(addr, fontSize = 13.sp, color = Color.DarkGray)
                        }
                    }

                    if (client.notes.isNotBlank()) {
                        Spacer(Modifier.height(8.dp))
                        Surface(color = Color(0xFFFFF9C4), shape = RoundedCornerShape(8.dp)) {
                            Text(client.notes, modifier = Modifier.padding(8.dp), fontSize = 12.sp, color = Color(0xFF795548))
                        }
                    }

                    Spacer(Modifier.height(14.dp))

                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        OutlinedButton(
                            onClick = { onClientClick() },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Icon(Icons.Default.Visibility, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(6.dp))
                            Text("פרטים מלאים", fontSize = 13.sp)
                        }
                        OutlinedButton(
                            onClick = onSendQuote,
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(10.dp),
                            border = ButtonDefaults.outlinedButtonBorder.copy(width = 1.dp)
                        ) {
                            Icon(Icons.Default.RequestQuote, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(6.dp))
                            Text("הצעת מחיר", fontSize = 13.sp)
                        }
                    }

                    Spacer(Modifier.height(8.dp))

                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        if (showLogField) {
                            OutlinedTextField(
                                value = logMessage,
                                onValueChange = { logMessage = it },
                                modifier = Modifier.weight(1f),
                                placeholder = { Text("תעוד שיחה...", fontSize = 12.sp) },
                                singleLine = true,
                                shape = RoundedCornerShape(10.dp),
                                colors = OutlinedTextFieldDefaults.colors(
                                    unfocusedContainerColor = Color(0xFFEDE9FE),
                                    focusedContainerColor = Color(0xFFEDE9FE),
                                    unfocusedBorderColor = Color.Transparent
                                )
                            )
                            IconButton(
                                onClick = {
                                    if (logMessage.isNotBlank()) {
                                        onLogInteraction(logMessage)
                                        logMessage = ""
                                        showLogField = false
                                    }
                                },
                                modifier = Modifier.size(38.dp).background(Color(0xFF7C3AED), CircleShape)
                            ) { Icon(Icons.Default.Send, contentDescription = "שמור", tint = Color.White, modifier = Modifier.size(18.dp)) }
                        } else {
                            OutlinedButton(
                                onClick = { showLogField = true },
                                modifier = Modifier.weight(1f),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Icon(Icons.Default.EditNote, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(Modifier.width(6.dp))
                                Text("תעוד אינטראקציה", fontSize = 13.sp)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun MiniStat(label: String, value: String, color: Color) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(value, fontWeight = FontWeight.Black, fontSize = 18.sp, color = color)
        Text(label, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
fun ClientStatsTab(clients: List<CourierContact>) {
    val totalRevenue = clients.sumOf { it.totalRevenue }
    val totalDeliveries = clients.sumOf { it.totalDeliveries }
    val vipCount = clients.count { it.isVIP }
    val topClient = clients.maxByOrNull { it.totalRevenue }

    if (clients.isEmpty()) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Icon(Icons.Default.BarChart, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(64.dp))
                Spacer(Modifier.height(12.dp))
                Text("אין נתונים להצגה", color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text("הוסף לקוחות כדי לראות סטטיסטיקות", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
        return
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                KpiCard("סה\"כ הכנסה", "₪${String.format("%.0f", totalRevenue)}", Color(0xFF10B981), Modifier.weight(1f))
                KpiCard("משלוחים", "$totalDeliveries", Color(0xFF3B82F6), Modifier.weight(1f))
                KpiCard("לקוחות VIP", "$vipCount", Color(0xFFF59E0B), Modifier.weight(1f))
            }
        }
        item {
            topClient?.let { top ->
                Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(containerColor = Color(0xFFFFFBEB)), elevation = CardDefaults.cardElevation(2.dp)) {
                    Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                        Text("🏆", fontSize = 32.sp)
                        Spacer(Modifier.width(12.dp))
                        Column {
                            Text("לקוח מוביל", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text(top.name, fontWeight = FontWeight.Black, fontSize = 17.sp, color = Navy950)
                            Text("₪${String.format("%.0f", top.totalRevenue)} · ${top.totalDeliveries} משלוחים", fontSize = 13.sp, color = Color(0xFFF59E0B))
                        }
                    }
                }
            }
        }
        items(clients.sortedByDescending { it.totalRevenue }) { client ->
            Row(
                modifier = Modifier.fillMaxWidth().background(AppleWhite, RoundedCornerShape(12.dp)).padding(14.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(modifier = Modifier.size(38.dp).background(Navy950, CircleShape), contentAlignment = Alignment.Center) {
                    Text(client.name.first().toString(), color = BrandBlue, fontWeight = FontWeight.Black, fontSize = 16.sp)
                }
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) {
                    Text(client.name, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = Navy950)
                    Text("${client.totalDeliveries} משלוחים", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Text("₪${String.format("%.0f", client.totalRevenue)}", fontWeight = FontWeight.Black, fontSize = 15.sp, color = Color(0xFF10B981))
            }
        }
    }
}

@Composable
fun AddClientDialog(onDismiss: () -> Unit, onSave: (String, String, String, String, Boolean, Boolean) -> Unit) {
    var name by remember { mutableStateOf("") }
    var company by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var address by remember { mutableStateOf("") }
    var isVIP by remember { mutableStateOf(false) }
    var isBusiness by remember { mutableStateOf(false) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("לקוח חדש", fontWeight = FontWeight.Black) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(name, { name = it }, label = { Text("שם *") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                OutlinedTextField(company, { company = it }, label = { Text("חברה") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                OutlinedTextField(phone, { phone = it }, label = { Text("טלפון *") }, modifier = Modifier.fillMaxWidth(), singleLine = true, keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = androidx.compose.ui.text.input.KeyboardType.Phone))
                OutlinedTextField(address, { address = it }, label = { Text("כתובת") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Switch(checked = isVIP, onCheckedChange = { isVIP = it })
                    Spacer(Modifier.width(8.dp))
                    Text("VIP ⭐", fontSize = 14.sp)
                    Spacer(Modifier.weight(1f))
                    Switch(checked = isBusiness, onCheckedChange = { isBusiness = it })
                    Spacer(Modifier.width(8.dp))
                    Text("עסק", fontSize = 14.sp)
                }
            }
        },
        confirmButton = {
            Button(onClick = { if (name.isNotBlank() && phone.isNotBlank()) onSave(name, company, phone, address, isVIP, isBusiness) }, colors = ButtonDefaults.buttonColors(containerColor = Navy950)) {
                Text("שמור", color = BrandBlue)
            }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("ביטול") } }
    )
}

@Composable
fun QuoteDialog(client: CourierContact, onDismiss: () -> Unit, onSend: (String, Double) -> Unit = { _, _ -> }) {
    var description by remember { mutableStateOf("") }
    var price by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("הצעת מחיר ל${client.name}", fontWeight = FontWeight.Black) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(description, { description = it }, label = { Text("תיאור השירות") }, modifier = Modifier.fillMaxWidth(), maxLines = 3)
                OutlinedTextField(price, { price = it }, label = { Text("מחיר (₪)") }, modifier = Modifier.fillMaxWidth(), singleLine = true, keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = androidx.compose.ui.text.input.KeyboardType.Decimal))
                if (price.isNotBlank() && description.isNotBlank()) {
                    Surface(color = Color(0xFFE8F5E9), shape = RoundedCornerShape(10.dp)) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Text("תצוגה מקדימה", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = FontWeight.Bold)
                            Text("שירות: $description", fontSize = 13.sp)
                            Text("מחיר: ₪$price", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Color(0xFF2E7D32))
                        }
                    }
                }
            }
        },
        confirmButton = {
            Button(onClick = {
                val p = price.toDoubleOrNull()
                if (description.isNotBlank() && p != null) onSend(description, p)
                onDismiss()
            }, colors = ButtonDefaults.buttonColors(containerColor = Navy950)) {
                Text("שלח ללקוח", color = BrandBlue)
            }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("ביטול") } }
    )
}

@Composable
fun ClientTab(text: String, selected: Boolean, onClick: () -> Unit, modifier: Modifier = Modifier) {
    Box(
        modifier = modifier.clip(RoundedCornerShape(8.dp))
            .background(if (selected) BrandBlue.copy(alpha = 0.2f) else Color.Transparent)
            .clickable(onClick = onClick).padding(vertical = 12.dp),
        contentAlignment = Alignment.Center
    ) {
        Text(text, color = if (selected) BrandBlue else MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = FontWeight.Bold, fontSize = 14.sp)
    }
}
