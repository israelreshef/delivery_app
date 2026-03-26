package com.tzir.delivery.customer.ui.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat
import java.util.Calendar
import com.tzir.delivery.customer.ui.theme.*

// ════════════════════════════════════════
// Extended Colors — beyond Material3 scheme
// ════════════════════════════════════════

data class TZIRExtendedColors(
    // Glass
    val glass: Color,
    val glassBorder: Color,
    // Brand
    val amberGold: Color,
    val amberGoldDark: Color,
    val amberGoldGlow: Color,
    val amberGoldDim: Color,
    // Semantic
    val success: Color,
    val successBg: Color,
    val warning: Color,
    val warningBg: Color,
    val info: Color,
    val infoBg: Color,
    // Online
    val online: Color,
    val offline: Color,
    // Text
    val textMuted: Color,
    // Surface
    val surfaceElevated: Color,
    val borderColor: Color,
)

val LightExtendedColors = TZIRExtendedColors(
    glass = GlassWhite,
    glassBorder = Color(0x1A000000), // 10% black border for light
    amberGold = AmberGold,
    amberGoldDark = AmberGoldDark,
    amberGoldGlow = AmberGoldGlow,
    amberGoldDim = AmberGoldDim,
    success = SuccessLight,
    successBg = SuccessBgLight,
    warning = WarningLight,
    warningBg = WarningBgLight,
    info = InfoLight,
    infoBg = InfoBgLight,
    online = OnlineGreen,
    offline = OfflineGray,
    textMuted = TextMutedLight,
    surfaceElevated = Surface2Light,
    borderColor = BorderLight,
)

val DarkExtendedColors = TZIRExtendedColors(
    glass = GlassDark,
    glassBorder = GlassBorderDark,
    amberGold = AmberGold,
    amberGoldDark = AmberGoldDark,
    amberGoldGlow = AmberGoldGlow,
    amberGoldDim = AmberGoldDim,
    success = SuccessDark,
    successBg = SuccessBgDark,
    warning = WarningDark,
    warningBg = WarningBgDark,
    info = InfoDark,
    infoBg = InfoBgDark,
    online = OnlineGreen,
    offline = OfflineGray,
    textMuted = TextMutedDark,
    surfaceElevated = Surface2Dark,
    borderColor = BorderDark,
)

val LocalTZIRColors = staticCompositionLocalOf { LightExtendedColors }

// ════════════════════════════════════════
// Material3 Color Schemes
// ════════════════════════════════════════

private val TZIRLightColorScheme = lightColorScheme(
    primary          = AmberGold,
    onPrimary        = Graphite950,
    primaryContainer = AmberGoldLight,
    onPrimaryContainer = Graphite700,

    secondary        = Graphite600,
    onSecondary      = Color.White,
    secondaryContainer = Graphite50,
    onSecondaryContainer = Graphite900,

    background       = BackgroundLight,
    onBackground     = TextPrimaryLight,

    surface          = SurfaceLight,
    onSurface        = TextPrimaryLight,
    surfaceVariant   = Surface2Light,
    onSurfaceVariant = TextSecondaryLight,

    outline          = BorderLight,
    outlineVariant   = Graphite50,

    error            = ErrorLight,
    onError          = Color.White,
    errorContainer   = ErrorBgLight,
    onErrorContainer = ErrorLight,
)

private val TZIRDarkColorScheme = darkColorScheme(
    primary          = AmberGold,
    onPrimary        = Graphite950,
    primaryContainer = Color(0xFF3D2800),
    onPrimaryContainer = AmberGoldLight,

    secondary        = Graphite300,
    onSecondary      = Graphite950,
    secondaryContainer = Graphite700,
    onSecondaryContainer = Graphite100,

    background       = BackgroundDark,
    onBackground     = TextPrimaryDark,

    surface          = SurfaceDark,
    onSurface        = TextPrimaryDark,
    surfaceVariant   = Surface2Dark,
    onSurfaceVariant = TextSecondaryDark,

    outline          = BorderDark,
    outlineVariant   = Graphite700,

    error            = ErrorDark,
    onError          = Color.White,
    errorContainer   = ErrorBgDark,
    onErrorContainer = ErrorDark,
)

// ════════════════════════════════════════
// Time-based theme detection
// ════════════════════════════════════════

fun getDefaultTheme(): Boolean {
    // Always return true for Premium Dark aesthetic requested in mockups
    return true 
}

// ════════════════════════════════════════
// Theme Composable
// ════════════════════════════════════════

@Composable
fun MyApplicationTheme(
    darkTheme: Boolean = getDefaultTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) TZIRDarkColorScheme else TZIRLightColorScheme
    val extendedColors = if (darkTheme) DarkExtendedColors else LightExtendedColors

    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = colorScheme.background.toArgb()
            window.navigationBarColor = colorScheme.background.toArgb()
            WindowCompat.getInsetsController(window, view).apply {
                isAppearanceLightStatusBars = !darkTheme
                isAppearanceLightNavigationBars = !darkTheme
            }
        }
    }

    CompositionLocalProvider(LocalTZIRColors provides extendedColors) {
        MaterialTheme(
            colorScheme = colorScheme,
            typography  = TZIRTypography,
            content     = content
        )
    }
}

// ════════════════════════════════════════
// Helper: Access extended colors anywhere
// ════════════════════════════════════════

object TZIRTheme {
    val colors: TZIRExtendedColors
        @Composable get() = LocalTZIRColors.current
}
