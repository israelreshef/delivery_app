package com.tzir.delivery.courier.ui.courier

import android.content.Intent
import android.net.Uri
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import com.tzir.delivery.courier.ui.theme.AppleGray
import com.tzir.delivery.courier.ui.theme.AppleWhite
import com.tzir.delivery.courier.ui.theme.Amber
import com.tzir.delivery.courier.ui.theme.Navy950
import com.tzir.delivery.courier.ui.theme.*
import com.tzir.delivery.courier.ui.components.PremiumBackground

// ─── Data Model ──────────────────────────────────────────────────────────────
data class Client(
    val id: Int,
    val name: String,
    val company: String,
    val phone: String,
    val addresses: List<String>,
    val isVIP: Boolean = false,
    val isBusiness: Boolean = false,
    val totalDeliveries: Int = 0,
    val totalRevenue: Double = 0.0,
    val lastInteraction: String = "",
    val notes: String = ""
)

val sampleClients = mutableStateListOf(
    Client(1, "דני כהן", "טכנולוגיות דן", "050-1234567", listOf("תל אביב, רחוב דיזנגוף 45"), isVIP = true, isBusiness = true, totalDeliveries = 38, totalRevenue = 4200.0, lastInteraction = "היום, 10:30", notes = "מסמכים משפטיים בלבד"),
    Client(2, "מיכל לוי", "סטודיו מיכל", "052-9876543", listOf("הרצליה, שד׳ בן גוריון 12"), totalDeliveries = 14, totalRevenue = 980.0, lastInteraction = "אתמול", notes = ""),
    Client(3, "יוסי מזרחי", "מזרחי שילוח", "054-5556667", listOf("רמת גן, ביאליק 7", "גבעתיים, סוקולוב 3"), isBusiness = true, totalDeliveries = 61, totalRevenue = 8750.0, lastInteraction = "לפני יומיים")
)

// ─── Main Screen ─────────────────────────────────────────────────────────────
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ClientsScreen(onBack: () -> Unit) {
    var searchQuery by remember { mutableStateOf("") }
    var selectedTab by remember { mutableStateOf(0) }
    var showAddDialog by remember { mutableStateOf(false) }
    var expandedClientId by remember { mutableStateOf<Int?>(null) }
    var showQuoteDialog by remember { mutableStateOf<Client?>(null) }

    val filtered = sampleClients.filter {
        searchQuery.isBlank() || it.name.contains(searchQuery) || it.company.contains(searchQuery) || it.phone.contains(searchQuery)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("ניהול לקוחות אישיים", fontWeight = FontWeight.Black, color = Amber) },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.Transparent, titleContentColor = Amber),
                actions = {
                    IconButton(onClick = onBack) {
                        Text("✕", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = Amber)
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { showAddDialog = true },
                containerColor = Amber,
                contentColor = Navy950,
                shape = RoundedCornerShape(16.dp)
            ) { Icon(Icons.Default.Add, contentDescription = "הוסף לקוח") }
        },
        containerColor = Color.Transparent
    ) { padding ->
        PremiumBackground {
            Column(modifier = Modifier.padding(padding).fillMaxSize()) {

            // Tabs
            Row(
                modifier = Modifier.fillMaxWidth().background(Navy950).padding(horizontal = 16.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                ClientTab("הרשימה שלי", selectedTab == 0, { selectedTab = 0 }, Modifier.weight(1f))
                ClientTab("סטטיסטיקה", selectedTab == 1, { selectedTab = 1 }, Modifier.weight(1f))
            }

            // Search
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
                placeholder = { Text("חיפוש לפי שם, חברה, טלפון...") },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = Color.Gray) },
                shape = RoundedCornerShape(12.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    unfocusedContainerColor = AppleWhite,
                    focusedContainerColor = AppleWhite,
                    unfocusedBorderColor = Color.Transparent,
                    focusedBorderColor = Amber
                ),
                singleLine = true
            )

            if (selectedTab == 0) {
                // ─── Client List ───────────────────────────────────────────
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 80.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(filtered, key = { it.id }) { client ->
                        FullClientCard(
                            client = client,
                            expanded = expandedClientId == client.id,
                            onExpand = { expandedClientId = if (expandedClientId == client.id) null else client.id },
                            onSendQuote = { showQuoteDialog = client }
                        )
                    }
                }
            } else {
                // ─── Stats Tab ─────────────────────────────────────────────
                ClientStatsTab(clients = sampleClients.toList())
            }
        }
        }
    }

    // Add Client Dialog
    if (showAddDialog) {
        AddClientDialog(
            onDismiss = { showAddDialog = false },
            onSave = { name, company, phone, address, isVIP, isBusiness ->
                sampleClients.add(
                    Client(
                        id = sampleClients.size + 100,
                        name = name, company = company, phone = phone,
                        addresses = listOf(address), isVIP = isVIP, isBusiness = isBusiness
                    )
                )
                showAddDialog = false
            }
        )
    }

    // Quote Dialog
    showQuoteDialog?.let { client ->
        QuoteDialog(client = client, onDismiss = { showQuoteDialog = null })
    }
}

