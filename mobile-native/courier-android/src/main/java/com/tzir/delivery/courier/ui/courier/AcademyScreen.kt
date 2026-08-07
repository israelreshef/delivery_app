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
import androidx.compose.material.icons.automirrored.filled.ArrowBack
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
    onCourseClick: (Int, Boolean) -> Unit
) {
    val courses by repository.academyCourses.collectAsState()
    val protocolCourses by repository.academyProtocolCourses.collectAsState()
    val certifications by repository.myCertifications.collectAsState()
    val gamificationProfile by repository.gamificationProfile.collectAsState(initial = null)
    val courierLevel = (gamificationProfile?.get("level") as? Number)?.toInt() ?: 1
    var isLoading by remember { mutableStateOf(true) }
    var selectedTab by remember { mutableStateOf(0) }

    LaunchedEffect(Unit) {
        isLoading = true
        repository.refreshAcademyCourses()
        repository.refreshAcademyProtocolCourses()
        repository.refreshMyCertifications()
        repository.refreshGamificationProfile()
        isLoading = false
    }

    PremiumBackground {
        Scaffold(
            topBar = {
                CenterAlignedTopAppBar(
                    title = { Text("TZIR Academy", fontWeight = FontWeight.Black, color = BrandBlue) },
                    navigationIcon = {
                        IconButton(onClick = onBack) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "חזור", tint = BrandBlue)
                        }
                    },
                    colors = TopAppBarDefaults.centerAlignedTopAppBarColors(containerColor = Color.Transparent)
                )
            },
            containerColor = Color.Transparent
        ) { padding ->
            Column(modifier = Modifier.padding(padding).fillMaxSize()) {
                GlassCard(
                    modifier = Modifier.fillMaxWidth().padding(16.dp),
                    cornerRadius = 20.dp
                ) {
                    Row(
                        modifier = Modifier.padding(20.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Surface(modifier = Modifier.size(56.dp), shape = CircleShape, color = BrandBlue.copy(alpha = 0.15f)) {
                            Box(contentAlignment = Alignment.Center) { Icon(Icons.Default.School, contentDescription = null, tint = BrandBlue, modifier = Modifier.size(32.dp)) }
                        }
                        Spacer(modifier = Modifier.width(16.dp))
                        Column {
                            Text("האקדמיה של ציר", fontWeight = FontWeight.Bold, fontSize = 20.sp, color = BrandBlue)
                            Text("השלם קורסים כדי לפתוח סוגי משלוחים יוקרתיים ולהרוויח יותר.", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                        }
                    }
                }

                val tiers = listOf("🚴 שליח רגיל", "⚖️ שליח משפטי", "📜 מסירה משפטית", "⚖️ זימון לבית משפט", "📦 מסירות קמעונאיות")
                val currentTierIdx = (courierLevel - 1).coerceIn(0, tiers.size - 1)
                val tierProgress = (gamificationProfile?.get("xp_progress") as? Number)?.toFloat() ?: 0.42f

                Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp, vertical = 8.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("${tiers[currentTierIdx]}", fontWeight = FontWeight.Black, fontSize = 18.sp, color = MaterialTheme.colorScheme.onSurface)
                        Spacer(Modifier.weight(1f))
                        Surface(color = BrandBlue, shape = RoundedCornerShape(8.dp)) {
                            Text("רמה $courierLevel", modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp), fontSize = 12.sp, fontWeight = FontWeight.Black, color = Graphite950)
                        }
                    }
                    Spacer(Modifier.height(12.dp))
                    LinearProgressIndicator(
                        progress = { tierProgress },
                        modifier = Modifier.fillMaxWidth().height(8.dp),
                        color = BrandBlue,
                        trackColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.1f),
                        strokeCap = androidx.compose.ui.graphics.StrokeCap.Round
                    )
                }

                TabRow(
                    selectedTabIndex = selectedTab,
                    containerColor = Color.Transparent,
                    contentColor = BrandBlue,
                    indicator = { tabPositions ->
                        TabRowDefaults.SecondaryIndicator(
                            Modifier.tabIndicatorOffset(tabPositions[selectedTab]),
                            color = BrandBlue
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
                    Tab(
                        selected = selectedTab == 2,
                        onClick = { selectedTab = 2 },
                        text = { Text("התעודות שלי", fontWeight = if (selectedTab == 2) FontWeight.Bold else FontWeight.Normal) }
                    )
                }

                Spacer(Modifier.height(16.dp))

                if (isLoading) {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = BrandBlue) }
                } else {
                    val currentItems = when (selectedTab) { 0 -> courses; 1 -> protocolCourses; else -> certifications }

                    if (currentItems.isEmpty()) {
                        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            val msg = when (selectedTab) { 0 -> "אין קורסים זמינים כרגע."; 1 -> "אין פרוטוקולים זמינים ללמידה."; else -> "אין תעודות עדיין. השלם קורס כדי לקבל תעודה."; }
                            Text(msg, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 16.sp)
                        }
                    } else {
                        LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                            if (selectedTab == 2) {
                                items(certifications) { certItem ->
                                    val cert = certItem as? Map<String, Any?> ?: return@items
                                    val courseTitle = cert["course_title"] as? String ?: ""
                                    val issuedAt = cert["issued_at"] as? String ?: ""
                                    val expiresAt = cert["expires_at"] as? String
                                    val status = cert["status"] as? String ?: "active"
                                    CertificationCard(courseTitle, issuedAt, expiresAt, status)
                                }
                            } else {
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
                    Text(title, fontWeight = FontWeight.Bold, fontSize = 18.sp, color = if (isLocked) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.onSurface)
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(description, fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 2)
                }

                if (isLocked) {
                    Icon(Icons.Default.Lock, null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                } else {
                    val icon = when(status) {
                        "permanent" -> Icons.Default.CheckCircle
                        "temporary" -> Icons.Default.Timer
                        else -> Icons.Default.PlayCircle
                    }
                    val color = if(status == "permanent") SuccessDark else BrandBlue
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
                val statusColor = if (status == "permanent") SuccessDark else BrandBlue

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
                        trackColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.05f),
                        strokeCap = androidx.compose.ui.graphics.StrokeCap.Round
                    )
                }
            }
        }
    }
}

@Composable
fun CertificationCard(courseTitle: String, issuedAt: String, expiresAt: String?, status: String) {
    GlassCard(modifier = Modifier.fillMaxWidth(), cornerRadius = 24.dp) {
        Row(
            modifier = Modifier.padding(20.dp).fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(modifier = Modifier.size(48.dp), shape = CircleShape, color = BrandBlue.copy(alpha = 0.15f)) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(Icons.Default.VerifiedUser, contentDescription = null, tint = BrandBlue, modifier = Modifier.size(28.dp))
                }
            }
            Spacer(modifier = Modifier.width(16.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(courseTitle, fontWeight = FontWeight.Bold, fontSize = 16.sp, color = MaterialTheme.colorScheme.onSurface)
                Spacer(modifier = Modifier.height(4.dp))
                Text("הונפק: $issuedAt", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                if (expiresAt != null) {
                    Text("תפוגה: $expiresAt", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
            val statusColor = if (status == "active") SuccessDark else Color.Red
            Text(if (status == "active") "פעיל" else "פג תוקף", fontSize = 12.sp, color = statusColor, fontWeight = FontWeight.Black)
        }
    }
}
