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
import androidx.compose.ui.res.stringResource
import com.tzir.delivery.courier.R
import com.tzir.delivery.courier.model.CourierNotification
import com.tzir.delivery.courier.repository.NotificationRepository
import com.tzir.delivery.courier.ui.components.*
import com.tzir.delivery.courier.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotificationCenterScreen(
    onBack: () -> Unit,
    notificationRepository: NotificationRepository? = null
) {
    val notifications by (notificationRepository?.notifications?.collectAsState()
        ?: remember { mutableStateOf(emptyList()) })
    val loading by (notificationRepository?.loading?.collectAsState()
        ?: remember { mutableStateOf(false) })

    LaunchedEffect(Unit) {
        notificationRepository?.refresh()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.notifications), fontWeight = FontWeight.Bold, color = TextOfficial) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Text("✕", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = TextOfficial)
                    }
                },
                actions = {
                    if (notifications.any { !it.isRead }) {
                        TextButton(onClick = { notificationRepository?.markAllRead() }) {
                            Text("הכל נקרא", color = BrandBlue, fontSize = 14.sp)
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.Transparent, titleContentColor = MaterialTheme.colorScheme.onBackground)
            )
        },
        containerColor = Color.Transparent
    ) { padding ->
        PremiumBackground {
            Column(modifier = Modifier.padding(padding).fillMaxSize()) {
            if (loading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = BrandBlue)
                }
            } else if (notifications.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("אין התראות", color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            } else {
                LazyColumn(modifier = Modifier.fillMaxSize()) {
                    items(notifications) { notification ->
                        NotificationItem(
                            notification = notification,
                            onClick = { notificationRepository?.markRead(notification.id) }
                        )
                        HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp), color = AppleGray)
                    }
                }
            }
            }
        }
    }
}

@Composable
fun NotificationItem(
    notification: CourierNotification,
    onClick: () -> Unit = {}
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp)
            .then(
                if (!notification.isRead) Modifier.background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f), RoundedCornerShape(8.dp))
                else Modifier
            )
            .let { mod -> if (!notification.isRead) mod.padding(8.dp) else mod },
        verticalAlignment = Alignment.CenterVertically
    ) {
        val iconColor = when(notification.type) {
            "order" -> Color(0xFF2E7D32)
            "warning" -> Color(0xFFD32F2F)
            else -> BrandBlue
        }

        Box(
            modifier = Modifier
                .size(48.dp)
                .background(iconColor.copy(alpha = 0.1f), CircleShape),
            contentAlignment = Alignment.Center
        ) {
            Text(
                when(notification.type) {
                    "order" -> "📦"
                    "warning" -> "⚠️"
                    else -> "🔔"
                },
                fontSize = 20.sp
            )
        }

        Spacer(modifier = Modifier.width(16.dp))

        Column(modifier = Modifier.weight(1f)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(
                    notification.title,
                    fontWeight = if (!notification.isRead) FontWeight.Bold else FontWeight.Normal,
                    fontSize = 16.sp,
                    color = TextOfficial
                )
                Text(
                    notification.sentAt?.take(16)?.replace("T", " ") ?: "",
                    color = TextGray,
                    fontSize = 12.sp
                )
            }
            Spacer(modifier = Modifier.height(4.dp))
            Text(notification.message, color = TextGray, fontSize = 14.sp)
        }

        if (!notification.isRead) {
            Spacer(modifier = Modifier.width(8.dp))
            Box(modifier = Modifier.size(8.dp).background(BrandBlue, CircleShape))
        }
    }
}