// ─── Full Client Card ──────────────────────────────────────────────────────
@Composable
fun FullClientCard(client: Client, expanded: Boolean, onExpand: () -> Unit, onSendQuote: () -> Unit) {
    val context = LocalContext.current
    val borderMod = if (client.isVIP) Modifier.border(2.dp, Color(0xFFF59E0B), RoundedCornerShape(18.dp)) else Modifier

    Card(
        modifier = Modifier.fillMaxWidth().then(borderMod).clickable { onExpand() },
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = if (client.isVIP) Color(0xFFFFFBEB) else AppleWhite),
        elevation = CardDefaults.cardElevation(3.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                // Avatar
                Box(
                    modifier = Modifier.size(52.dp).background(Navy950, CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Text(client.name.first().toString(), color = Amber, fontWeight = FontWeight.Black, fontSize = 22.sp)
                }

                Spacer(Modifier.width(14.dp))

                Column(Modifier.weight(1f)) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text(client.name, fontWeight = FontWeight.Bold, fontSize = 17.sp, color = Navy950)
                        if (client.isVIP) {
                            Surface(color = Color(0xFFF59E0B), shape = RoundedCornerShape(6.dp)) {
                                Text("VIP", modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp), fontSize = 10.sp, fontWeight = FontWeight.Black, color = Color.White)
                            }
                        }
                        if (client.isBusiness) {
                            Surface(color = Color(0xFF3B82F6).copy(alpha = 0.15f), shape = RoundedCornerShape(6.dp)) {
                                Text("עסק", modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp), fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color(0xFF3B82F6))
                            }
                        }
                    }
                    if (client.company.isNotBlank()) Text(client.company, fontSize = 13.sp, color = Color.Gray)
                    Text("אינטראקציה: ${client.lastInteraction}", fontSize = 11.sp, color = Amber)
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

            // Expandable details
            AnimatedVisibility(visible = expanded, enter = expandVertically(), exit = shrinkVertically()) {
                Column(modifier = Modifier.padding(top = 14.dp)) {
                    HorizontalDivider(color = Color.LightGray.copy(alpha = 0.5f))
                    Spacer(Modifier.height(12.dp))

                    // Stats row
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
                        MiniStat("משלוחים", "${client.totalDeliveries}", Color(0xFF3B82F6))
                        MiniStat("הכנסה", "₪${String.format("%.0f", client.totalRevenue)}", Color(0xFF10B981))
                        MiniStat("ממוצע", "₪${if (client.totalDeliveries > 0) String.format("%.0f", client.totalRevenue / client.totalDeliveries) else "0"}", Color(0xFFF59E0B))
                    }

                    Spacer(Modifier.height(12.dp))

                    // Addresses
                    client.addresses.forEach { addr ->
                        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(vertical = 2.dp)) {
                            Icon(Icons.Default.LocationOn, contentDescription = null, tint = Color.Gray, modifier = Modifier.size(14.dp))
                            Spacer(Modifier.width(6.dp))
                            Text(addr, fontSize = 13.sp, color = Color.DarkGray)
                        }
                    }

                    if (client.notes.isNotBlank()) {
                        Spacer(Modifier.height(8.dp))
                        Surface(color = Color(0xFFFFF9C4), shape = RoundedCornerShape(8.dp)) {
                            Text("📝 ${client.notes}", modifier = Modifier.padding(8.dp), fontSize = 12.sp, color = Color(0xFF795548))
                        }
                    }

                    Spacer(Modifier.height(14.dp))
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        OutlinedButton(
                            onClick = onSendQuote,
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(10.dp),
                            border = ButtonDefaults.outlinedButtonBorder.copy(width = 1.dp)
                        ) {
                            Icon(Icons.Default.RequestQuote, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(6.dp))
                            Text("שלח הצעת מחיר", fontSize = 13.sp)
                        }
                        Button(
                            onClick = { /* Create mission for this client */ },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(10.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = Navy950)
                        ) {
                            Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(6.dp))
                            Text("משלוח חדש", fontSize = 13.sp)
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
        Text(label, fontSize = 11.sp, color = Color.Gray)
    }
}

