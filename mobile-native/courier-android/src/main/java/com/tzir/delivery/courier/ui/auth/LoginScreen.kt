package com.tzir.delivery.courier.ui.auth

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
import com.tzir.delivery.courier.ui.components.*
import com.tzir.delivery.courier.ui.theme.*
import com.tzir.delivery.courier.repository.AuthRepository
import com.tzir.delivery.courier.R
import kotlinx.coroutines.launch

@Composable
fun LoginScreen(
    repository: AuthRepository,
    onLoginSuccess: () -> Unit,
    onNavigateToRegister: () -> Unit
) {
    var username by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var mfaToken by remember { mutableStateOf<String?>(null) }
    var otpCode by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val context = androidx.compose.ui.platform.LocalContext.current
    
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
                                colors = listOf(BrandBlue.copy(alpha = 0.3f), Color.Transparent)
                            )
                        )
                )
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        "TZIR",
                        fontSize = 56.sp,
                        fontWeight = FontWeight.Black,
                        color = BrandBlue,
                        letterSpacing = 4.sp
                    )
                    Text(
                        "Delivery",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Medium,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f),
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
                        stringResource(R.string.email_hint),
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f),
                        fontSize = 12.sp,
                        modifier = Modifier.align(Alignment.End)
                    )
                    TzirTextField(
                        value = username,
                        onValueChange = { username = it },
                        label = stringResource(R.string.login_username_hint)
                    )
                    
                    Spacer(modifier = Modifier.height(16.dp))

                    Text(
                        stringResource(R.string.password),
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f),
                        fontSize = 12.sp,
                        modifier = Modifier.align(Alignment.End)
                    )
                    TzirTextField(
                        value = password,
                        onValueChange = { password = it },
                        label = stringResource(R.string.password_hint),
                        visualTransformation = PasswordVisualTransformation()
                    )

                    mfaToken?.let {
                        Spacer(modifier = Modifier.height(24.dp))
                        Text(
                            stringResource(R.string.mfa_otp_title),
                            color = BrandBlue,
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp,
                            modifier = Modifier.align(Alignment.End)
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        TzirTextField(
                            value = otpCode,
                            onValueChange = { otpCode = it },
                            label = stringResource(R.string.mfa_otp_hint),
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword)
                        )
                    }

                    errorMessage?.let {
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(it, color = Color.Red, fontSize = 12.sp, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth())
                    }

                    Spacer(modifier = Modifier.height(32.dp))

                    if (mfaToken == null) {
                        TzirButton(
                            text = stringResource(R.string.login_btn),
                            onClick = {
                                scope.launch {
                                    isLoading = true
                                    val response = repository.login(username, password)
                                    isLoading = false
                                    if (response.requires2fa) {
                                        mfaToken = response.mfaToken
                                        otpCode = ""
                                        errorMessage = null
                                    } else if (response.success) {
                                        onLoginSuccess()
                                    } else {
                                        errorMessage = response.error ?: context.getString(R.string.error_login_failed)
                                    }
                                }
                            },
                            isLoading = isLoading
                        )
                    } else {
                        TzirButton(
                            text = stringResource(R.string.mfa_verify_btn),
                            onClick = {
                                scope.launch {
                                    isLoading = true
                                    val response = repository.loginVerifyMfa(mfaToken!!, otpCode)
                                    isLoading = false
                                    if (response.success) {
                                        onLoginSuccess()
                                    } else {
                                        errorMessage = response.error ?: context.getString(R.string.mfa_otp_invalid)
                                    }
                                }
                            },
                            isLoading = isLoading
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            stringResource(R.string.mfa_back_to_login),
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                            fontSize = 13.sp,
                            modifier = Modifier
                                .align(Alignment.CenterHorizontally)
                                .clickable {
                                    mfaToken = null
                                    otpCode = ""
                                    errorMessage = null
                                }
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(32.dp))

            // --- 3. Footer Register Link ---
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(stringResource(R.string.no_account), color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f))
                Text(
                    stringResource(R.string.register_link),
                    color = BrandBlue,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.clickable { onNavigateToRegister() }
                )
            }
        }
    }
}
