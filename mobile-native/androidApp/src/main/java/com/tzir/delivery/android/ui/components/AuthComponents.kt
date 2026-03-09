package com.tzir.delivery.android.ui.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.Spring
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.ui.draw.shadow

import com.tzir.delivery.android.ui.theme.*

// ════════════════════════════════════════
// TZIR Auth Components v3.0
// Theme-aware · Glassmorphic · Apple-Inspired
// ════════════════════════════════════════

/**
 * Premium text field — glassmorphic, theme-aware.
 */
@Composable
fun TzirTextField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    modifier: Modifier = Modifier,
    visualTransformation: androidx.compose.ui.text.input.VisualTransformation = androidx.compose.ui.text.input.VisualTransformation.None,
    keyboardOptions: androidx.compose.foundation.text.KeyboardOptions = androidx.compose.foundation.text.KeyboardOptions.Default
) {
    val isDark = TZIRTheme.colors == DarkExtendedColors
    val containerColor = if (isDark) Graphite700 else SurfaceLight
    val borderFocused = AmberGold
    val borderUnfocused = if (isDark) Graphite600 else Graphite50

    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(label, color = MaterialTheme.colorScheme.onSurfaceVariant) },
        modifier = modifier
            .fillMaxWidth()
            .padding(vertical = 6.dp),
        shape = RoundedCornerShape(16.dp),
        colors = OutlinedTextFieldDefaults.colors(
            focusedContainerColor = containerColor,
            unfocusedContainerColor = containerColor,
            focusedBorderColor = borderFocused,
            unfocusedBorderColor = borderUnfocused,
            focusedLabelColor = borderFocused,
            cursorColor = AmberGold,
            focusedTextColor = MaterialTheme.colorScheme.onSurface,
            unfocusedTextColor = MaterialTheme.colorScheme.onSurface
        ),
        visualTransformation = visualTransformation,
        keyboardOptions = keyboardOptions,
        singleLine = true
    )
}

/**
 * Primary CTA button — amber gold gradient with press animation.
 */
@Composable
fun TzirButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    isLoading: Boolean = false,
    enabled: Boolean = true
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()
    val scale by animateFloatAsState(
        if (isPressed) 0.96f else 1f,
        spring(Spring.DampingRatioMediumBouncy, Spring.StiffnessLow),
        label = "buttonScale"
    )

    val alpha = if (enabled && !isLoading) 1f else 0.6f

    Surface(
        onClick = onClick,
        enabled = enabled && !isLoading,
        modifier = modifier
            .graphicsLayer(scaleX = scale, scaleY = scale)
            .fillMaxWidth()
            .height(58.dp)
            .shadow(
                elevation = if (isPressed) 4.dp else 12.dp,
                shape = RoundedCornerShape(18.dp),
                ambientColor = AmberGold.copy(alpha = 0.4f),
                spotColor = AmberGold.copy(alpha = 0.4f)
            ),
        shape = RoundedCornerShape(18.dp),
        color = Color.Transparent,
        interactionSource = interactionSource
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.linearGradient(
                        colors = listOf(
                            AmberGold,
                            AmberGoldDark
                        )
                    ),
                    alpha = alpha
                ),
            contentAlignment = Alignment.Center
        ) {
            if (isLoading) {
                CircularProgressIndicator(
                    modifier = Modifier.size(24.dp),
                    color = Graphite950,
                    strokeWidth = 2.5.dp
                )
            } else {
                Text(
                    text = text,
                    fontSize = 17.sp,
                    fontWeight = FontWeight.Bold,
                    color = Graphite950,
                    letterSpacing = 0.3.sp
                )
            }
        }
    }
}

/**
 * Premium Background — theme-aware with subtle amber glow.
 */
@Composable
fun PremiumBackground(content: @Composable () -> Unit) {
    val isDark = TZIRTheme.colors == DarkExtendedColors
    val bgColor = if (isDark) BackgroundDark else BackgroundLight
    val glowColor = if (isDark) AmberGold.copy(alpha = 0.05f) else AmberGold.copy(alpha = 0.06f)

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(bgColor)
    ) {
        // Subtle amber radial glow at top
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(400.dp)
                .background(
                    Brush.radialGradient(
                        colors = listOf(
                            glowColor,
                            Color.Transparent
                        ),
                        radius = 600f
                    )
                )
        )

        content()
    }
}
