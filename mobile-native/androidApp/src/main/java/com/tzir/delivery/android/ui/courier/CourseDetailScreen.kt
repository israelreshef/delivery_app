package com.tzir.delivery.android.ui.courier

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowForward
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tzir.delivery.shared.repository.CourierRepository
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CourseDetailScreen(
    courseId: Int,
    repository: CourierRepository,
    onBack: () -> Unit
) {
    var courseDetails by remember { mutableStateOf<Map<String, Any>?>(null) }
    var isLoading by remember { mutableStateOf(true) }
    var isCompleting by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(courseId) {
        val details = repository.getCourseDetails(courseId)
        if (details.containsKey("error")) {
            error = details["error"] as String
        } else {
            courseDetails = details
        }
        isLoading = false
    }

    Scaffold(
        topBar = {
            val title = (courseDetails?.get("course") as? Map<String, Any>)?.get("title") as? String ?: "טוען..."
            CenterAlignedTopAppBar(
                title = { Text(title, fontWeight = FontWeight.Black, color = MaterialTheme.colorScheme.secondary) },
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
        if (isLoading) {
            Box(modifier = Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
            }
            return@Scaffold
        }

        if (error != null) {
            Box(modifier = Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                Text(error!!, color = MaterialTheme.colorScheme.error, fontWeight = FontWeight.Bold)
            }
            return@Scaffold
        }

        val course = courseDetails?.get("course") as? Map<String, Any> ?: emptyMap()
        val lessons = courseDetails?.get("lessons") as? List<Map<String, Any>> ?: emptyList()
        val status = course["status"] as? String ?: "locked"

        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(padding).padding(horizontal = 16.dp),
            contentPadding = PaddingValues(bottom = 80.dp)
        ) {
            item {
                Spacer(modifier = Modifier.height(16.dp))
                Text("תיאור הקורס", fontWeight = FontWeight.Bold, fontSize = 20.sp, color = MaterialTheme.colorScheme.secondary)
                Spacer(modifier = Modifier.height(8.dp))
                Text(course["description"] as? String ?: "", fontSize = 16.sp, color = Color.DarkGray)
                Spacer(modifier = Modifier.height(24.dp))
                Divider()
                Spacer(modifier = Modifier.height(24.dp))
                Text("תוכן ההכשרה", fontWeight = FontWeight.Bold, fontSize = 20.sp, color = MaterialTheme.colorScheme.secondary)
                Spacer(modifier = Modifier.height(16.dp))
            }

            items(lessons.size) { index ->
                val lesson = lessons[index]
                LessonCard(
                    title = lesson["title"] as? String ?: "",
                    content = lesson["content"] as? String ?: "",
                    number = index + 1
                )
            }

            item {
                Spacer(modifier = Modifier.height(32.dp))
                
                if (status == "training") {
                    Button(
                        onClick = {
                            if (isCompleting) return@Button
                            scope.launch {
                                isCompleting = true
                                val success = repository.completeCourseQuiz(course["id"].toString().toFloat().toInt())
                                if (success) {
                                    onBack() // Or show a success dialog
                                } else {
                                    isCompleting = false
                                }
                            }
                        },
                        modifier = Modifier.fillMaxWidth().height(56.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        if (isCompleting) {
                            CircularProgressIndicator(color = Color.White, modifier = Modifier.size(24.dp))
                        } else {
                            Text("סיימתי. התחל הסמכה זמנית", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                        }
                    }
                } else if (status == "temporary") {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFFFFF3E0)),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Column(modifier = Modifier.padding(16.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("🚀 הסמכה זמנית פעילה", fontWeight = FontWeight.Bold, color = Color(0xFFE65100))
                            Spacer(modifier = Modifier.height(8.dp))
                            Text("בצע 5 משלוחים מסוג זה כדי לסיים את ההסמכה הקבועה", fontSize = 14.sp)
                        }
                    }
                } else if (status == "permanent") {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFFE8F5E9)),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.CheckCircle, contentDescription = null, tint = Color(0xFF4CAF50), modifier = Modifier.size(32.dp))
                            Spacer(modifier = Modifier.width(16.dp))
                            Column {
                                Text("הסמכה מלאה", fontWeight = FontWeight.Bold, color = Color(0xFF2E7D32))
                                Text("אתה מוסמך לבצע משלוחים אלו", fontSize = 14.sp)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun LessonCard(title: String, content: String, number: Int) {
    Card(
        modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(2.dp),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = MaterialTheme.colorScheme.primary.copy(alpha = 0.1f),
                    modifier = Modifier.size(32.dp)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Text(number.toString(), fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                    }
                }
                Spacer(modifier = Modifier.width(12.dp))
                Text(title, fontWeight = FontWeight.Bold, fontSize = 18.sp, color = MaterialTheme.colorScheme.secondary)
            }
            Spacer(modifier = Modifier.height(12.dp))
            Text(content, fontSize = 15.sp, color = Color.DarkGray, lineHeight = 22.sp)
        }
    }
}
