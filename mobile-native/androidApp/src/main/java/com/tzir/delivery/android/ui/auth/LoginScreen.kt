
package com.tzir.delivery.android.ui.auth

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.res.stringResource
import com.tzir.delivery.android.ui.components.*
import com.tzir.delivery.shared.repository.AuthRepository
import com.tzir.delivery.android.R
import kotlinx.coroutines.launch
import androidx.compose.ui.draw.clip
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.background
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.graphics.Brush

@Composable
fun LoginScreen(
    repository: AuthRepository,
    onLoginSuccess: () -> Unit,
    onNavigateToRegister: () -> Unit
) {
    var username by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var isLoading by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    // Resource strings for errors
    val invalidCredsMsg = stringResource(R.string.err_invalid_creds)
    val inactiveUserMsg = stringResource(R.string.err_inactive_user)
    val genericErrMsg = stringResource(R.string.err_generic_msg)
    val networkErrMsg = stringResource(R.string.err_network)

    PremiumBackground {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // ... Logo ...
            Box(
                modifier = Modifier
                    .size(100.dp)
                    .clip(CircleShape)
                    .background(AppleWhite),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    "TZIR",
                    style = androidx.compose.ui.text.TextStyle(
                        brush = Brush.linearGradient(
                            colors = listOf(
                                PrimaryTurquoise,
                                TextOfficial
                            )
                        ),
                        fontWeight = FontWeight.Black,
                        fontSize = 28.sp
                    )
                )
            }

            Spacer(modifier = Modifier.height(32.dp))

            Text(
                stringResource(R.string.login_welcome),
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Black,
                color = TextOfficial,
                textAlign = TextAlign.Center
            )
            
            Text(
                stringResource(R.string.login_subtitle),
                style = MaterialTheme.typography.bodyLarge,
                color = TextGray,
                modifier = Modifier.padding(top = 8.dp)
            )

            Spacer(modifier = Modifier.height(48.dp))

            TzirTextField(
                value = username,
                onValueChange = { username = it },
                label = stringResource(R.string.login_username_hint)
            )

            Spacer(modifier = Modifier.height(8.dp))

            TzirTextField(
                value = password,
                onValueChange = { password = it },
                label = stringResource(R.string.password),
                visualTransformation = PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password)
            )

            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 8.dp),
                contentAlignment = Alignment.CenterEnd
            ) {
                TextButton(onClick = { /* TODO: Forgot Password */ }) {
                    Text(stringResource(R.string.forgot_password), color = PrimaryTurquoise)
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            if (error != null) {
                Surface(
                    color = MaterialTheme.colorScheme.errorContainer,
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = error!!,
                        color = MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.bodyMedium,
                        modifier = Modifier.padding(12.dp),
                        textAlign = TextAlign.Center
                    )
                }
                Spacer(modifier = Modifier.height(16.dp))
            }

            TzirButton(
                text = stringResource(R.string.login_btn),
                onClick = {
                    scope.launch {
                        try {
                            isLoading = true
                            error = null
                            val response = repository.login(username, password)
                            isLoading = false
                            if (response.success) {
                                onLoginSuccess()
                            } else {
                                error = when (response.error) {
                                    "Invalid credentials" -> invalidCredsMsg
                                    "User is not active" -> inactiveUserMsg
                                    else -> genericErrMsg.format(response.error)
                                }
                            }
                        } catch (e: Exception) {
                            isLoading = false
                            error = networkErrMsg.format(e.message ?: "")
                        }
                    }
                },
                isLoading = isLoading
            )

            Spacer(modifier = Modifier.height(32.dp))

            Row(
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(stringResource(R.string.no_account), color = TextGray)
                TextButton(onClick = onNavigateToRegister) {
                    Text(stringResource(R.string.register_link), color = PrimaryTurquoise, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}
