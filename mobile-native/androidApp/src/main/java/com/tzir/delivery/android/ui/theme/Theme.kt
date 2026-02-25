package com.tzir.delivery.android.ui.theme

import android.app.Activity
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat
import java.util.Calendar

private val TZIRLightColorScheme = lightColorScheme(
    primary          = Amber,
    onPrimary        = Navy950,
    primaryContainer = AmberLight,
    onPrimaryContainer = Navy700,

    secondary        = Navy600,
    onSecondary      = Color.White,
    secondaryContainer = Navy100,
    onSecondaryContainer = Navy900,

    background       = BackgroundLight,
    onBackground     = TextPrimaryLight,

    surface          = SurfaceLight,
    onSurface        = TextPrimaryLight,
    surfaceVariant   = Surface2Light,
    onSurfaceVariant = TextSecondaryLight,

    outline          = BorderLight,
    outlineVariant   = Color(0xFFC5D5E4),

    error            = ErrorRed,
    onError          = Color.White,
    errorContainer   = ErrorBg,
    onErrorContainer = ErrorRed,
)

private val TZIRDarkColorScheme = darkColorScheme(
    primary          = Amber,
    onPrimary        = Navy950,
    primaryContainer = Color(0xFF3D2800),
    onPrimaryContainer = AmberLight,

    secondary        = Navy200,
    onSecondary      = Navy950,
    secondaryContainer = Navy700,
    onSecondaryContainer = Navy100,

    background       = BackgroundDark,
    onBackground     = TextPrimaryDark,

    surface          = SurfaceDark,
    onSurface        = TextPrimaryDark,
    surfaceVariant   = Surface2Dark,
    onSurfaceVariant = TextSecondaryDark,

    outline          = BorderDark,
    outlineVariant   = Color(0x0F5C8AB0),

    error            = ErrorRed,
    onError          = Color.White,
    errorContainer   = ErrorBg,
    onErrorContainer = ErrorRed,
)

fun getDefaultTheme(): Boolean {
    val hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
    return hour >= 20 || hour < 7  // true = dark
}

@Composable
fun MyApplicationTheme(
    darkTheme: Boolean = getDefaultTheme(), // Use TZIR Time-based fallback
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) TZIRDarkColorScheme else TZIRLightColorScheme
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = colorScheme.background.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = !darkTheme
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        // typography  = TZIRTypography, // Not applied yet since Type.kt is next
        content     = content
    )
}
