package com.tzir.delivery.courier.ui.courier

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tzir.delivery.courier.ui.components.*
import com.tzir.delivery.courier.ui.theme.*
import com.tzir.delivery.courier.services.SocketManager
import com.tzir.delivery.courier.network.DeliveryApi
import com.tzir.delivery.courier.repository.CourierRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

data class ChatMessage(
    val id: String,
    val text: String,
    val isFromUser: Boolean,
    val timestamp: String
)

fun getCurrentTime(): String {
    val sdf = SimpleDateFormat("HH:mm", Locale.getDefault())
    return sdf.format(Date())
}

fun formatMessageTimestamp(timestamp: String): String {
    if (timestamp.contains("T")) {
        try {
            val sdf = SimpleDateFormat("HH:mm", Locale.getDefault())
            val date = SimpleDateFormat("yyyy-MM-dd'T'HH:mm", Locale.getDefault()).parse(timestamp)
            return sdf.format(date)
        } catch (e: Exception) {
            return timestamp
        }
    }
    return timestamp
}

private suspend fun fetchChatHistory(api: DeliveryApi, ticketId: Int): List<ChatMessage> {
    return try {
        api.getSupportTicketDetail(ticketId)
            ?.messages
            ?.filter { !it.isInternal }
            ?.map {
                ChatMessage(
                    id = it.id.toString(),
                    text = it.message,
                    isFromUser = !it.isStaff,
                    timestamp = formatMessageTimestamp(it.createdAt ?: "")
                )
            } ?: emptyList()
    } catch (e: Exception) {
        emptyList()
    }
}

// Replaces the optimistic placeholder (temp:) with the real saved message, or
// ignores the update if that server message is already present in the list.
private fun List<ChatMessage>.applySavedMessage(saved: ChatMessage): List<ChatMessage> {
    val optimisticIndex = indexOfFirst { it.id.startsWith("temp:") && it.text == saved.text }
    if (optimisticIndex >= 0) {
        val list = toMutableList()
        list[optimisticIndex] = saved
        return list
    }
    if (indexOfFirst { it.id == saved.id } >= 0) return this
    return this + saved
}

