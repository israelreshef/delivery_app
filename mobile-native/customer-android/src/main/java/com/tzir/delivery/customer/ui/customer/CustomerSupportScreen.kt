package com.tzir.delivery.customer.ui.customer

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavHostController
import com.tzir.delivery.customer.repository.CustomerRepository
import com.tzir.delivery.customer.network.SocketManager
import com.tzir.delivery.customer.model.CustomerSupportDetail
import com.tzir.delivery.customer.ui.theme.*
import com.tzir.delivery.customer.ui.components.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

data class CustomerChatMessage(
    val id: String,
    val text: String,
    val isFromUser: Boolean,
    val timestamp: String
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CustomerSupportScreen(
    navController: NavHostController,
    repository: CustomerRepository,
    customerId: String
) {
    var isLoading by remember { mutableStateOf(true) }
    var ticketId by remember { mutableStateOf<Int?>(null) }
    var messages by remember { mutableStateOf(listOf<CustomerChatMessage>()) }
    var newMessage by remember { mutableStateOf("") }
    var isSending by remember { mutableStateOf(false) }
    var loadError by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    fun formatTimestamp(ts: String?): String {
        if (ts.isNullOrBlank()) return ""
        return try {
            val date = SimpleDateFormat("yyyy-MM-dd'T'HH:mm", Locale.getDefault()).parse(ts)
            SimpleDateFormat("HH:mm", Locale.getDefault()).format(date)
        } catch (e: Exception) {
            ts
        }
    }

    fun historyFromDetail(detail: CustomerSupportDetail?): List<CustomerChatMessage> {
        return detail?.messages.orEmpty()
            .filter { !it.isInternal }
            .map {
                CustomerChatMessage(
                    id = it.id.toString(),
                    text = it.message,
                    isFromUser = !it.isStaff,
                    timestamp = formatTimestamp(it.createdAt)
                )
            }
    }

    // Open (or create) a support ticket and load its history
    LaunchedEffect(Unit) {
        isLoading = true
        withContext(Dispatchers.IO) {
            try {
                val existing = repository.getSupportTickets().firstOrNull { it.isOpen }
                if (existing != null) {
                    ticketId = existing.id
                    messages = historyFromDetail(repository.getSupportTicketDetail(existing.id))
                } else {
                    val created = repository.createSupportTicket(
                        subject = "פניית תמיכה",
                        message = "שלום, רציתי לפתוח צאט עם התמיכה"
                    )
                    if (created != null && created.id > 0) {
                        ticketId = created.id
                        messages = emptyList()
                    } else {
                        loadError = "שגיאה בפתיחת הקריאה"
                    }
                }
            } catch (e: Exception) {
                loadError = "שגיאה בטעינת הצ'אט"
            }
        }
        isLoading = false
    }

    // Subscribe to realtime messages for this ticket while the screen is open
    DisposableEffect(ticketId) {
        val tid = ticketId
        if (tid != null) {
            SocketManager.joinSupportRoom(tid, customerId)
        }
        val listener = object : SocketManager.MessageListener {
            override fun onIncomingTicketMessage(incomingTicketId: Int, text: String, isFromAgent: Boolean, senderName: String?) {
                if (incomingTicketId != tid) return
                messages = messages + CustomerChatMessage(
                    id = System.currentTimeMillis().toString(),
                    text = text,
                    isFromUser = !isFromAgent,
                    timestamp = SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date())
                )
            }
        }
        SocketManager.addMessageListener(listener)
        onDispose {
            SocketManager.removeMessageListener(listener)
            if (tid != null) SocketManager.leaveSupportRoom(tid)
        }
    }

    val sendMessage = { text: String ->
        val tid = ticketId
        if (tid != null && text.isNotBlank() && !isSending) {
            scope.launch {
                isSending = true
                val sent = withContext(Dispatchers.IO) {
                    repository.addSupportTicketMessage(tid, text) != null
                }
                if (sent) {
                    messages = messages + CustomerChatMessage(
                        id = System.currentTimeMillis().toString(),
                        text = text,
                        isFromUser = true,
                        timestamp = "עכשיו"
                    )
                } else {
                    loadError = "שליחת ההודעה נכשלה"
                }
                isSending = false
            }
        }
    }

    PremiumBackground {
        Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = { navController.popBackStack() }) {
                    Icon(Icons.Default.ArrowBack, contentDescription = null, tint = BrandBlue)
                }
                Column {
                    Text("תמיכה טכנית", fontSize = 22.sp, fontWeight = FontWeight.Bold, color = Color.White)
                    Text(
                        if (ticketId != null) "מחובר • מענה מהיר" else "מתחבר...",
                        fontSize = 12.sp,
                        color = if (ticketId != null) Color(0xFF2E7D32) else Graphite400
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            Box(modifier = Modifier.weight(1f).fillMaxWidth()) {
                when {
                    isLoading -> {
                        CircularProgressIndicator(
                            modifier = Modifier.align(Alignment.Center),
                            color = BrandBlue
                        )
                    }
                    loadError != null -> {
                        Column(
                            modifier = Modifier.align(Alignment.Center),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text(loadError!!, color = Graphite400, fontSize = 15.sp)
                            Spacer(modifier = Modifier.height(16.dp))
                            Button(
                                onClick = { navController.popBackStack() },
                                colors = ButtonDefaults.buttonColors(containerColor = BrandBlue)
                            ) {
                                Text("חזרה")
                            }
                        }
                    }
                    else -> {
                        LazyColumn(
                            modifier = Modifier.fillMaxSize(),
                            verticalArrangement = Arrangement.spacedBy(12.dp),
                            contentPadding = PaddingValues(vertical = 8.dp)
                        ) {
                            items(messages) { message ->
                                Box(
                                    modifier = Modifier.fillMaxWidth(),
                                    contentAlignment = if (message.isFromUser) Alignment.CenterEnd else Alignment.CenterStart
                                ) {
                                    Surface(
                                        color = if (message.isFromUser) BrandBlue else Color(0xFF1E293B),
                                        shape = RoundedCornerShape(
                                            topStart = 16.dp,
                                            topEnd = 16.dp,
                                            bottomStart = if (message.isFromUser) 16.dp else 0.dp,
                                            bottomEnd = if (message.isFromUser) 0.dp else 16.dp
                                        ),
                                        tonalElevation = 2.dp,
                                        modifier = Modifier.widthIn(max = 280.dp)
                                    ) {
                                        Column(modifier = Modifier.padding(12.dp)) {
                                            Text(
                                                text = message.text,
                                                color = if (message.isFromUser) Color.White else Color.White,
                                                fontSize = 15.sp
                                            )
                                            Spacer(modifier = Modifier.height(4.dp))
                                            Text(
                                                text = message.timestamp,
                                                color = Color.White.copy(alpha = 0.6f),
                                                fontSize = 10.sp,
                                                modifier = Modifier.align(Alignment.End)
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            Row(
                modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                OutlinedTextField(
                    value = newMessage,
                    onValueChange = { newMessage = it },
                    placeholder = { Text("הקלד הודעה...") },
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(24.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = BrandBlue,
                        unfocusedBorderColor = Graphite400.copy(alpha = 0.5f)
                    )
                )
                Spacer(modifier = Modifier.width(12.dp))
                IconButton(
                    onClick = {
                        val text = newMessage.trim()
                        if (text.isNotBlank()) {
                            newMessage = ""
                            sendMessage(text)
                        }
                    },
                    enabled = !isSending && ticketId != null,
                    modifier = Modifier
                        .background(if (isSending) Graphite400.copy(alpha = 0.4f) else BrandBlue, CircleShape)
                        .size(48.dp)
                ) {
                    Text("🚀", fontSize = 20.sp)
                }
            }
        }
    }
}
