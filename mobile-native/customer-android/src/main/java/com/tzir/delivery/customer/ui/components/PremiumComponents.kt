package com.tzir.delivery.customer.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring

import com.tzir.delivery.customer.ui.theme.*

// TZIR Premium Components v3.0
// Glassmorphic ֲ· Theme-Aware ֲ· Apple-Inspired
// Glassmorphism components already available in PremiumComponents.kt (ported per Phase 2)
// ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•

/**
 * Glassmorphic Card ג€” the primary card component.
 * Adapts automatically to dark/light mode.
 * Uses semi-transparent background with subtle border.
 */
@Composable
fun GlassCard(
    modifier: Modifier = Modifier,
    cornerRadius: Dp = 24.dp,
    opacity: Float = 0.85f,
    onClick: (() -> Unit)? = null,
    content: @Composable BoxScope.() -> Unit
) {
    val isDark = TZIRTheme.colors == DarkExtendedColors
    val bgColor = if (isDark) Color(0xFF0D0D10).copy(alpha = opacity) else Color(0xFFFFFFFF).copy(alpha = opacity)
    val borderColor = if (isDark) Color(0x33FFFFFF) else Color(0x14000000)

    Box(
        modifier = modifier
            .then(
                if (onClick != null) {
                    Modifier.clickable(onClick = onClick)
                } else Modifier
            )
            .shadow(
                elevation = 12.dp,
                shape = RoundedCornerShape(cornerRadius),
                ambientColor = Color.Black.copy(alpha = if (isDark) 0.4f else 0.05f),
                spotColor = Color.Black.copy(alpha = if (isDark) 0.4f else 0.05f)
            )
            .clip(RoundedCornerShape(cornerRadius))
            .background(
                Brush.linearGradient(
                    colors = listOf(
                        bgColor,
                        bgColor.copy(alpha = bgColor.alpha * 0.9f)
                    )
                )
            )
            .border(
                width = 1.dp,
                brush = Brush.linearGradient(
                    colors = listOf(
                        borderColor,
                        borderColor.copy(alpha = 0.1f)
                    )
                ),
                shape = RoundedCornerShape(cornerRadius)
            )
    ) {
        content()
    }
}

/**
 * Glow Card ג€” glassmorphic card with animated BrandBlue glow.
 * Used for highlighted items like active missions.
 */
@Composable
fun GlowCard(
    modifier: Modifier = Modifier,
    cornerRadius: Dp = 24.dp,
    glowColor: Color = BrandBlue,
    content: @Composable BoxScope.() -> Unit
) {
    val isDark = TZIRTheme.colors == DarkExtendedColors
    val bgColor = if (isDark) GlassDark else GlassWhite
    val pulseScale = rememberPulseScale()

    Box(
        modifier = modifier
            .graphicsLayer { scaleX = pulseScale; scaleY = pulseScale }
            .shadow(
                elevation = 20.dp,
                shape = RoundedCornerShape(cornerRadius),
                ambientColor = glowColor.copy(alpha = 0.3f),
                spotColor = glowColor.copy(alpha = 0.4f)
            )
            .clip(RoundedCornerShape(cornerRadius))
            .background(bgColor)
            .border(
                width = 1.dp,
                color = glowColor.copy(alpha = 0.4f),
                shape = RoundedCornerShape(cornerRadius)
            )
    ) {
        content()
    }
}


/**
 * Earnings Row ג€” used in earnings detail sheets.
 * Theme-aware text colors.
 */
@Composable
fun EarningsRow(
    label: String,
    value: String,
    isBold: Boolean = false,
    isPositive: Boolean = false,
    isNegative: Boolean = false,
    fontSize: androidx.compose.ui.unit.TextUnit = 16.sp
) {
    val ext = TZIRTheme.colors
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = label,
            color = if (isBold) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.onSurfaceVariant,
            fontSize = fontSize,
            fontWeight = if (isBold) FontWeight.ExtraBold else FontWeight.Medium
        )
        Text(
            text = value,
            color = when {
                isPositive -> ext.success
                isNegative -> ErrorLight
                else -> MaterialTheme.colorScheme.onSurface
            },
            fontSize = fontSize,
            fontWeight = if (isBold) FontWeight.ExtraBold else FontWeight.Bold
        )
    }
}
