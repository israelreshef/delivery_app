package com.tzir.delivery.customer.ui.theme

import androidx.compose.ui.graphics.Color
import com.tzir.delivery.customer.ui.theme.*

// ════════════════════════════════════════
// TZIR COMMAND — Android Color System v5.0
// Navy + Blue · Brand Kit V5
// ════════════════════════════════════════

// ── Brand Blue (Primary) ──
val BrandBlue        = Color(0xFF145DDB)
val BrandBlueDark    = Color(0xFF1048B0)
val BrandBlueLight   = Color(0xFF5AA0FF)
val BrandBlueDim     = Color(0x1A145DDB)
val BrandBlueGlow    = Color(0x4D145DDB)

// ── Navy Scale (Brand Kit V5) ──
val Navy950          = Color(0xFF07162C)
val Navy900          = Color(0xFF0C1E3A)
val Navy800          = Color(0xFF112648)
val Navy700          = Color(0xFF1A3566)
val Navy600          = Color(0xFF244A84)
val Navy500          = Color(0xFF3D6DA8)
val Navy400          = Color(0xFF5A8AC0)
val Navy300          = Color(0xFF7BA3CC)
val Navy200          = Color(0xFFB8CDE5)
val Navy100          = Color(0xFFDCE8F5)

// ── Ice / Paper (Light Surfaces) ──
val Ice              = Color(0xFFE8F1FF)
val Paper            = Color(0xFFF7F9FC)

// ── Surfaces — Light Mode ──
val SurfaceLight     = Color(0xFFFFFFFF)
val BackgroundLight  = Paper
val Surface2Light    = Ice
val BorderLight      = Color(0xFFD0DAE8)

// ── Surfaces — Dark Mode ──
val SurfaceDark      = Color(0xFF0C1E3A)
val BackgroundDark   = Navy950
val Surface2Dark     = Color(0xFF112648)
val BorderDark       = Color(0xFF1A3566)

// ── Text — Light Mode ──
val TextPrimaryLight   = Navy950
val TextSecondaryLight = Color(0xFF4A5568)
val TextMutedLight     = Color(0xFF718096)

// ── Text — Dark Mode ──
val TextPrimaryDark    = Ice
val TextSecondaryDark  = Navy300
val TextMutedDark      = Navy500

// ── Semantic — Light ──
val SuccessLight    = Color(0xFF34C759)
val SuccessBgLight  = Color(0x1A34C759)
val WarningLight    = Color(0xFFFF9500)
val WarningBgLight  = Color(0x1AFF9500)
val ErrorLight      = Color(0xFFFF3B30)
val ErrorBgLight    = Color(0x1AFF3B30)
val InfoLight       = BrandBlue
val InfoBgLight     = BrandBlueDim

// ── Semantic — Dark ──
val SuccessDark     = Color(0xFF30D158)
val SuccessBgDark   = Color(0x1A30D158)
val WarningDark     = Color(0xFFFFD60A)
val WarningBgDark   = Color(0x1AFFD60A)
val ErrorDark       = Color(0xFFFF453A)
val ErrorBgDark     = Color(0x1AFF453A)
val InfoDark        = BrandBlueLight
val InfoBgDark      = Color(0x1A5AA0FF)

// ── Glassmorphism ──
val GlassWhite      = Color(0xB3FFFFFF)
val GlassDark       = Color(0x990C1E3A)
val GlassBorderLight = Color(0x80FFFFFF)
val GlassBorderDark  = Color(0x33FFFFFF)

// ── Online/Offline ──
val OnlineGreen     = Color(0xFF34C759)
val OfflineGray     = Navy500

// ══ Legacy Aliases (backward compatibility during migration) ══
val Amber           = BrandBlue
val AmberDark       = BrandBlueDark
val AmberLight      = BrandBlueLight
val AmberDim        = BrandBlueDim
val AmberGold       = BrandBlue
val AmberGoldDark   = BrandBlueDark
val AmberGoldLight  = BrandBlueLight
val AmberGoldDim    = BrandBlueDim
val AmberGoldGlow   = BrandBlueGlow
val Graphite950     = Navy950
val Graphite900     = Navy900
val Graphite800     = Navy800
val Graphite700     = Navy700
val Graphite600     = Navy600
val Graphite500     = Navy500
val Graphite400     = Navy400
val Graphite300     = Navy300
val Graphite200     = Navy200
val Graphite100     = Navy100
val Graphite50      = Navy100
val Surface2Light_legacy = Surface2Light
val Surface2Dark_legacy  = Surface2Dark
val Success         = SuccessLight
val SuccessBg       = SuccessBgLight
val Warning         = WarningLight
val WarningBg       = WarningBgLight
val ErrorRed        = ErrorLight
val ErrorBg         = ErrorBgLight
val InfoBlue        = InfoLight
val InfoBg          = InfoBgLight

// Additional aliases for remaining unmigrated screens
val PrimaryTurquoise = BrandBlue
val AppleWhite       = SurfaceLight
val TextOfficial     = Navy800
val TextGray         = Navy400
val AppleGray        = Surface2Light
