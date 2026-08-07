package com.tzir.delivery.courier.ui.courier

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.*
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tzir.delivery.courier.ui.theme.*
import com.tzir.delivery.courier.ui.theme.SuccessDark
import com.tzir.delivery.courier.ui.components.PremiumBackground
import com.tzir.delivery.courier.repository.CourierRepository
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun QuizScreen(
    courseId: Int,
    repository: CourierRepository,
    onBack: () -> Unit,
    onQuizPassed: () -> Unit
) {
    var questions by remember { mutableStateOf<List<Map<String, Any>>>(emptyList()) }
    var currentQuestionIndex by remember { mutableStateOf(0) }
    var selectedAnswers by remember { mutableStateOf(mutableMapOf<Int, Int>()) }
    var isLoading by remember { mutableStateOf(true) }
    var quizResult by remember { mutableStateOf<Map<String, Any>?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(courseId) {
        val result = repository.getAcademyProtocolQuizQuestions(courseId)
        questions = result
        isLoading = false
    }

    Scaffold(
        topBar = {
            CenterAlignedTopAppBar(
                title = { Text("מבחן הסמכה", fontWeight = FontWeight.Black, color = BrandBlue) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "חזור", tint = BrandBlue)
                    }
                },
                colors = TopAppBarDefaults.centerAlignedTopAppBarColors(containerColor = Color.Transparent)
            )
        },
        containerColor = Color.Transparent
    ) { padding ->
        PremiumBackground {
            Box(modifier = Modifier.fillMaxSize().padding(padding)) {
                when {
                    isLoading -> {
                        CircularProgressIndicator(color = BrandBlue, modifier = Modifier.align(Alignment.Center))
                    }
                    error != null -> {
                        Text(error!!, color = Color.Red, modifier = Modifier.align(Alignment.Center))
                    }
                    quizResult != null -> {
                        QuizResultView(
                            result = quizResult!!,
                            onClose = {
                                if (quizResult!!["passed"] == true) onQuizPassed() else onBack()
                            }
                        )
                    }
                    questions.isNotEmpty() -> {
                        val currentQuestion = questions[currentQuestionIndex]
                        val qId = (currentQuestion["id"] as? Number)?.toInt() ?: 0
                        
                        Column(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(16.dp)
                        ) {
                            // Progress bar
                            LinearProgressIndicator(
                                progress = (currentQuestionIndex + 1).toFloat() / questions.size,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(8.dp),
                                color = BrandBlue,
                                trackColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.2f),
                                strokeCap = androidx.compose.ui.graphics.StrokeCap.Round
                            )
                            
                            Spacer(modifier = Modifier.height(8.dp))
                            
                            Text(
                                "שאלה ${currentQuestionIndex + 1} מתוך ${questions.size}",
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                                fontSize = 14.sp
                            )
                            
                            Spacer(modifier = Modifier.height(24.dp))
                            
                            Text(
                                currentQuestion["question_text"] as String,
                                color = MaterialTheme.colorScheme.onSurface,
                                fontSize = 20.sp,
                                fontWeight = FontWeight.Bold,
                                lineHeight = 28.sp
                            )
                            
                            Spacer(modifier = Modifier.height(32.dp))
                            
                            // Options
                            for (i in 1..4) {
                                val optionText = currentQuestion["option_$i"] as? String ?: ""
                                if (optionText.isNotEmpty()) {
                                    OptionCard(
                                        text = optionText,
                                        isSelected = selectedAnswers[qId] == i,
                                        onClick = {
                                            selectedAnswers = selectedAnswers.toMutableMap().apply {
                                                put(qId, i)
                                            }
                                        }
                                    )
                                    Spacer(modifier = Modifier.height(16.dp))
                                }
                            }
                            
                            Spacer(modifier = Modifier.weight(1f))
                            
                            Button(
                                onClick = {
                                    if (currentQuestionIndex < questions.size - 1) {
                                        currentQuestionIndex++
                                    } else {
                                        // Submit
                                        scope.launch {
                                            isLoading = true
                                            val answers = selectedAnswers.map { mapOf("question_id" to it.key, "selected_option" to it.value) }
                                            val result = repository.submitAcademyProtocolQuiz(courseId, answers)
                                            quizResult = result
                                            isLoading = false
                                        }
                                    }
                                },
                                enabled = selectedAnswers.containsKey(qId),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(56.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = BrandBlue, contentColor = Navy950),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Text(
                                    if (currentQuestionIndex < questions.size - 1) "המשך לשאלה הבאה" else "שלח מבחן",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 18.sp
                                )
                            }
                        }
                    }
                    else -> {
                        Text("אין שאלות זמינות לקורס זה", color = MaterialTheme.colorScheme.onSurface, modifier = Modifier.align(Alignment.Center))
                    }
                }
            }
        }
    }
}

