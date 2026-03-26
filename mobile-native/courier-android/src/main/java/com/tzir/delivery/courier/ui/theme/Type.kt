package com.tzir.delivery.courier.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import com.tzir.delivery.courier.ui.theme.*

// ════════════════════════════════════════
// TZIR Typography — Apple-Inspired
// Clean sans-serif, tight headings, airy body
// ════════════════════════════════════════

// System default sans-serif closely matches SF Pro geometry on modern Android
val TZIRFontFamily = FontFamily.SansSerif

val TZIRTypography = Typography(
    // Hero numbers, main headings
    headlineLarge  = TextStyle(
        fontFamily   = TZIRFontFamily,
        fontWeight   = FontWeight.Black,
        fontSize     = 32.sp,
        letterSpacing = (-0.7).sp,
        lineHeight   = 38.sp
    ),
    // Section titles
    headlineMedium = TextStyle(
        fontFamily   = TZIRFontFamily,
        fontWeight   = FontWeight.Bold,
        fontSize     = 24.sp,
        letterSpacing = (-0.4).sp,
        lineHeight   = 30.sp
    ),
    // Card titles
    headlineSmall  = TextStyle(
        fontFamily   = TZIRFontFamily,
        fontWeight   = FontWeight.Bold,
        fontSize     = 20.sp,
        letterSpacing = (-0.3).sp,
        lineHeight   = 26.sp
    ),
    // Large navigation titles
    titleLarge     = TextStyle(
        fontFamily   = TZIRFontFamily,
        fontWeight   = FontWeight.SemiBold,
        fontSize     = 17.sp,
        letterSpacing = (-0.2).sp,
        lineHeight   = 22.sp
    ),
    // List item titles
    titleMedium    = TextStyle(
        fontFamily   = TZIRFontFamily,
        fontWeight   = FontWeight.SemiBold,
        fontSize     = 15.sp,
        letterSpacing = 0.sp,
        lineHeight   = 20.sp
    ),
    // Small titles
    titleSmall     = TextStyle(
        fontFamily   = TZIRFontFamily,
        fontWeight   = FontWeight.SemiBold,
        fontSize     = 13.sp,
        letterSpacing = 0.sp,
        lineHeight   = 18.sp
    ),
    // Primary body text
    bodyLarge      = TextStyle(
        fontFamily   = TZIRFontFamily,
        fontWeight   = FontWeight.Normal,
        fontSize     = 16.sp,
        letterSpacing = 0.sp,
        lineHeight   = 22.sp
    ),
    // Secondary body text
    bodyMedium     = TextStyle(
        fontFamily   = TZIRFontFamily,
        fontWeight   = FontWeight.Normal,
        fontSize     = 14.sp,
        letterSpacing = 0.sp,
        lineHeight   = 20.sp
    ),
    // Captions, timestamps
    bodySmall      = TextStyle(
        fontFamily   = TZIRFontFamily,
        fontWeight   = FontWeight.Normal,
        fontSize     = 12.sp,
        letterSpacing = 0.sp,
        lineHeight   = 16.sp
    ),
    // Button text
    labelLarge     = TextStyle(
        fontFamily   = TZIRFontFamily,
        fontWeight   = FontWeight.Bold,
        fontSize     = 15.sp,
        letterSpacing = 0.3.sp,
        lineHeight   = 20.sp
    ),
    // Status labels, badges
    labelMedium    = TextStyle(
        fontFamily   = TZIRFontFamily,
        fontWeight   = FontWeight.Bold,
        fontSize     = 12.sp,
        letterSpacing = 0.5.sp,
        lineHeight   = 16.sp
    ),
    // Micro labels
    labelSmall     = TextStyle(
        fontFamily   = TZIRFontFamily,
        fontWeight   = FontWeight.Medium,
        fontSize     = 10.sp,
        letterSpacing = 0.5.sp,
        lineHeight   = 14.sp
    ),
)
