package com.tzir.delivery.courier.ui.courier

import androidx.compose.foundation.background
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.material3.TabRowDefaults.tabIndicatorOffset
import com.tzir.delivery.courier.ui.components.GlassCard
import com.tzir.delivery.courier.ui.components.PremiumBackground
import com.tzir.delivery.courier.ui.theme.*
import com.tzir.delivery.courier.repository.CourierRepository

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AcademyScreen(
    repository: CourierRepository,
    onBack: () -> Unit,
    onCourseClick: (Int, Boolean) -> Unit // (id, isProtocol)
) {
    val courses by repository.academyCourses.collectAsState()
    val protocolCourses by repository.academyProtocolCourses.collectAsState()
    val gamificationProfile by repository.gamificationProfile.collectAsState(initial = null)
    val courierLevel = (gamificationProfile?.get("level") as? Number)?.toInt() ?: 1
    var isLoading by remember { mutableStateOf(true) }
    var selectedTab by remember { mutableStateOf(0) } // 0: Standard, 1: Protocols

    LaunchedEffect(Unit) {
        isLoading = true
        repository.refreshAcademyCourses()
        repository.refreshAcademyProtocolCourses()
        repository.refreshGamificationProfile()
        isLoading = false
    }

    PremiumBackground {
        Scaffold(
            topBar = {
                CenterAlignedTopAppBar(
                    title = { Text("TZIR Academy", fontWeight = FontWeight.Black, color = AmberGold) },
                    navigationIcon = {
                        IconButton(onClick = onBack) {
                            Icon(Icons.Default.ArrowBack, contentDescription = "חזור", tint = AmberGold)
                        }
                    },
                    colors = TopAppBarDefaults.centerAlignedTopAppBarColors(containerColor = Color.Transparent)
                )
            },
            containerColor = Color.Transparent
        ) { padding ->
            Column(modifier = Modifier.padding(padding).fillMaxSize()) {
                
                // Header Banner
                GlassCard(
                    modifier = Modifier.fillMaxWidth().padding(16.dp),
                    cornerRadius = 20.dp
                ) {
                    Row(
                        modifier = Modifier.padding(20.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Surface(modifier = Modifier.size(56.dp), shape = CircleShape, color = AmberGold.copy(alpha = 0.15f)) {
                            Box(contentAlignment = Alignment.Center) { Icon(Icons.Default.School, contentDescription = null, tint = AmberGold, modifier = Modifier.size(32.dp)) }
                        }
                        Spacer(modifier = Modifier.width(16.dp))
                        Column {
                            Text("האקדמיה של ציר", fontWeight = FontWeight.Bold, fontSize = 20.sp, color = AmberGold)
                            Text("השלם קורסים כדי לפתוח סוגי משלוחים יוקרתיים ולהרוויח יותר.", fontSize = 13.sp, color = Color.White.copy(alpha = 0.6f))
                        }
                    }
                }

                // Tier Progression Banner
                val tiers = listOf("🚴 שליח רגיל", "⚖️ שליח משפטי", "📜 מסירה משפטית", "⚖️ זימון לבית משפט", "📦 מסירות קמעונאיות")
                val currentTierIdx = (courierLevel - 1).coerceIn(0, tiers.size - 1)
                val tierProgress = (gamificationProfile?.get("xp_progress") as? Number)?.toFloat() ?: 0.42f

                Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp, vertical = 8.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("${tiers[currentTierIdx]}", fontWeight = FontWeight.Black, fontSize = 18.sp, color = Color.White)
                        Spacer(Modifier.weight(1f))
                        Surface(color = AmberGold, shape = RoundedCornerShape(8.dp)) {
                            Text("רמה $courierLevel", modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp), fontSize = 12.sp, fontWeight = FontWeight.Black, color = Graphite950)
                        }
                    }
                    Spacer(Modifier.height(12.dp))
                    LinearProgressIndicator(
                        progress = { tierProgress },
                        modifier = Modifier.fillMaxWidth().height(8.dp),
                        color = AmberGold,
                        trackColor = Color.White.copy(alpha = 0.1f),
                        strokeCap = androidx.compose.ui.graphics.StrokeCap.Round
                    )
                }

                // Tabs
                TabRow(
                    selectedTabIndex = selectedTab,
                    containerColor = Color.Transparent,
                    contentColor = AmberGold,
                    indicator = { tabPositions ->
                        TabRowDefaults.SecondaryIndicator(
                            Modifier.tabIndicatorOffset(tabPositions[selectedTab]),
                            color = AmberGold
                        )
                    },
                    modifier = Modifier.padding(horizontal = 8.dp)
                ) {
                    Tab(
                        selected = selectedTab == 0,
                        onClick = { selectedTab = 0 },
                        text = { Text("הסמכות רמה", fontWeight = if (selectedTab == 0) FontWeight.Bold else FontWeight.Normal) }
                    )
                    Tab(
                        selected = selectedTab == 1,
                        onClick = { selectedTab = 1 },
                        text = { Text("פרוטוקולי מסירה", fontWeight = if (selectedTab == 1) FontWeight.Bold else FontWeight.Normal) }
                    )
                }

                Spacer(Modifier.height(16.dp))

                if (isLoading) {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = AmberGold) }
                } else {
                    val currentItems = if (selectedTab == 0) courses else protocolCourses
                    
                    if (currentItems.isEmpty()) {
                        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { 
                            Text(if (selectedTab == 0) "אין קורסים זמינים כרגע." else "אין פרוטוקולים זמינים ללמידה.", color = Color.Gray, fontSize = 16.sp) 
                        }
                    } else {
                        LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                            items(currentItems) { courseItem ->
                                val course = courseItem as? Map<String, Any?> ?: return@items
                                val id = (course["id"] as? Number)?.toInt() ?: 0
                                val title = course["title"] as? String ?: ""
                                val desc = course["description"] as? String ?: ""
                                val status = course["status"] as? String ?: "locked"
                                val reqLevel = (course["required_level"] as? Number)?.toInt() ?: 1
                                val progress = (course["progress"] as? Number)?.toFloat() ?: 0f

                                CoursePremiumCard(
                                    title = title,
                                    description = desc,
                                    status = status,
                                    progress = progress,
                                    requiredLevel = reqLevel,
                                    currentLevel = courierLevel,
                                    onClick = { if (status != "locked") onCourseClick(id, selectedTab == 1) }
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun CoursePremiumCard(
    title: String,
    description: String,
    status: String,
    progress: Float,
    requiredLevel: Int,
    currentLevel: Int,
    onClick: () -> Unit
) {
    val isLocked = status == "locked"
    
    GlassCard(
        modifier = Modifier.fillMaxWidth().clickable(enabled = !isLocked, onClick = onClick),
        cornerRadius = 24.dp
    ) {
        Column(modifier = Modifier.padding(20.dp)) {
            Row(verticalAlignment = Alignment.Top, horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(title, fontWeight = FontWeight.Bold, fontSize = 18.sp, color = if (isLocked) Color.Gray else Color.White)
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(description, fontSize = 14.sp, color = Color.Gray, maxLines = 2)
                }
                
                if (isLocked) {
                    Icon(Icons.Default.Lock, null, tint = Color.Gray)
                } else {
                    val icon = when(status) {
                        "permanent" -> Icons.Default.CheckCircle
                        "temporary" -> Icons.Default.Timer
                        else -> Icons.Default.PlayCircle
                    }
                    val color = if(status == "permanent") SuccessDark else AmberGold
                    Icon(icon, null, tint = color)
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            if (isLocked) {
                Surface(color = Color.Red.copy(alpha = 0.1f), shape = RoundedCornerShape(8.dp)) {
                    Text("דרושה רמה $requiredLevel (נוכחי: $currentLevel)", modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp), fontSize = 11.sp, color = Color.Red, fontWeight = FontWeight.Bold)
                }
            } else {
                val statusText = when (status) { "training" -> "בשלבי למידה"; "temporary" -> "הסמכה זמנית"; "permanent" -> "הסמכה קבועה"; else -> "זמין" }
                val statusColor = if (status == "permanent") SuccessDark else AmberGold

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(statusText, fontSize = 12.sp, color = statusColor, fontWeight = FontWeight.Black)
                    Spacer(modifier = Modifier.weight(1f))
                    if (progress > 0) Text("${progress.toInt()}%", fontSize = 12.sp, color = statusColor, fontWeight = FontWeight.Black)
                }
                
                if (progress > 0) {
                    Spacer(modifier = Modifier.height(10.dp))
                    LinearProgressIndicator(
                        progress = { progress / 100f },
                        modifier = Modifier.fillMaxWidth().height(6.dp),
                        color = statusColor,
                        trackColor = Color.White.copy(alpha = 0.05f),
                        strokeCap = androidx.compose.ui.graphics.StrokeCap.Round
                    )
                }
            }
        }
    }
}
