
package com.tzir.delivery.android.ui.auth

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.draw.clip
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tzir.delivery.android.ui.components.*
import com.tzir.delivery.shared.model.RegisterRequest
import com.tzir.delivery.shared.model.UserRole
import com.tzir.delivery.shared.repository.AuthRepository
import com.tzir.delivery.android.R
import kotlinx.coroutines.launch
import androidx.compose.foundation.selection.selectable
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.foundation.BorderStroke
import androidx.compose.animation.*
import androidx.compose.foundation.background

@Composable
fun RegisterScreen(
    repository: AuthRepository,
    onRegisterSuccess: () -> Unit,
    onBackToLogin: () -> Unit
) {
    var currentStep by remember { mutableStateOf(1) }
    
    var fullName by remember { mutableStateOf("") }
    var username by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    
    var selectedRole by remember { mutableStateOf(UserRole.CUSTOMER) }
    
    // Role specific
    var vehicleType by remember { mutableStateOf("motorcycle") }
    var licensePlate by remember { mutableStateOf("") }
    var companyName by remember { mutableStateOf("") }
    
    var error by remember { mutableStateOf<String?>(null) }
    var isLoading by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    // Resource strings
    val fillAllMsg = stringResource(R.string.err_fill_all)
    val invalidEmailMsg = stringResource(R.string.err_invalid_email)
    val invalidPhoneMsg = stringResource(R.string.err_invalid_phone)
    val shortPasswordMsg = stringResource(R.string.err_short_password)
    val fillVehicleMsg = stringResource(R.string.err_fill_vehicle)
    val registerFailedMsg = stringResource(R.string.err_register_failed)

    PremiumBackground {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(modifier = Modifier.height(48.dp))
            
            // Progress Indicator
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.Center
            ) {
                StepIndicator(step = 1, currentStep = currentStep, label = stringResource(R.string.step_role))
                Spacer(modifier = Modifier.width(32.dp))
                StepIndicator(step = 2, currentStep = currentStep, label = stringResource(R.string.step_details))
                Spacer(modifier = Modifier.width(32.dp))
                StepIndicator(step = 3, currentStep = currentStep, label = stringResource(R.string.step_completion))
            }

            Spacer(modifier = Modifier.height(48.dp))

            crossfade(targetState = currentStep) { step ->
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    when (step) {
                        1 -> RoleSelectionStep(
                            selectedRole = selectedRole,
                            onRoleSelected = { selectedRole = it },
                            onNext = { currentStep = 2 }
                        )
                        2 -> PersonalDetailsStep(
                            fullName = fullName, onFullNameChange = { fullName = it },
                            username = username, onUsernameChange = { username = it },
                            email = email, onEmailChange = { email = it },
                            phone = phone, onPhoneChange = { phone = it },
                            password = password, onPasswordChange = { password = it },
                            onNext = { currentStep = 3 },
                            onBack = { currentStep = 1 }
                        )
                        3 -> RoleSpecificStep(
                            role = selectedRole,
                            vehicleType = vehicleType, onVehicleTypeChange = { vehicleType = it },
                            licensePlate = licensePlate, onLicensePlateChange = { licensePlate = it },
                            companyName = companyName, onCompanyNameChange = { companyName = it },
                            isLoading = isLoading,
                            error = error,
                            onBack = { currentStep = 2 },
                            onFinish = {
                                scope.launch {
                                    isLoading = true
                                    error = null
                                    
                                    // Validation
                                    if (fullName.isBlank() || username.isBlank() || email.isBlank() || phone.isBlank() || password.isBlank()) {
                                        error = fillAllMsg
                                        isLoading = false
                                        return@launch
                                    }
                                    if (!android.util.Patterns.EMAIL_ADDRESS.matcher(email).matches()) {
                                        error = invalidEmailMsg
                                        isLoading = false
                                        return@launch
                                    }
                                    if (phone.length < 9) {
                                        error = invalidPhoneMsg
                                        isLoading = false
                                        return@launch
                                    }
                                    if (password.length < 6) {
                                        error = shortPasswordMsg
                                        isLoading = false
                                        return@launch
                                    }
                                    if (selectedRole == UserRole.COURIER && (vehicleType.isBlank() || licensePlate.isBlank())) {
                                        error = fillVehicleMsg
                                        isLoading = false
                                        return@launch
                                    }

                                    val request = RegisterRequest(
                                        username = username,
                                        password = password,
                                        email = email,
                                        phone = phone,
                                        fullName = fullName,
                                        userType = selectedRole,
                                        vehicleType = if (selectedRole == UserRole.COURIER) vehicleType else null,
                                        licensePlate = if (selectedRole == UserRole.COURIER) licensePlate else null,
                                        companyName = if (selectedRole == UserRole.CUSTOMER) companyName else null
                                    )
                                    val response = repository.register(request)
                                    isLoading = false
                                    if (response.success) {
                                        onRegisterSuccess()
                                    } else {
                                        error = response.error ?: registerFailedMsg
                                    }
                                }
                            }
                        )
                    }
                }
            }
            
            Spacer(modifier = Modifier.weight(1f))
            
            TextButton(onClick = onBackToLogin) {
                Text(stringResource(R.string.register_footer), color = PrimaryTurquoise)
            }
        }
    }
}

