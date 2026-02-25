package com.tzir.delivery.android.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

// Falling back to Android system default Sans-Serif font to ensure we don't block
// the build on external Google Font URL resolutions since the .ttf assets 404'ed.
// This closely matches Instrument Sans in geometry up to Android 14.
val InstrumentSansFallback = FontFamily.SansSerif

val TZIRTypography = Typography(
    headlineLarge  = TextStyle(fontFamily = InstrumentSansFallback, fontWeight = FontWeight.Bold, fontSize = 28.sp, letterSpacing = (-0.5).sp),
    headlineMedium = TextStyle(fontFamily = InstrumentSansFallback, fontWeight = FontWeight.Bold, fontSize = 22.sp, letterSpacing = (-0.3).sp),
    headlineSmall  = TextStyle(fontFamily = InstrumentSansFallback, fontWeight = FontWeight.Bold, fontSize = 18.sp, letterSpacing = (-0.2).sp),
    titleLarge     = TextStyle(fontFamily = InstrumentSansFallback, fontWeight = FontWeight.SemiBold, fontSize = 16.sp),
    titleMedium    = TextStyle(fontFamily = InstrumentSansFallback, fontWeight = FontWeight.SemiBold, fontSize = 14.sp),
    titleSmall     = TextStyle(fontFamily = InstrumentSansFallback, fontWeight = FontWeight.SemiBold, fontSize = 12.sp),
    bodyLarge      = TextStyle(fontFamily = InstrumentSansFallback, fontWeight = FontWeight.Normal, fontSize = 15.sp),
    bodyMedium     = TextStyle(fontFamily = InstrumentSansFallback, fontWeight = FontWeight.Normal, fontSize = 13.sp),
    bodySmall      = TextStyle(fontFamily = InstrumentSansFallback, fontWeight = FontWeight.Normal, fontSize = 11.sp),
    labelLarge     = TextStyle(fontFamily = InstrumentSansFallback, fontWeight = FontWeight.Bold, fontSize = 13.sp),
    labelMedium    = TextStyle(fontFamily = InstrumentSansFallback, fontWeight = FontWeight.Bold, fontSize = 11.sp, letterSpacing = 0.5.sp),
    labelSmall     = TextStyle(fontFamily = InstrumentSansFallback, fontWeight = FontWeight.Medium, fontSize = 10.sp, letterSpacing = 1.sp),
)
