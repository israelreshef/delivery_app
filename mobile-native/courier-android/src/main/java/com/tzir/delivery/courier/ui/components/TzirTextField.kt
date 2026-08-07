package com.tzir.delivery.courier.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tzir.delivery.courier.ui.theme.*

/**
 * Premium text field — glassmorphic, theme-aware.
 */
@Composable
fun TzirTextField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    modifier: Modifier = Modifier,
    visualTransformation: VisualTransformation = VisualTransformation.None,
    keyboardOptions: KeyboardOptions = KeyboardOptions.Default,
    isError: Boolean = false,
    errorText: String? = null,
    placeholder: String? = null,
    leadingIcon: @Composable (() -> Unit)? = null,
    trailingIcon: @Composable (() -> Unit)? = null
) {
    val isDark = TZIRTheme.colors == DarkExtendedColors
    val containerColor = if (isDark) Navy700 else SurfaceLight
    val borderFocused = if (isError) Color(0xFFF44336) else BrandBlue
    val borderUnfocused = if (isError) Color(0xFFF44336) else if (isDark) Navy600 else BorderLight

    Column(modifier = modifier.fillMaxWidth()) {
        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            label = { Text(label, color = MaterialTheme.colorScheme.onSurfaceVariant) },
            placeholder = if (placeholder != null) { { Text(placeholder, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f)) } } else null,
            leadingIcon = leadingIcon,
            trailingIcon = trailingIcon,
            modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp),
            shape = RoundedCornerShape(16.dp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedContainerColor = containerColor,
                unfocusedContainerColor = containerColor,
                focusedBorderColor = borderFocused,
                unfocusedBorderColor = borderUnfocused,
                focusedLabelColor = borderFocused,
                cursorColor = BrandBlue,
                focusedTextColor = MaterialTheme.colorScheme.onSurface,
                unfocusedTextColor = MaterialTheme.colorScheme.onSurface
            ),
            visualTransformation = visualTransformation,
            keyboardOptions = keyboardOptions,
            isError = isError,
            singleLine = true
        )
        if (isError && errorText != null) {
            Text(
                errorText,
                color = Color(0xFFF44336),
                fontSize = 12.sp,
                modifier = Modifier.padding(start = 16.dp, top = 2.dp)
            )
        }
    }
}
