
package com.tzir.delivery.android.ui.courier

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
import com.tzir.delivery.android.R
import com.tzir.delivery.android.ui.components.*
import com.tzir.delivery.android.ui.theme.*

data class AppNotification(
    val id: String,
    val title: String,
    val message: String,
    val timestamp: String,
    val type: String = "info" // info, order, warning
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotificationCenterScreen(onBack: () -> Unit) {
    val notifications = remember {
        mutableStateListOf(
            AppNotification("1", "משלוח חדש בקרבתך", "ישנה הזמנה חדשה במרחק 1.2 ק\"מ. לחץ לצפייה.", "10:30"),
            AppNotification("2", "עדכון מסמכים", "רישיון הנהיגה שלך עודכן בהצלחה במערכת.", "אתמול"),
            AppNotification("3", "טיפ חדש!", "קיבלת טיפ בסך ₪15 מהמשלוח האחרון.", "אתמול")
        )
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
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.Transparent, titleContentColor = MaterialTheme.colorScheme.onBackground)
            )
        },
        containerColor = Color.Transparent
    ) { padding ->
        PremiumBackground {
            Column(modifier = Modifier.padding(padding).fillMaxSize()) {
            if (notifications.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text(stringResource(R.string.no_notifications), color = Color.Gray)
                }
            } else {
                LazyColumn(modifier = Modifier.fillMaxSize()) {
                    items(notifications) { notification ->
                        NotificationItem(notification)
                        HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp), color = AppleGray)
                    }
                }
            }
            }
        }
    }
}

@Composable
fun NotificationItem(notification: AppNotification) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        val iconColor = when(notification.type) {
            "order" -> Color(0xFF2E7D32)
            "warning" -> Color(0xFFD32F2F)
            else -> PrimaryTurquoise
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
                Text(notification.title, fontWeight = FontWeight.Bold, fontSize = 16.sp, color = TextOfficial)
                Text(notification.timestamp, color = TextGray, fontSize = 12.sp)
            }
            Spacer(modifier = Modifier.height(4.dp))
            Text(notification.message, color = TextGray, fontSize = 14.sp)
        }
    }
}
