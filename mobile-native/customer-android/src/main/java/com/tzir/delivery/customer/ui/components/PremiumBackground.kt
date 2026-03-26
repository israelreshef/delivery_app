package com.tzir.delivery.customer.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.tzir.delivery.customer.ui.theme.*

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
