package com.tzir.delivery.courier.ui.courier

import android.graphics.Bitmap
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.*
import androidx.compose.foundation.Image
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
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tzir.delivery.courier.ui.components.*
import com.tzir.delivery.courier.ui.theme.*
import com.tzir.delivery.courier.repository.CourierRepository
import kotlinx.coroutines.launch
import java.io.ByteArrayOutputStream
import android.util.Base64

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MissionProtocolScreen(
    missionId: Int,
    repository: CourierRepository,
    onBack: () -> Unit,
    onComplete: () -> Unit
) {
    val activeMissions by repository.activeMissions.collectAsState()
    val mission = activeMissions.find { it.id == missionId }
    
    var protocolSteps by remember { mutableStateOf<List<Map<String, Any>>>(emptyList()) }
    var currentStepIndex by remember { mutableStateOf(0) }
    var isLoading by remember { mutableStateOf(true) }
    var actionResult by remember { mutableStateOf<Map<String, String>>(emptyMap()) }
    
    val scope = rememberCoroutineScope()

    LaunchedEffect(missionId) {
        isLoading = true
        protocolSteps = repository.getProtocolSteps(missionId)
        // Find first incomplete step
        currentStepIndex = protocolSteps.indexOfFirst { it["completed"] as? Boolean == false }.coerceAtLeast(0)
        isLoading = false
    }

    PremiumBackground {
        Scaffold(
            topBar = {
                CenterAlignedTopAppBar(
                    title = { Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("ביצוע פרוטוקול", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                        Text(mission?.orderNumber ?: "", fontSize = 12.sp, color = BrandBlue)
                    }},
                    navigationIcon = {
                        IconButton(onClick = onBack) { Icon(Icons.Default.Close, "סגור", tint = MaterialTheme.colorScheme.onSurface) }
                    },
                    colors = TopAppBarDefaults.centerAlignedTopAppBarColors(containerColor = Color.Transparent, titleContentColor = MaterialTheme.colorScheme.onSurface)
                )
            },
            containerColor = Color.Transparent
        ) { padding ->
            if (isLoading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = BrandBlue) }
            } else if (protocolSteps.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { Text("לא נמצא פרוטוקול למשלוח זה", color = MaterialTheme.colorScheme.onSurface) }
            } else {
                val currentStep = protocolSteps.getOrNull(currentStepIndex)
                
                Column(modifier = Modifier.padding(padding).fillMaxSize().padding(20.dp)) {
                    // Progress Bar
                    LinearProgressIndicator(
                        progress = { (currentStepIndex + 1).toFloat() / protocolSteps.size },
                        modifier = Modifier.fillMaxWidth().height(8.dp).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.1f), RoundedCornerShape(4.dp)),
                        color = BrandBlue,
                        strokeCap = androidx.compose.ui.graphics.StrokeCap.Round
                    )
                    Spacer(Modifier.height(8.dp))
                    Text("שלב ${currentStepIndex + 1} מתוך ${protocolSteps.size}", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.align(Alignment.End))

                    Spacer(Modifier.height(32.dp))

                    AnimatedContent(
                        targetState = currentStep,
                        transitionSpec = { fadeIn() togetherWith fadeOut() }
                    ) { step ->
                        if (step != null) {
                            ProtocolStepView(
                                step = step,
                                onActionComplete = { data ->
                                    scope.launch {
                                        isLoading = true
                                        val success = repository.completeProtocolStep(missionId, step["step"] as Int, data)
                                        if (success) {
                                            if (currentStepIndex < protocolSteps.size - 1) {
                                                currentStepIndex++
                                            } else {
                                                onComplete()
                                            }
                                        }
                                        isLoading = false
                                    }
                                }
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun ProtocolStepView(
    step: Map<String, Any>,
    onActionComplete: (Map<String, String>) -> Unit
) {
    val action = step["action"] as? String ?: ""
    val label = step["label"] as? String ?: ""
    
    var capturedPhoto by remember { mutableStateOf<Bitmap?>(null) }
    var signatureBitmap by remember { mutableStateOf<Bitmap?>(null) }
    var showSignaturePad by remember { mutableStateOf(false) }

    val cameraLauncher = rememberLauncherForActivityResult(ActivityResultContracts.TakePicturePreview()) { bitmap ->
        if (bitmap != null) capturedPhoto = bitmap
    }

    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
        Surface(modifier = Modifier.size(80.dp), shape = CircleShape, color = BrandBlue.copy(alpha = 0.15f)) {
            Box(contentAlignment = Alignment.Center) {
                val icon = when (action) {
                    "collect_documents" -> Icons.Default.Description
                    "verify_recipient_id" -> Icons.Default.Badge
                    "deliver_to_recipient", "deliver_to_institution" -> Icons.Default.LocalShipping
                    "collect_signature_or_photo", "collect_stamp_or_receipt" -> Icons.Default.Draw
                    "return_confirmation" -> Icons.Default.AssignmentReturn
                    else -> Icons.Default.Task
                }
                Icon(icon, null, tint = BrandBlue, modifier = Modifier.size(40.dp))
            }
        }

        Spacer(Modifier.height(24.dp))
        Text(label, fontWeight = FontWeight.Black, fontSize = 24.sp, color = MaterialTheme.colorScheme.onSurface, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
        Spacer(Modifier.height(12.dp))
        Text(getStepDescription(action), fontSize = 15.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = androidx.compose.ui.text.style.TextAlign.Center)

        Spacer(Modifier.height(48.dp))

        when (action) {
            "collect_signature_or_photo", "collect_stamp_or_receipt" -> {
                Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                    Button(
                        onClick = { cameraLauncher.launch(null) },
                        modifier = Modifier.weight(1f).height(120.dp),
                        shape = RoundedCornerShape(20.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = if (capturedPhoto != null) SuccessDark.copy(alpha = 0.2f) else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.05f))
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            if (capturedPhoto != null) {
                                Image(capturedPhoto!!.asImageBitmap(), null, modifier = Modifier.size(60.dp), contentScale = ContentScale.Crop)
                                Text("צולם", color = SuccessDark, fontWeight = FontWeight.Bold)
                            } else {
                                Icon(Icons.Default.AddAPhoto, null, modifier = Modifier.size(32.dp))
                                Text("צילום", color = MaterialTheme.colorScheme.onSurface)
                            }
                        }
                    }

                    Button(
                        onClick = { showSignaturePad = true },
                        modifier = Modifier.weight(1f).height(120.dp),
                        shape = RoundedCornerShape(20.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = if (signatureBitmap != null) SuccessDark.copy(alpha = 0.2f) else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.05f))
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            if (signatureBitmap != null) {
                                Icon(Icons.Default.CheckCircle, null, modifier = Modifier.size(40.dp), tint = SuccessDark)
                                Text("חתום", color = SuccessDark, fontWeight = FontWeight.Bold)
                            } else {
                                Icon(Icons.Default.Draw, null, modifier = Modifier.size(32.dp))
                                Text("חתימה", color = MaterialTheme.colorScheme.onSurface)
                            }
                        }
                    }
                }
            }
            "verify_recipient_id" -> {
                TzirButton(text = "סרוק תעודת זהות / הזן מספר", onClick = { /* TODO */ })
            }
            else -> {
                // Default action is just a confirm button
            }
        }

        Spacer(Modifier.weight(1f))

        TzirButton(
            text = "אשר שלב והמשך",
            onClick = {
                val data = mutableMapOf<String, String>()
                capturedPhoto?.let { bitmap ->
                    val stream = ByteArrayOutputStream()
                    bitmap.compress(Bitmap.CompressFormat.JPEG, 80, stream)
                    data["photo"] = Base64.encodeToString(stream.toByteArray(), Base64.NO_WRAP)
                }
                signatureBitmap?.let { bitmap ->
                    val stream = ByteArrayOutputStream()
                    bitmap.compress(Bitmap.CompressFormat.PNG, 100, stream)
                    data["signature"] = Base64.encodeToString(stream.toByteArray(), Base64.NO_WRAP)
                }
                onActionComplete(data)
            },
            modifier = Modifier.fillMaxWidth().height(60.dp)
        )
    }

    if (showSignaturePad) {
        AlertDialog(
            onDismissRequest = { showSignaturePad = false },
            properties = androidx.compose.ui.window.DialogProperties(usePlatformDefaultWidth = false),
            content = {
                Surface(modifier = Modifier.fillMaxSize().padding(16.dp), color = MaterialTheme.colorScheme.surface, shape = RoundedCornerShape(24.dp)) {
                    Column(modifier = Modifier.padding(20.dp)) {
                        Text("חתימה", fontWeight = FontWeight.Bold)
                        Spacer(Modifier.height(16.dp))
                        SignatureCanvas { bitmap -> signatureBitmap = bitmap }
                        Spacer(Modifier.height(24.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            TextButton(onClick = { showSignaturePad = false }, modifier = Modifier.weight(1f)) { Text("ביטול") }
                            TzirButton(text = "אישור", onClick = { showSignaturePad = false }, modifier = Modifier.weight(1f))
                        }
                    }
                }
            }
        )
    }
}

fun getStepDescription(action: String): String = when (action) {
    "collect_documents" -> "יש לאסוף את כל המסמכים מהלקוח ולוודא שהם שלמים."
    "verify_recipient_id" -> "יש לבקש מהנמען להציג תעודת זהות רשמית ולהשוות לפרטי ההזמנה."
    "deliver_to_recipient" -> "יש למסור את המעטפה לנמען שזוהה."
    "deliver_to_institution" -> "יש להגיש את המסמכים בדלפק הייעודי במוסד."
    "collect_signature_or_photo" -> "יש להחתים את הנמען או לצלם את המעטפה במיקום המסירה."
    "collect_stamp_or_receipt" -> "יש לצלם את החותמת שקיבלת מהמוסד כמסמך מאשר הגשה."
    "return_confirmation" -> "יש לחזור למשרדי ציר עם המסמכים המוחתמים."
    else -> "בצע את הפעולה המתוארת בשלב זה."
}
