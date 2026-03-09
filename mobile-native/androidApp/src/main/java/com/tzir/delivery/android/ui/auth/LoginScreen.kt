package com.tzir.delivery.android.ui.auth

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.res.stringResource
import com.tzir.delivery.android.ui.components.*
import com.tzir.delivery.android.ui.theme.*
import com.tzir.delivery.shared.repository.AuthRepository
import com.tzir.delivery.android.R
import kotlinx.coroutines.launch

@Composable
fun LoginScreen(
    repository: AuthRepository,
    onLoginSuccess: () -> Unit,
    onNavigateToRegister: () -> Unit
) {
    var username by remember { mutableStateOf("demo_courier") }
    var password by remember { mutableStateOf("TzirRiderSpeed!77") }
    var isLoading by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    
    PremiumBackground {
        Column(
            modifier = Modifier.fillMaxSize().padding(horizontal = 32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // --- 1. Floating Logo with Glow ---
            Box(contentAlignment = Alignment.Center) {
                // Background Radial Glow
                Box(
                    modifier = Modifier
                        .size(160.dp)
                        .background(
                            Brush.radialGradient(
                                colors = listOf(AmberGold.copy(alpha = 0.3f), Color.Transparent)
                            )
                        )
                )
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        "TZIR",
                        fontSize = 56.sp,
                        fontWeight = FontWeight.Black,
                        color = AmberGold,
                        letterSpacing = 4.sp
                    )
                    Text(
                        "Delivery",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Medium,
                        color = Color.White.copy(alpha = 0.5f),
                        letterSpacing = 2.sp
                    )
                }
            }

            Spacer(modifier = Modifier.height(48.dp))

            // --- 2. Glassmorphic Form Card ---
            GlassCard(
                modifier = Modifier.fillMaxWidth(),
                cornerRadius = 28.dp,
                opacity = 0.6f
            ) {
                Column(modifier = Modifier.padding(24.dp)) {
                    Text(
                        "Email/phone",
                        color = Color.White.copy(alpha = 0.5f),
                        fontSize = 12.sp,
                        modifier = Modifier.align(Alignment.End)
                    )
                    TzirTextField(
                        value = username,
                        onValueChange = { username = it },
                        label = "מושה email/phone"
                    )
                    
                    Spacer(modifier = Modifier.height(16.dp))

                    Text(
                        "Password",
                        color = Color.White.copy(alpha = 0.5f),
                        fontSize = 12.sp,
                        modifier = Modifier.align(Alignment.End)
                    )
                    TzirTextField(
                        value = password,
                        onValueChange = { password = it },
                        label = "כממשתנים",
                        visualTransformation = PasswordVisualTransformation()
                    )

                    Spacer(modifier = Modifier.height(32.dp))

                    TzirButton(
                        text = "כניסה למערכת",
                        onClick = {
                            scope.launch {
                                isLoading = true
                                val response = repository.login(username, password)
                                isLoading = false
                                if (response.success) onLoginSuccess()
                            }
                        },
                        isLoading = isLoading
                    )
                }
            }

            Spacer(modifier = Modifier.height(32.dp))

            // --- 3. Footer Register Link ---
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("אין לך חשבון? ", color = Color.White.copy(alpha = 0.7f))
                Text(
                    "הירשם",
                    color = AmberGold,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.clickable { onNavigateToRegister() }
                )
            }
        }
    }
}
