package com.tzir.delivery.android.ui.courier

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tzir.delivery.android.ui.components.*

data class ClientEntry(
    val id: String,
    val name: String,
    val phone: String,
    val address: String,
    val totalOrders: Int
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ClientsScreen(onBack: () -> Unit) {
    val clients = remember {
        mutableStateListOf(
            ClientEntry("1", "ישראל ישראלי", "050-1234567", "הרצל 10, תל אביב", 12),
            ClientEntry("2", "חנות פרחים דנה", "03-5556677", "דיזינגוף 100, תל אביב", 45),
            ClientEntry("3", "משרד רו\"ח כהן", "054-9876543", "רוטשילד 22, תל אביב", 8)
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("ניהול לקוחות", fontWeight = FontWeight.Bold, color = TextOfficial) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Text("✕", fontSize = 20.sp, fontWeight = FontWeight.Bold)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.White)
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .padding(padding)
                .fillMaxSize()
                .background(AppleGray)
                .padding(16.dp)
        ) {
            Text(
                "לקוחות קבועים",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Black,
                color = TextOfficial
            )
            
            Spacer(modifier = Modifier.height(24.dp))
            
            LazyColumn(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                items(clients) { client ->
                    ClientItem(client)
                }
            }
        }
    }
}

@Composable
fun ClientItem(client: ClientEntry) {
    GlassCard(
        modifier = Modifier.fillMaxWidth(),
        cornerRadius = 24.dp
    ) {
        Row(
            modifier = Modifier.padding(20.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(
                modifier = Modifier.size(48.dp),
                shape = CircleShape,
                color = PrimaryTurquoise.copy(alpha = 0.1f)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Text(client.name.take(1), fontWeight = FontWeight.Bold, color = Color(0xFF001C44))
                }
            }
            
            Spacer(modifier = Modifier.width(16.dp))
            
            Column(modifier = Modifier.weight(1f)) {
                Text(client.name, fontWeight = FontWeight.Bold, fontSize = 16.sp, color = TextOfficial)
                Text("${client.totalOrders} משלוחים", fontSize = 12.sp, color = TextGray)
            }
            
            IconButton(
                onClick = { /* Call client logic */ },
                modifier = Modifier.background(PrimaryTurquoise.copy(alpha = 0.1f), CircleShape)
            ) {
                Icon(Icons.Default.Phone, contentDescription = "Call", tint = PrimaryTurquoise)
            }
        }
    }
}