// Adds a realtime (socket) message once, dropping echoes of a message that the
// UI already shows (optimistic copy or the saved copy of the same text).
private fun List<ChatMessage>.appendRealtimeMessage(realtime: ChatMessage): List<ChatMessage> {
    if (indexOfFirst { it.id == realtime.id } >= 0) return this
    if (indexOfFirst { it.text == realtime.text } >= 0) return this
    return this + realtime
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SupportChatScreen(
    onBack: () -> Unit,
    repository: CourierRepository,
    userId: String,
    initialMessages: List<ChatMessage> = emptyList()
) {
    var isLoading by remember { mutableStateOf(true) }
    var ticketId by remember { mutableStateOf<Int?>(null) }
    var messages by remember { mutableStateOf(initialMessages) }
    var newMessage by remember { mutableStateOf("") }
    var isSending by remember { mutableStateOf(false) }
    var loadError by remember { mutableStateOf<String?>(null) }
    var loadRetryKey by remember { mutableStateOf(0) }
    var sendError by remember { mutableStateOf(false) }
    var pendingSendText by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    // Open (or create) a support ticket and load its history
    LaunchedEffect(loadRetryKey) {
        isLoading = true
        withContext(Dispatchers.IO) {
            try {
                val api = repository.getApi()
                val existing = api.getSupportTickets().firstOrNull { it.isOpen }
                if (existing != null) {
                    ticketId = existing.id
                    messages = fetchChatHistory(api, existing.id)
                } else {
                    val created = api.createSupportTicket(
                        subject = "פניית תמיכה",
                        message = "שלום, רציתי לפתוח צאט עם התמיכה",
                        priority = "medium"
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
            SocketManager.joinSupportRoom(tid, userId)
        }
        val listener = object : SocketManager.MessageListener {
            override fun onIncomingTicketMessage(incomingTicketId: Int, text: String, isFromAgent: Boolean, senderName: String?) {
                if (incomingTicketId != tid) return
                messages = messages.appendRealtimeMessage(
                    ChatMessage(
                        id = "realtime:${System.currentTimeMillis()}",
                        text = text,
                        isFromUser = !isFromAgent,
                        timestamp = getCurrentTime()
                    )
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
                sendError = false
                val tempId = "temp:${System.currentTimeMillis()}"
                messages = messages + ChatMessage(
                    id = tempId,
                    text = text,
                    isFromUser = true,
                    timestamp = "עכשיו"
                )
                newMessage = ""
                pendingSendText = null
                val response = withContext(Dispatchers.IO) {
                    repository.getApi().addSupportTicketMessage(tid, text)
                }
                if (response != null) {
                    messages = messages.applySavedMessage(
                        ChatMessage(
                            id = response.id.toString(),
                            text = text,
                            isFromUser = true,
                            timestamp = getCurrentTime()
                        )
                    )
                } else {
                    sendError = true
                    pendingSendText = text
                    newMessage = text
                    messages = messages.filterNot { it.id == tempId }
                }
                isSending = false
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("תמיכה טכנית", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = TextOfficial)
                        Text(
                            if (ticketId != null) "מחובר • מענה מהיר" else "מתחבר...",
                            fontSize = 12.sp,
                            color = if (ticketId != null) Color(0xFF2E7D32) else TextGray
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Text("✕", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = TextOfficial)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.Transparent, titleContentColor = MaterialTheme.colorScheme.onBackground)
            )
        },
        bottomBar = {
            Surface(
                tonalElevation = 8.dp,
                modifier = Modifier.imePadding()
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    OutlinedTextField(
                        value = newMessage,
                        onValueChange = {
                            newMessage = it
                            if (sendError) {
                                sendError = false
                                pendingSendText = null
                            }
                        },
                        placeholder = { Text("הקלד הודעה...") },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(24.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = BrandBlue,
                            unfocusedBorderColor = TextGray.copy(alpha = 0.5f)
                        )
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    IconButton(
                        onClick = {
                            val text = newMessage.trim()
                            if (text.isNotBlank()) {
                                sendMessage(text)
                            }
                        },
                        enabled = !isSending && ticketId != null,
                        modifier = Modifier
                            .background(if (isSending) TextGray.copy(alpha = 0.4f) else BrandBlue, CircleShape)
                            .size(48.dp)
                    ) {
                        Text("🚀", fontSize = 20.sp)
                    }
                }
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
                when {
                    isLoading -> {
                        Box(
                            modifier = Modifier.fillMaxSize(),
                            contentAlignment = Alignment.Center
                        ) {
                            CircularProgressIndicator(color = BrandBlue)
                        }
                    }
                    loadError != null -> {
                        Column(
                            modifier = Modifier.fillMaxSize().padding(24.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.Center
                        ) {
                            Text(loadError!!, color = TextGray, fontSize = 15.sp)
                            Spacer(modifier = Modifier.height(16.dp))
                            Button(
                                onClick = { loadRetryKey++ },
                                colors = ButtonDefaults.buttonColors(containerColor = BrandBlue)
                            ) {
                                Text("נסה שוב")
                            }
                            Spacer(modifier = Modifier.height(8.dp))
                            TextButton(onClick = { onBack() }) {
                                Text("חזרה", color = TextGray)
                            }
                        }
                    }
                    else -> {
                        Column(modifier = Modifier.weight(1f)) {
                            LazyColumn(
                                modifier = Modifier
                                    .weight(1f)
                                    .padding(horizontal = 16.dp),
                                reverseLayout = false,
                                verticalArrangement = Arrangement.spacedBy(12.dp),
                                contentPadding = PaddingValues(vertical = 16.dp)
                            ) {
                                items(messages) { message ->
                                    ChatMessageItem(message)
                                }
                            }
                            if (sendError) {
                                Surface(
                                    color = Color(0xFFFFE5E5),
                                    shape = RoundedCornerShape(12.dp),
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(horizontal = 16.dp, vertical = 8.dp)
                                ) {
                                    Row(
                                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(
                                            "שליחת ההודעה נכשלה, בדוק את החיבור",
                                            color = Color(0xFFB3261E),
                                            fontSize = 13.sp,
                                            modifier = Modifier.weight(1f)
                                        )
                                        TextButton(
                                            onClick = {
                                                val text = pendingSendText ?: newMessage.trim()
                                                if (text.isNotBlank()) sendMessage(text) else sendError = false
                                            }
                                        ) {
                                            Text("נסה שוב", color = Color(0xFFB3261E), fontWeight = FontWeight.Bold)
                                        }
                                        TextButton(onClick = {
                                            sendError = false
                                            pendingSendText = null
                                        }) {
                                            Text("ביטול", color = TextGray)
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun ChatMessageItem(message: ChatMessage) {
    Box(
        modifier = Modifier.fillMaxWidth(),
        contentAlignment = if (message.isFromUser) Alignment.CenterEnd else Alignment.CenterStart
    ) {
        Surface(
            color = if (message.isFromUser) TextOfficial else AppleWhite,
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
                    color = if (message.isFromUser) Color.White else Color.Black,
                    fontSize = 15.sp
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = message.timestamp,
                    color = if (message.isFromUser) Color.White.copy(alpha = 0.6f) else Color.Gray,
                    fontSize = 10.sp,
                    modifier = Modifier.align(Alignment.End)
                )
            }
        }
    }
}
