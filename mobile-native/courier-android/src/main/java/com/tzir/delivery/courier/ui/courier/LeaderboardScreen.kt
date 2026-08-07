package com.tzir.delivery.courier.ui.courier

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tzir.delivery.courier.ui.components.PremiumBackground
import com.tzir.delivery.courier.ui.theme.*
import com.tzir.delivery.courier.repository.CourierRepository

@Composable
fun LeaderboardScreen(
    repository: CourierRepository,
    onBack: () -> Unit
) {
    var leaderboardData by remember { mutableStateOf<List<Map<String, Any>>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }

    LaunchedEffect(Unit) {
        leaderboardData = repository.getGamificationLeaderboard()
        isLoading = false
    }

    PremiumBackground {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp)
        ) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(
                    onClick = onBack,
                    modifier = Modifier
                        .background(Color.White, CircleShape)
                        .size(40.dp)
                ) {
                    Icon(Icons.Default.ArrowBack, contentDescription = "חזור", tint = TextOfficial)
                }
                Spacer(modifier = Modifier.width(16.dp))
                Icon(
                    imageVector = Icons.Default.EmojiEvents,
                    contentDescription = "Leaderboard",
                    tint = Color(0xFFFFD700),
                    modifier = Modifier.size(32.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "מובילי החודש",
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold,
                    color = TextOfficial
                )
            }

            Spacer(modifier = Modifier.height(24.dp))

            if (isLoading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = BrandBlue)
                }
            } else if (leaderboardData.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("אין נתונים כרגע", color = TextGray)
                }
            } else {
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                    contentPadding = PaddingValues(bottom = 24.dp)
                ) {
                    items(leaderboardData) { courier ->
                        val rank = (courier["rank"] as? Number)?.toInt() ?: 0
                        val name = courier["courier_name"] as? String ?: "שליח"
                        val xp = (courier["xp"] as? Number)?.toInt() ?: 0
                        val level = (courier["level"] as? Number)?.toInt() ?: 1
                        val badge = courier["badge"] as? String ?: "Standard"

                        LeaderboardCard(
                            rank = rank,
                            name = name,
                            xp = xp,
                            level = level,
                            badge = badge
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun LeaderboardCard(
    rank: Int,
    name: String,
    xp: Int,
    level: Int,
    badge: String
) {
    val isTop3 = rank <= 3
    val cardColor = when (rank) {
        1 -> Color(0xFFFFF8E1) // Gold tint
        2 -> Color(0xFFFAFAFA) // Silver tint
        3 -> Color(0xFFFBE9E7) // Bronze tint
        else -> Color.White
    }
    
    val rankColor = when (rank) {
        1 -> Color(0xFFFFD700) // Gold
        2 -> Color(0xFFC0C0C0) // Silver
        3 -> Color(0xFFCD7F32) // Bronze
        else -> TextGray
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = cardColor),
        elevation = CardDefaults.cardElevation(defaultElevation = if (isTop3) 4.dp else 1.dp)
    ) {
        Row(
            modifier = Modifier
                .padding(16.dp)
                .fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Rank Circle
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .background(if (isTop3) rankColor.copy(alpha = 0.2f) else AppleWhite, CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "#$rank",
                    fontWeight = FontWeight.Black,
                    fontSize = 18.sp,
                    color = rankColor
                )
            }
            
            Spacer(modifier = Modifier.width(16.dp))
            
            // Name and Badge
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = name,
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp,
                    color = TextOfficial
                )
                Text(
                    text = badge,
                    fontSize = 12.sp,
                    color = TextGray
                )
            }
            
            // Stats
            Column(horizontalAlignment = Alignment.End) {
                Text(
                    text = "$xp XP",
                    fontWeight = FontWeight.Black,
                    fontSize = 16.sp,
                    color = BrandBlue
                )
                Text(
                    text = "רמה $level",
                    fontSize = 12.sp,
                    color = TextGray
                )
            }
        }
    }
}