// ─── Stats Tab ─────────────────────────────────────────────────────────────
@Composable
fun ClientStatsTab(clients: List<Client>) {
    val totalRevenue = clients.sumOf { it.totalRevenue }
    val totalDeliveries = clients.sumOf { it.totalDeliveries }
    val vipCount = clients.count { it.isVIP }
    val topClient = clients.maxByOrNull { it.totalRevenue }

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
                            Text("לקוח מוביל", fontSize = 12.sp, color = Color.Gray)
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
                    Text(client.name.first().toString(), color = Amber, fontWeight = FontWeight.Black, fontSize = 16.sp)
                }
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) {
                    Text(client.name, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = Navy950)
                    Text("${client.totalDeliveries} משלוחים", fontSize = 12.sp, color = Color.Gray)
                }
                Text("₪${String.format("%.0f", client.totalRevenue)}", fontWeight = FontWeight.Black, fontSize = 15.sp, color = Color(0xFF10B981))
            }
        }
    }
}

// ─── Add Client Dialog ─────────────────────────────────────────────────────
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
                    Text("לקוח VIP ⭐", fontSize = 14.sp)
                    Spacer(Modifier.weight(1f))
                    Switch(checked = isBusiness, onCheckedChange = { isBusiness = it })
                    Spacer(Modifier.width(8.dp))
                    Text("עסק", fontSize = 14.sp)
                }
            }
        },
        confirmButton = {
            Button(onClick = { if (name.isNotBlank() && phone.isNotBlank()) onSave(name, company, phone, address, isVIP, isBusiness) }, colors = ButtonDefaults.buttonColors(containerColor = Navy950)) {
                Text("שמור", color = Amber)
            }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("ביטול") } }
    )
}

// ─── Quote Dialog ──────────────────────────────────────────────────────────
@Composable
fun QuoteDialog(client: Client, onDismiss: () -> Unit) {
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
                            Text("תצוגה מקדימה", fontSize = 11.sp, color = Color.Gray, fontWeight = FontWeight.Bold)
                            Text("שירות: $description", fontSize = 13.sp)
                            Text("מחיר: ₪$price", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Color(0xFF2E7D32))
                        }
                    }
                }
            }
        },
        confirmButton = {
            Button(onClick = onDismiss, colors = ButtonDefaults.buttonColors(containerColor = Navy950)) {
                Text("שלח ללקוח", color = Amber)
            }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("ביטול") } }
    )
}

// ─── ClientTab ─────────────────────────────────────────────────────────────
@Composable
fun ClientTab(text: String, selected: Boolean, onClick: () -> Unit, modifier: Modifier = Modifier) {
    Box(
        modifier = modifier.clip(RoundedCornerShape(8.dp))
            .background(if (selected) Amber.copy(alpha = 0.2f) else Color.Transparent)
            .clickable(onClick = onClick).padding(vertical = 12.dp),
        contentAlignment = Alignment.Center
    ) {
        Text(text, color = if (selected) Amber else Color.Gray, fontWeight = FontWeight.Bold, fontSize = 14.sp)
    }
}
