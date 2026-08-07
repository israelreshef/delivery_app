package com.tzir.delivery.customer.ui.auth

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
import androidx.compose.ui.platform.LocalContext
import com.tzir.delivery.customer.ui.components.*
import com.tzir.delivery.customer.ui.theme.*
import com.tzir.delivery.customer.repository.AuthRepository
import com.tzir.delivery.customer.model.LoginRequest
import com.tzir.delivery.customer.R
import kotlinx.coroutines.launch

@Composable
fun LoginScreen(
    repository: AuthRepository,
    onLoginSuccess: () -> Unit,
    onNavigateToRegister: () -> Unit
) {
    val context = LocalContext.current
    var password by remember { mutableStateOf("demo_client2026!") }
    var username by remember { mutableStateOf("demo_client") } 
    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    
    PremiumBackground {
        Column(
            modifier = Modifier.fillMaxSize().padding(horizontal = 32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // ... (logo section omitted for brevity, keeping same)
            Box(contentAlignment = Alignment.Center) {
                // Background Radial Glow
                Box(
                    modifier = Modifier
                        .size(160.dp)
                        .background(
                            Brush.radialGradient(
                                colors = listOf(BrandBlue.copy(alpha = 0.3f), Color.Transparent)
                            )
                        )
                )
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        "ציר",
                        fontSize = 56.sp,
                        fontWeight = FontWeight.Black,
                        color = BrandBlue,
                        letterSpacing = 4.sp
                    )
                    Text(
                        "לקוח",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Medium,
                        color = Color.White.copy(alpha = 0.5f),
                        letterSpacing = 2.sp
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        stringResource(R.string.customer_welcome_subtitle),
                        fontSize = 14.sp,
                        color = Color.White.copy(alpha = 0.7f),
                        textAlign = TextAlign.Center
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
                        stringResource(R.string.email_or_phone),
                        color = Color.White.copy(alpha = 0.5f),
                        fontSize = 12.sp,
                        modifier = Modifier.align(Alignment.End)
                    )
                    TzirTextField(
                        value = username,
                        onValueChange = { username = it },
                        label = stringResource(R.string.email_or_phone)
                    )
                    
                    Spacer(modifier = Modifier.height(16.dp))

                    Text(
                        stringResource(R.string.password),
                        color = Color.White.copy(alpha = 0.5f),
                        fontSize = 12.sp,
                        modifier = Modifier.align(Alignment.End)
                    )
                    TzirTextField(
                        value = password,
                        onValueChange = { password = it },
                        label = stringResource(R.string.password),
                        visualTransformation = PasswordVisualTransformation()
                    )

                    errorMessage?.let {
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(it, color = Color.Red, fontSize = 12.sp, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth())
                    }

                    Spacer(modifier = Modifier.height(32.dp))

                    TzirButton(
                        text = stringResource(R.string.login_as_customer),
                        containerColor = Color(0x1A, 0x73, 0xE8),
                        onClick = {
                            scope.launch {
                                isLoading = true
                                val response = repository.login(LoginRequest(email = username, password = password))
                                isLoading = false
                                if (response.success) {
                                    onLoginSuccess()
                                } else {
                                    errorMessage = response.error ?: context.getString(R.string.error_login_failed)
                                }
                            }
                        },
                        isLoading = isLoading
                    )
                }
            }

            Spacer(modifier = Modifier.height(32.dp))

            // --- 3. Footer Register Link ---
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(stringResource(R.string.no_account_yet), color = Color.White.copy(alpha = 0.7f))
                Text(
                    stringResource(R.string.register_now),
                    color = BrandBlue,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.clickable { onNavigateToRegister() }
                )
            }
        }
    }
}