@Composable
fun RoleSelectionStep(
    selectedRole: UserRole,
    onRoleSelected: (UserRole) -> Unit,
    onNext: () -> Unit
) {
    Text(stringResource(R.string.choose_role), style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Black, color = TextOfficial, textAlign = TextAlign.Center)
    Spacer(modifier = Modifier.height(32.dp))
    
    RoleCard(
        title = stringResource(R.string.role_customer_title),
        subtitle = stringResource(R.string.role_customer_subtitle),
        isSelected = selectedRole == UserRole.CUSTOMER,
        onClick = { onRoleSelected(UserRole.CUSTOMER) }
    )
    
    Spacer(modifier = Modifier.height(16.dp))
    
    RoleCard(
        title = stringResource(R.string.role_courier_title),
        subtitle = stringResource(R.string.role_courier_subtitle),
        isSelected = selectedRole == UserRole.COURIER,
        onClick = { onRoleSelected(UserRole.COURIER) }
    )
    
    Spacer(modifier = Modifier.height(48.dp))
    
    TzirButton(text = stringResource(R.string.continue_btn), onClick = onNext)
}

@Composable
fun PersonalDetailsStep(
    fullName: String, onFullNameChange: (String) -> Unit,
    username: String, onUsernameChange: (String) -> Unit,
    email: String, onEmailChange: (String) -> Unit,
    phone: String, onPhoneChange: (String) -> Unit,
    password: String, onPasswordChange: (String) -> Unit,
    onNext: () -> Unit,
    onBack: () -> Unit
) {
    Text(stringResource(R.string.personal_details), style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Black, color = TextOfficial)
    Spacer(modifier = Modifier.height(24.dp))
    
    TzirTextField(value = fullName, onValueChange = onFullNameChange, label = stringResource(R.string.full_name))
    TzirTextField(value = username, onValueChange = onUsernameChange, label = stringResource(R.string.username))
    TzirTextField(value = email, onValueChange = onEmailChange, label = stringResource(R.string.email), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email))
    TzirTextField(value = phone, onValueChange = onPhoneChange, label = stringResource(R.string.phone_mobile), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone))
    TzirTextField(value = password, onValueChange = onPasswordChange, label = stringResource(R.string.password), visualTransformation = PasswordVisualTransformation(), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password))
    
    Spacer(modifier = Modifier.height(32.dp))
    
    TzirButton(text = stringResource(R.string.continue_btn), onClick = {
        if (fullName.isNotBlank() && username.isNotBlank() && email.isNotBlank() && phone.isNotBlank() && password.length >= 6) {
            onNext()
        }
    })
    TextButton(onClick = onBack, modifier = Modifier.padding(top = 8.dp)) {
        Text(stringResource(R.string.back), color = TextGray)
    }
}

@Composable
fun RoleSpecificStep(
    role: UserRole,
    vehicleType: String, onVehicleTypeChange: (String) -> Unit,
    licensePlate: String, onLicensePlateChange: (String) -> Unit,
    companyName: String, onCompanyNameChange: (String) -> Unit,
    isLoading: Boolean,
    error: String?,
    onBack: () -> Unit,
    onFinish: () -> Unit
) {
    Text(if (role == UserRole.COURIER) stringResource(R.string.courier_details) else stringResource(R.string.business_details), style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Black, color = TextOfficial)
    Spacer(modifier = Modifier.height(24.dp))
    
    if (role == UserRole.COURIER) {
        TzirTextField(value = vehicleType, onValueChange = onVehicleTypeChange, label = stringResource(R.string.vehicle_hint))
        TzirTextField(value = licensePlate, onValueChange = onLicensePlateChange, label = stringResource(R.string.license_plate))
    } else {
        TzirTextField(value = companyName, onValueChange = onCompanyNameChange, label = stringResource(R.string.company_name_optional))
    }
    
    if (error != null) {
        Text(error, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(vertical = 16.dp))
    }
    
    Spacer(modifier = Modifier.height(32.dp))
    
    TzirButton(text = stringResource(R.string.finish_register), onClick = onFinish, isLoading = isLoading)
    TextButton(onClick = onBack, modifier = Modifier.padding(top = 8.dp)) {
        Text(stringResource(R.string.back), color = TextGray)
    }
}

@Composable
fun StepIndicator(step: Int, currentStep: Int, label: String) {
    val isActive = step <= currentStep
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Box(
            modifier = Modifier
                .size(32.dp)
                .clip(CircleShape)
                .background(if (isActive) PrimaryTurquoise else AppleGray),
            contentAlignment = Alignment.Center
        ) {
            Text(step.toString(), color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.Bold)
        }
        Text(
            label,
            fontSize = 12.sp,
            color = if (isActive) PrimaryTurquoise else TextGray,
            modifier = Modifier.padding(top = 4.dp)
        )
    }
}


@Composable
fun RoleCard(title: String, subtitle: String, isSelected: Boolean, onClick: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .selectable(selected = isSelected, onClick = onClick),
        shape = RoundedCornerShape(16.dp),
        border = BorderStroke(2.dp, if (isSelected) PrimaryTurquoise else Color.Transparent),
        colors = CardDefaults.cardColors(containerColor = if (isSelected) PrimaryTurquoise.copy(alpha = 0.05f) else AppleWhite),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(20.dp)) {
            Text(title, fontWeight = FontWeight.Bold, fontSize = 18.sp, color = if (isSelected) PrimaryTurquoise else TextOfficial)
            Text(subtitle, fontSize = 14.sp, color = TextGray)
        }
    }
}



@Composable
fun <T> crossfade(targetState: T, content: @Composable (T) -> Unit) {
    Crossfade(targetState = targetState, label = "RegistrationStepCrossfade") { state ->
        content(state)
    }
}
