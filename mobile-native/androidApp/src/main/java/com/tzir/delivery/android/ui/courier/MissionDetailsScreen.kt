
package com.tzir.delivery.android.ui.courier

import android.content.Intent
import android.graphics.Bitmap
import android.net.Uri
import java.io.ByteArrayOutputStream
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AddAPhoto
import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import com.tzir.delivery.android.ui.components.*
import com.tzir.delivery.shared.model.Mission
import com.tzir.delivery.shared.network.DeliveryApi
import com.tzir.delivery.android.R
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MissionDetailsScreen(
    missionId: Int,
    repository: com.tzir.delivery.shared.repository.CourierRepository,
    onBack: () -> Unit
) {
    val activeMissions by repository.activeMissions.collectAsState()
    val isOffline by repository.isOffline.collectAsState()
    
    val mission = activeMissions.find { it.id == missionId }
    var signatureBitmap by remember { mutableStateOf<Bitmap?>(null) }
    var capturedPhoto by remember { mutableStateOf<Bitmap?>(null) }
    var isLoading by remember { mutableStateOf(false) }
    var isSigning by remember { mutableStateOf(false) }
    var isVerifyingOTP by remember { mutableStateOf(false) }
    var otpSent by remember { mutableStateOf(false) }
    var otpCode by remember { mutableStateOf("") }
    var showRating by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(missionId) {
        if (mission == null) {
            repository.refreshActiveMissions()
        }
    }

    PremiumBackground {
        if (isLoading) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        } else if (mission == null) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text(stringResource(R.string.mission_not_found))
            }
        } else {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(16.dp)
                    .verticalScroll(rememberScrollState())
            ) {
                TextButton(
                    onClick = onBack,
                    modifier = Modifier.padding(bottom = 8.dp)
                ) {
                    Text("← ${stringResource(R.string.back)}", color = TextOfficial, fontWeight = FontWeight.Bold)
                }

                Text(
                    text = "${stringResource(R.string.order_prefix)}${mission.orderNumber}",
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Black,
                    color = TextOfficial
                )

                Spacer(modifier = Modifier.height(32.dp))

                GlassCard(
                    modifier = Modifier.fillMaxWidth(),
                    cornerRadius = 32.dp
                ) {
                    Column(modifier = Modifier.padding(24.dp)) {
                        AddressSection(stringResource(R.string.pickup), mission.pickupAddress, "🔵")
                        Spacer(modifier = Modifier.height(24.dp))
                        AddressSection(stringResource(R.string.deliver), mission.deliveryAddress, "🏁")
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))

                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    NavigationButton("Waze", "waze://?q=${Uri.encode(mission.deliveryAddress)}", Modifier.weight(1f))
                    NavigationButton("Google Maps", "google.navigation:q=${Uri.encode(mission.deliveryAddress)}", Modifier.weight(1f))
                }

                Spacer(modifier = Modifier.height(40.dp))

                val nextStatus = when (mission.status) {
                    "accepted" -> "picked_up"
                    "picked_up" -> "in_transit"
                    "in_transit" -> "arrived"
                    "arrived" -> "delivered"
                    else -> null
                }

                if (nextStatus != null) {
                    if (nextStatus == "delivered") {
                        if (isSigning) {
                            Text(stringResource(R.string.recipient_signature), fontWeight = FontWeight.Bold)
                            SignatureCanvas { bitmap -> signatureBitmap = bitmap }
                            Spacer(modifier = Modifier.height(16.dp))
                            TzirButton(text = stringResource(R.string.confirm_delivery), onClick = {
                                isSigning = false
                                isVerifyingOTP = true
                            })
                        } else if (isVerifyingOTP) {
                            val cameraLauncher = androidx.activity.compose.rememberLauncherForActivityResult(
                                androidx.activity.result.contract.ActivityResultContracts.TakePicturePreview()
                            ) { bitmap ->
                                if (bitmap != null) {
                                    capturedPhoto = bitmap
                                }
                            }

                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                colors = CardDefaults.cardColors(containerColor = Color(0xFFF1F8E9)),
                                shape = RoundedCornerShape(16.dp),
                                border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF4CAF50).copy(alpha = 0.3f))
                            ) {
                                Column(modifier = Modifier.padding(20.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                    Text(
                                        stringResource(R.string.otp_verification), 
                                        fontWeight = FontWeight.Black,
                                        fontSize = 20.sp,
                                        color = TextOfficial
                                    )
                                    Spacer(modifier = Modifier.height(16.dp))

                                    // Photo Capture Section
                                    Box(
                                        modifier = Modifier
                                            .size(200.dp)
                                            .background(Color.White.copy(alpha = 0.5f), RoundedCornerShape(16.dp))
                                            .clickable { cameraLauncher.launch(null) },
                                        contentAlignment = Alignment.Center
                                    ) {
                                        if (capturedPhoto != null) {
                                            Image(
                                                bitmap = capturedPhoto!!.asImageBitmap(),
                                                contentDescription = "POD Photo",
                                                modifier = Modifier.fillMaxSize(),
                                                contentScale = ContentScale.Crop
                                            )
                                        } else {
                                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                                Icon(Icons.Default.AddAPhoto, contentDescription = null, tint = PrimaryTurquoise)
                                                Text("צלם תמונת חבילה", fontSize = 12.sp, color = TextOfficial)
                                            }
                                        }
                                    }

                                    Spacer(modifier = Modifier.height(24.dp))
                                    
                                    if (!otpSent) {
                                        TzirButton(
                                            text = stringResource(R.string.send_otp),
                                            onClick = {
                                                scope.launch {
                                                    if (repository.sendOTP(mission.id)) {
                                                        otpSent = true
                                                    }
                                                }
                                            },
                                            modifier = Modifier.fillMaxWidth(0.8f)
                                        )
                                    } else {
                                        OutlinedTextField(
                                            value = otpCode,
                                            onValueChange = { if (it.length <= 6) otpCode = it },
                                            placeholder = { Text("------", modifier = Modifier.fillMaxWidth(), textAlign = androidx.compose.ui.text.style.TextAlign.Center) },
                                            modifier = Modifier.width(200.dp),
                                            singleLine = true,
                                            textStyle = LocalTextStyle.current.copy(
                                                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                                                fontSize = 24.sp,
                                                letterSpacing = 8.sp,
                                                fontWeight = FontWeight.Bold
                                            ),
                                            shape = RoundedCornerShape(12.dp),
                                            colors = OutlinedTextFieldDefaults.colors(
                                                focusedBorderColor = PrimaryTurquoise,
                                                unfocusedBorderColor = TextGray.copy(alpha = 0.5f)
                                            ),
                                            keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(
                                                keyboardType = androidx.compose.ui.text.input.KeyboardType.Number
                                            )
                                        )
                                        Spacer(modifier = Modifier.height(24.dp))
                                        TzirButton(
                                            text = stringResource(R.string.verify),
                                            onClick = {
                                                scope.launch {
                                                    isLoading = true
                                                    
                                                    // Convert signature to Base64
                                                    val podSignatureBase64 = signatureBitmap?.let { bitmap ->
                                                        val outputStream = ByteArrayOutputStream()
                                                        bitmap.compress(Bitmap.CompressFormat.PNG, 100, outputStream)
                                                        android.util.Base64.encodeToString(outputStream.toByteArray(), android.util.Base64.NO_WRAP)
                                                    }

                                                    // Convert photo to Base64
                                                    val podImageBase64 = capturedPhoto?.let { bitmap ->
                                                        val outputStream = ByteArrayOutputStream()
                                                        bitmap.compress(Bitmap.CompressFormat.JPEG, 80, outputStream)
                                                        android.util.Base64.encodeToString(outputStream.toByteArray(), android.util.Base64.NO_WRAP)
                                                    }

                                                    if (repository.verifyOTP(mission.id, otpCode)) {
                                                        repository.updateMissionStatus(
                                                            mission.id, 
                                                            "delivered", 
                                                            podSignature = podSignatureBase64,
                                                            podImage = podImageBase64
                                                        )
                                                        isVerifyingOTP = false
                                                        showRating = true
                                                    }
                                                    isLoading = false
                                                }
                                            },
                                            modifier = Modifier.fillMaxWidth()
                                        )
                                    }
                                }
                            }
                        } else if (showRating) {
                            var rating by remember { mutableStateOf(5) }
                            var comment by remember { mutableStateOf("") }
                            var q1 by remember { mutableStateOf(true) } // Courtesy
                            var q2 by remember { mutableStateOf(true) } // Integrity
                            var q3 by remember { mutableStateOf(true) } // Professionalism
                            var isSubmitted by remember { mutableStateOf(false) }

                            Text(stringResource(R.string.rate_delivery), fontWeight = FontWeight.Black, fontSize = 20.sp, color = TextOfficial)
                            Text("עזור לנו לשפר את השירות בעזרת משוב מהיר", fontSize = 14.sp, color = Color.Gray)
                            
                            Spacer(modifier = Modifier.height(24.dp))
                            
                            // Professional Questions (from ERP Research)
                            FeedbackToggle("האם השליח היה אדיב?", q1) { q1 = it }
                            FeedbackToggle("האם המשלוח הגיע נקי ותקין?", q2) { q2 = it }
                            FeedbackToggle("האם התהליך בוצע במקצועיות?", q3) { q3 = it }
                            
                            Spacer(modifier = Modifier.height(24.dp))

                            OutlinedTextField(
                                value = comment,
                                onValueChange = { comment = it },
                                label = { Text(stringResource(R.string.optional_comment)) },
                                modifier = Modifier.fillMaxWidth()
                            )

                            Spacer(modifier = Modifier.height(16.dp))

                            TzirButton(text = stringResource(R.string.submit_feedback), onClick = {
                                scope.launch {
                                    if (repository.submitRating(mission.id, rating, comment)) {
                                        isSubmitted = true
                                        onBack()
                                    }
                                }
                            })
                        } else {
                            TzirButton(text = stringResource(R.string.complete_delivery), onClick = { isSigning = true })
                        }
                    } else {
                        TzirButton(
                            text = when(nextStatus) {
                                "picked_up" -> stringResource(R.string.status_btn_picked_up)
                                "in_transit" -> stringResource(R.string.status_btn_transit)
                                "arrived" -> stringResource(R.string.status_btn_arrived)
                                else -> stringResource(R.string.status_btn_update)
                            },
                            onClick = {
                                scope.launch {
                                    repository.updateMissionStatus(mission.id, nextStatus)
                                }
                            }
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun AddressSection(label: String, address: String, icon: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Text(icon, fontSize = 14.sp)
        Spacer(modifier = Modifier.width(12.dp))
        Column {
            Text(label, color = TextGray, fontSize = 12.sp)
            Text(address, fontSize = 16.sp, fontWeight = FontWeight.SemiBold, color = TextOfficial)
        }
    }
}

@Composable
fun NavigationButton(label: String, uri: String, modifier: Modifier = Modifier) {
    val context = LocalContext.current
    OutlinedButton(
        onClick = {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(uri))
            context.startActivity(intent)
        },
        modifier = modifier
    ) {
        Text(label)
    }
}

@Composable
fun FeedbackToggle(label: String, checked: Boolean, onCheckedChange: (Boolean) -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp)
            .background(Color.White.copy(alpha = 0.5f), RoundedCornerShape(12.dp))
            .padding(horizontal = 16.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(label, fontSize = 14.sp, color = Color(0xFF001C44), fontWeight = FontWeight.Medium)
        Switch(
            checked = checked,
            onCheckedChange = onCheckedChange,
            colors = SwitchDefaults.colors(
                checkedThumbColor = AppleWhite,
                checkedTrackColor = PrimaryTurquoise,
                uncheckedThumbColor = TextGray,
                uncheckedTrackColor = TextGray.copy(alpha = 0.2f)
            )
        )
    }
}
