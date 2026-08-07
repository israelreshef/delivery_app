package com.tzir.delivery.courier.ui.courier

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tzir.delivery.courier.repository.CourierRepository
import com.tzir.delivery.courier.ui.components.PremiumBackground
import com.tzir.delivery.courier.ui.theme.BrandBlue
import com.tzir.delivery.courier.ui.theme.Navy950
import kotlinx.coroutines.launch

@Composable
fun CourseDetailScreen(
    courseId: Int,
    repository: CourierRepository,
    isProtocol: Boolean = false,
    onBack: () -> Unit
) {
    var courseDetails by remember { mutableStateOf<Map<String, Any>?>(null) }
    var isLoading by remember { mutableStateOf(true) }
    var isCompleting by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(courseId, isProtocol) {
        isLoading = true
        error = null
        val details = if (isProtocol) {
            repository.getAcademyProtocolCourseContent(courseId)
        } else {
            repository.getCourseDetails(courseId)
        }

        if (details?.containsKey("error") == true) {
            error = details["error"] as? String ?: "Unknown error"
        } else {
            courseDetails = details
        }
        isLoading = false
    }

    Scaffold(
        topBar = {
            val title = ((courseDetails?.get("course") as? Map<String, Any>)?.get("title") as? String) ?: "Course"
            CenterAlignedTopAppBar(
                title = { Text(title, fontWeight = FontWeight.Black, color = BrandBlue) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = BrandBlue)
                    }
                },
                colors = TopAppBarDefaults.centerAlignedTopAppBarColors(containerColor = Color.Transparent)
            )
        },
        containerColor = Color.Transparent
    ) { padding ->
        PremiumBackground {
            when {
                isLoading -> {
                    Box(modifier = Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = BrandBlue)
                    }
                }

                error != null -> {
                    Box(modifier = Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                        Text(error!!, color = MaterialTheme.colorScheme.error, fontWeight = FontWeight.Bold)
                    }
                }

                else -> {
                    val course = courseDetails?.get("course") as? Map<String, Any> ?: emptyMap()
                    @Suppress("UNCHECKED_CAST")
                    val lessons = courseDetails?.get("lessons") as? List<Map<String, Any>> ?: emptyList()
                    val status = course["status"] as? String ?: "locked"

                    LazyColumn(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(padding)
                            .padding(horizontal = 16.dp),
                        contentPadding = PaddingValues(bottom = 80.dp)
                    ) {
                        item {
                            Spacer(modifier = Modifier.height(16.dp))
                            Text("Course description", fontWeight = FontWeight.Bold, fontSize = 20.sp, color = BrandBlue)
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(course["description"] as? String ?: "", fontSize = 16.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.85f))
                            Spacer(modifier = Modifier.height(24.dp))
                            HorizontalDivider(color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.2f))
                            Spacer(modifier = Modifier.height(24.dp))
                            Text("Lessons", fontWeight = FontWeight.Bold, fontSize = 20.sp, color = BrandBlue)
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
                            when (status) {
                                "training", "in_progress" -> {
                                    if (isProtocol) {
                                        QuizScreen(
                                            courseId = courseId,
                                            repository = repository,
                                            onBack = onBack,
                                            onQuizPassed = onBack
                                        )
                                    } else {
                                        Button(
                                            onClick = {
                                                scope.launch {
                                                    isCompleting = true
                                                    val success = repository.completeCourseQuiz(courseId)
                                                    isCompleting = false
                                                    if (success) onBack() else error = "Failed to complete theory"
                                                }
                                            },
                                            modifier = Modifier.fillMaxWidth().height(56.dp),
                                            colors = ButtonDefaults.buttonColors(containerColor = BrandBlue, contentColor = Navy950),
                                            shape = RoundedCornerShape(12.dp)
                                        ) {
                                            Text(
                                                if (isCompleting) "Completing..." else "Complete theory",
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 18.sp
                                            )
                                        }
                                    }
                                }

                                "temporary" -> {
                                    Card(
                                        modifier = Modifier.fillMaxWidth(),
                                        colors = CardDefaults.cardColors(containerColor = Color(0xFFFFF3E0).copy(alpha = 0.15f)),
                                        shape = RoundedCornerShape(12.dp)
                                    ) {
                                        Column(
                                            modifier = Modifier.padding(16.dp),
                                            horizontalAlignment = Alignment.CenterHorizontally
                                        ) {
                                            Text("Temporary certification active", fontWeight = FontWeight.Bold, color = Color(0xFFE65100))
                                            Spacer(modifier = Modifier.height(8.dp))
                                            Text("Complete real deliveries to unlock the permanent certification.", fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurface)
                                        }
                                    }
                                }

                                "permanent", "passed" -> {
                                    Card(
                                        modifier = Modifier.fillMaxWidth(),
                                        colors = CardDefaults.cardColors(containerColor = Color(0xFFE8F5E9).copy(alpha = 0.15f)),
                                        shape = RoundedCornerShape(12.dp)
                                    ) {
                                        Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                                            Icon(Icons.Default.CheckCircle, contentDescription = null, tint = Color(0xFF4CAF50), modifier = Modifier.size(32.dp))
                                            Spacer(modifier = Modifier.width(16.dp))
                                            Column {
                                                Text("Certification completed", fontWeight = FontWeight.Bold, color = Color(0xFF4CAF50))
                                                Text("This course is successfully completed.", fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurface)
                                            }
                                        }
                                    }
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
fun LessonCard(title: String, content: String, number: Int) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = 16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
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
            if (content.isNotBlank()) {
                Spacer(modifier = Modifier.height(12.dp))
                Text(content, fontSize = 15.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, lineHeight = 22.sp)
            }
        }
    }
}
