package com.tzir.delivery.android.ui.courier

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tzir.delivery.shared.repository.CourierRepository

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AcademyScreen(
    repository: CourierRepository,
    onBack: () -> Unit,
    onCourseClick: (Int) -> Unit
) {
    val courses by repository.academyCourses.collectAsState()
    val gamificationProfile by repository.gamificationProfile.collectAsState()
    val courierLevel = (gamificationProfile?.get("level") as? Number)?.toInt() ?: 1

    LaunchedEffect(Unit) {
        repository.refreshAcademyCourses()
        repository.refreshGamificationProfile()
    }

    Scaffold(
        topBar = {
            CenterAlignedTopAppBar(
                title = { Text("TZIR Academy", fontWeight = FontWeight.Black, color = MaterialTheme.colorScheme.secondary) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowForward, contentDescription = "חזור", tint = MaterialTheme.colorScheme.secondary)
                    }
                },
                colors = TopAppBarDefaults.centerAlignedTopAppBarColors(containerColor = Color.White)
            )
        },
        containerColor = MaterialTheme.colorScheme.background
    ) { padding ->
        Column(modifier = Modifier.padding(padding).fillMaxSize()) {
            
            // Header Banner
            Surface(
                modifier = Modifier.fillMaxWidth().padding(16.dp),
                shape = RoundedCornerShape(16.dp),
                color = MaterialTheme.colorScheme.primary.copy(alpha = 0.1f)
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.School, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(48.dp))
                    Spacer(modifier = Modifier.width(16.dp))
                    Column {
                        Text("האקדמיה של ציר", fontWeight = FontWeight.Bold, fontSize = 20.sp, color = MaterialTheme.colorScheme.secondary)
                        Text("השלם קורסים כדי לפתוח סוגי משלוחים יוקרתיים ולהרוויח יותר.", fontSize = 14.sp, color = Color.Gray)
                    }
                }
            }

            Text(
                "הקורסים שלי", 
                fontWeight = FontWeight.Bold, 
                modifier = Modifier.padding(horizontal = 24.dp, vertical = 8.dp),
                color = MaterialTheme.colorScheme.secondary
            )

            if (courses.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
                }
            } else {
                LazyColumn(contentPadding = PaddingValues(16.dp)) {
                    items(courses) { course ->
                        val id = (course["id"] as? Number)?.toInt() ?: 0
                        val title = course["title"] as? String ?: ""
                        val desc = course["description"] as? String ?: ""
                        val status = course["status"] as? String ?: "locked"
                        val reqLevel = (course["required_level"] as? Number)?.toInt() ?: 1
                        val progress = (course["progress"] as? Number)?.toFloat() ?: 0f

                        CourseCard(
                            title = title,
                            description = desc,
                            status = status,
                            progress = progress,
                            requiredLevel = reqLevel,
                            currentLevel = courierLevel,
                            onClick = { 
                                if (status != "locked") onCourseClick(id) 
                            }
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun CourseCard(
    title: String,
    description: String,
    status: String,
    progress: Float,
    requiredLevel: Int,
    currentLevel: Int,
    onClick: () -> Unit
) {
    val isLocked = status == "locked"
    val containerColor = if (isLocked) Color(0xFFF0F0F0) else Color.White
    val contentColor = if (isLocked) Color.Gray else MaterialTheme.colorScheme.secondary

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = 16.dp)
            .clickable(enabled = !isLocked, onClick = onClick),
        colors = CardDefaults.cardColors(containerColor = containerColor),
        elevation = CardDefaults.cardElevation(defaultElevation = if (isLocked) 0.dp else 4.dp),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.Top, horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(title, fontWeight = FontWeight.Bold, fontSize = 18.sp, color = contentColor)
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(description, fontSize = 14.sp, color = if(isLocked) Color.LightGray else Color.Gray, maxLines = 2)
                }
                
                if (isLocked) {
                    Icon(Icons.Default.Lock, contentDescription = "Locked", tint = Color.LightGray)
                } else if (status == "permanent") {
                    Icon(Icons.Default.CheckCircle, contentDescription = "Completed", tint = Color(0xFF4CAF50))
                } else if (status == "temporary") {
                    Icon(Icons.Default.Timer, contentDescription = "Temporary", tint = Color(0xFFFF9800))
                } else {
                    Icon(Icons.Default.PlayCircle, contentDescription = "Start", tint = MaterialTheme.colorScheme.primary)
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            if (isLocked) {
                Text(
                    "דרושה רמה $requiredLevel (נוכחי: $currentLevel)", 
                    fontSize = 12.sp, 
                    color = MaterialTheme.colorScheme.error,
                    fontWeight = FontWeight.Medium
                )
            } else if (status != "locked") {
                val statusText = when (status) {
                    "training" -> "בשלבי למידה"
                    "temporary" -> "הסמכה זמנית (בצע משלוחים מעשיים)"
                    "permanent" -> "הסמכה קבועה"
                    else -> "זמין"
                }
                val statusColor = when (status) {
                    "permanent" -> Color(0xFF4CAF50)
                    "temporary" -> Color(0xFFFF9800)
                    else -> MaterialTheme.colorScheme.primary
                }

                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                    Text(statusText, fontSize = 12.sp, color = statusColor, fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.weight(1f))
                    if (progress > 0) {
                        Text("${progress.toInt()}%", fontSize = 12.sp, color = statusColor, fontWeight = FontWeight.Bold)
                    }
                }
                
                if (progress > 0) {
                    Spacer(modifier = Modifier.height(8.dp))
                    LinearProgressIndicator(
                        progress = { progress / 100f },
                        modifier = Modifier.fillMaxWidth().height(6.dp),
                        color = statusColor,
                        trackColor = statusColor.copy(alpha = 0.2f),
                        strokeCap = androidx.compose.ui.graphics.StrokeCap.Round
                    )
                }
            }
        }
    }
}
