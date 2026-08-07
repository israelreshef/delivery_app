package com.tzir.delivery.courier.ui.courier

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.res.stringResource
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Star
import androidx.compose.foundation.background
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import com.tzir.delivery.courier.R
import com.tzir.delivery.courier.repository.RatingRepository
import com.tzir.delivery.courier.ui.components.*
import com.tzir.delivery.courier.ui.theme.*

@Composable
fun WorkerRatingScreen(onBack: () -> Unit, ratingRepository: RatingRepository? = null) {
    val stats by (ratingRepository?.stats?.collectAsState() ?: remember { mutableStateOf(com.tzir.delivery.courier.model.CourierRatingStats()) })
    val feedback by (ratingRepository?.feedback?.collectAsState() ?: remember { mutableStateOf(emptyList()) })
    val isOffline by (ratingRepository?.isOffline?.collectAsState() ?: remember { mutableStateOf(false) })

    LaunchedEffect(Unit) {
        ratingRepository?.refresh()
    }

    PremiumBackground {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp)
                .verticalScroll(rememberScrollState())
        ) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(
                    onClick = onBack,
                    modifier = Modifier.background(Color.White, CircleShape)
                ) {
                    Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                }
                Spacer(modifier = Modifier.width(16.dp))
                Text(
                    text = stringResource(R.string.worker_rating),
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Black,
                    color = TextOfficial
                )
            }

            Spacer(modifier = Modifier.height(32.dp))

            if (isOffline && stats.totalRatings == 0) {
                Text(
                    "מצב לא מקוון — מציג נתונים שמורים",
                    color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp,
                    modifier = Modifier.padding(bottom = 8.dp)
                )
            }

            // Overall Rating Card
            GlassCard(modifier = Modifier.fillMaxWidth(), cornerRadius = 24.dp) {
                Column(
                    modifier = Modifier.padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        stringResource(R.string.avg_rating),
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        String.format("%.1f", stats.averageRating),
                        fontSize = 56.sp,
                        fontWeight = FontWeight.Black,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        repeat(5) {
                            Icon(Icons.Default.Star, contentDescription = null, tint = Color(0xFFFFD700), modifier = Modifier.size(24.dp))
                        }
                    }
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        "מבוסס על ${stats.totalRatings} משלוחים",
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f),
                        fontSize = 12.sp
                    )
                }
            }

            Spacer(modifier = Modifier.height(32.dp))

            Text(
                stringResource(R.string.rating_details),
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = TextOfficial
            )

            Spacer(modifier = Modifier.height(16.dp))

            // Rating Breakdown
            RatingCategory(stringResource(R.string.service_quality), stats.serviceQuality)
            RatingCategory(stringResource(R.string.delivery_time), stats.deliveryTime)
            RatingCategory(stringResource(R.string.reliability), stats.reliability)

            Spacer(modifier = Modifier.height(32.dp))

            Text(
                "משובות אחרונות",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = TextOfficial
            )

            Spacer(modifier = Modifier.height(16.dp))

            if (feedback.isEmpty()) {
                Text(
                    "אין משובות להצגה עדיין",
                    color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 13.sp
                )
            } else {
                feedback.forEach { fb ->
                    val color = when {
                        (fb.ratingValue ?: 3) >= 4 -> Color(0xFF00E676)
                        (fb.ratingValue ?: 3) >= 3 -> Color(0xFFFFD700)
                        else -> Color(0xFFFF5252)
                    }
                    FeedbackItem(fb.tag, fb.createdAt, color, fb.comment)
                    Spacer(modifier = Modifier.height(8.dp))
                }
            }
        }
    }
}

@Composable
fun RatingCategory(label: String, rating: Float) {
    Card(
        modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        shape = RoundedCornerShape(16.dp)
    ) {
        Row(
            modifier = Modifier.padding(16.dp).fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(label, fontWeight = FontWeight.Bold, color = TextOfficial)

            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    String.format("%.1f", rating),
                    fontWeight = FontWeight.Black,
                    color = if (rating >= 4.5) Color(0xFF00E676) else if (rating >= 4.0) Color(0xFFFFD700) else Color(0xFFFF5252)
                )
                Spacer(modifier = Modifier.width(4.dp))
                Icon(Icons.Default.Star, contentDescription = null, tint = Color(0xFFFFD700), modifier = Modifier.size(16.dp))
            }
        }
    }
}

@Composable
fun FeedbackItem(tag: String, date: String, color: Color, comment: String?) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(Color.White, RoundedCornerShape(12.dp))
            .padding(16.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = Modifier
                    .size(12.dp)
                    .background(color, CircleShape)
            )
            Spacer(modifier = Modifier.width(12.dp))
            Column {
                Text(tag, fontWeight = FontWeight.Medium)
                if (!comment.isNullOrBlank()) {
                    Text(comment, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
        if (date.isNotBlank()) {
            Text(date, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
        }
    }
}
