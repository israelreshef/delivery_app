package com.tzir.delivery.android.ui.courier

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
import com.tzir.delivery.android.R
import com.tzir.delivery.android.ui.components.*

@Composable
fun WorkerRatingScreen(onBack: () -> Unit) {
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
            
            // Overall Rating Card
            OfficialCard(modifier = Modifier.fillMaxWidth(), cornerRadius = 24.dp) {
                Column(
                    modifier = Modifier.padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        stringResource(R.string.avg_rating),
                        color = Color.White.copy(alpha = 0.7f),
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        "4.9",
                        fontSize = 56.sp,
                        fontWeight = FontWeight.Black,
                        color = Color.White
                    )
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        repeat(5) {
                            Icon(Icons.Default.Star, contentDescription = null, tint = Color(0xFFFFD700), modifier = Modifier.size(24.dp))
                        }
                    }
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        "Based on 154 deliveries",
                        color = Color.White.copy(alpha=0.5f),
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
            RatingCategory(stringResource(R.string.service_quality), 5.0f)
            RatingCategory(stringResource(R.string.delivery_time), 4.8f)
            RatingCategory(stringResource(R.string.reliability), 4.9f)
            
            Spacer(modifier = Modifier.height(32.dp))
            
            Text(
                "Recently Reported Issues",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = TextOfficial
            )
            
            Spacer(modifier = Modifier.height(16.dp))
            
            // Feedback Items (Mock)
            FeedbackItem("Late Delivery", "2 days ago", Color(0xFFFF5252))
            FeedbackItem("Friendly Service", "5 days ago", Color(0xFF00E676))
            FeedbackItem("Package Handling", "1 week ago", Color(0xFFFFD700))
        }
    }
}

@Composable
fun RatingCategory(label: String, rating: Float) {
    Card(
        modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        shape = androidx.compose.foundation.shape.RoundedCornerShape(16.dp)
    ) {
        Row(
            modifier = Modifier.padding(16.dp).fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(label, fontWeight = FontWeight.Bold, color = TextOfficial)
            
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    rating.toString(),
                    fontWeight = FontWeight.Black,
                    color = if(rating >= 4.5) Color(0xFF00E676) else if(rating >= 4.0) Color(0xFFFFD700) else Color(0xFFFF5252)
                )
                Spacer(modifier = Modifier.width(4.dp))
                Icon(Icons.Default.Star, contentDescription = null, tint = Color(0xFFFFD700), modifier = Modifier.size(16.dp))
            }
        }
    }
}

@Composable
fun FeedbackItem(tag: String, date: String, color: Color) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp)
            .background(Color.White, RoundedCornerShape(12.dp))
            .padding(16.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            androidx.compose.foundation.layout.Box(
                modifier = Modifier
                    .size(12.dp)
                    .background(color, CircleShape)
            )
            Spacer(modifier = Modifier.width(12.dp))
            Text(tag, fontWeight = FontWeight.Medium)
        }
        Text(date, color = Color.Gray, fontSize = 12.sp)
    }
}
