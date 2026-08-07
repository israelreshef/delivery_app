package com.tzir.delivery.courier.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.tzir.delivery.courier.ui.theme.*

/**
 * Premium Background — theme-aware with subtle BrandBlue glow.
 */
@Composable
fun PremiumBackground(content: @Composable () -> Unit) {
    val isDark = TZIRTheme.colors == DarkExtendedColors
    val bgColor = if (isDark) BackgroundDark else BackgroundLight
    
    // Vibrant accent colors for the background "stylized" look
    val primaryGlow = if (isDark) BrandBlue.copy(alpha = 0.12f) else BrandBlue.copy(alpha = 0.08f)
    val secondaryGlow = if (isDark) Navy900 else Ice
    val bottomGlow = if (isDark) Navy950 else Color(0xFFFFFFFF)

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(bgColor)
    ) {
        // Core background mesh/gradients
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(bgColor, bottomGlow)
                    )
                )
        )

        // 1. Top-Right BrandBlue Glow (Primary)
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(500.dp)
                .background(
                    Brush.radialGradient(
                        colors = listOf(primaryGlow, Color.Transparent),
                        center = androidx.compose.ui.geometry.Offset(1000f, 0f),
                        radius = 800f
                    )
                )
        )

        // 2. Center-Left Graphite Glow (Subtle depth)
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.radialGradient(
                        colors = listOf(secondaryGlow.copy(alpha = 0.3f), Color.Transparent),
                        center = androidx.compose.ui.geometry.Offset(0f, 1200f),
                        radius = 1000f
                    )
                )
        )

        // 3. Bottom Gradient (Depth)
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .align(Alignment.BottomCenter)
                .height(300.dp)
                .background(
                    Brush.verticalGradient(
                        colors = listOf(Color.Transparent, Color.Black.copy(alpha = 0.4f))
                    )
                )
        )

        content()
    }
}