@Composable
fun OptionCard(text: String, isSelected: Boolean, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .border(
                width = 2.dp,
                color = if (isSelected) BrandBlue else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.1f),
                shape = RoundedCornerShape(12.dp)
            )
            .background(
                color = if (isSelected) BrandBlue.copy(alpha = 0.1f) else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.05f),
                shape = RoundedCornerShape(12.dp)
            )
            .clickable(onClick = onClick)
            .padding(16.dp)
    ) {
        Text(
            text = text,
            color = if (isSelected) BrandBlue else MaterialTheme.colorScheme.onSurface,
            fontSize = 16.sp,
            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
        )
    }
}

@Composable
fun QuizResultView(result: Map<String, Any>, onClose: () -> Unit) {
    val passed = result["passed"] as? Boolean ?: false
    val score = (result["score"] as? Number)?.toInt() ?: 0
    val feedback = result["feedback"] as? List<Map<String, Any>> ?: emptyList()

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        item {
            Spacer(modifier = Modifier.height(32.dp))
            
            Text(
                if (passed) "מזל טוב! עברת בהצלחה" else "לצערו לא עברת",
                fontSize = 28.sp,
                fontWeight = FontWeight.Black,
                color = if (passed) SuccessDark else Color.Red
            )
            
            Spacer(modifier = Modifier.height(16.dp))
            
            Text(
                "ציון: $score%",
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface
            )
            
            Spacer(modifier = Modifier.height(32.dp))
            
            Text(
                "סקירת תשובות",
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                color = BrandBlue,
                modifier = Modifier.fillMaxWidth(),
                textAlign = TextAlign.Right
            )
            
            Spacer(modifier = Modifier.height(16.dp))
        }

        items(feedback.size) { index ->
            val f = feedback[index]
            val isCorrect = f["is_correct"] as? Boolean ?: false
            
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 16.dp),
                colors = CardDefaults.cardColors(
                    containerColor = if (isCorrect) Color(0xFF1B5E20).copy(alpha = 0.2f) else Color(0xFFB71C1C).copy(alpha = 0.2f)
                ),
                border = borderStroke(1.dp, if (isCorrect) SuccessDark.copy(alpha = 0.5f) else Color.Red.copy(alpha = 0.5f))
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = if (isCorrect) Icons.Default.CheckCircle else Icons.Default.Close,
                            contentDescription = null,
                            tint = if (isCorrect) SuccessDark else Color.Red
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            f["question_text"] as String,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                    }
                    
                    Spacer(modifier = Modifier.height(8.dp))
                    
                    if (!isCorrect) {
                        Text(
                            "התשובה הנכונה: " + f["option_${(f["correct_option"] as? Number)?.toInt() ?: 0}"],
                            color = SuccessDark,
                            fontSize = 14.sp
                        )
                    }
                    
                    Spacer(modifier = Modifier.height(8.dp))
                    
                    Text(
                        f["explanation"] as String,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                        fontSize = 14.sp,
                        fontStyle = androidx.compose.ui.text.font.FontStyle.Italic
                    )
                }
            }
        }
        
        item {
            Spacer(modifier = Modifier.height(24.dp))
            
            Button(
                onClick = onClose,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                colors = ButtonDefaults.buttonColors(containerColor = BrandBlue, contentColor = Navy950),
                shape = RoundedCornerShape(12.dp)
            ) {
                Text("סגור", fontWeight = FontWeight.Bold, fontSize = 18.sp)
            }
            
            Spacer(modifier = Modifier.height(32.dp))
        }
    }
}

fun borderStroke(width: androidx.compose.ui.unit.Dp, color: Color) = androidx.compose.foundation.BorderStroke(width, color)
