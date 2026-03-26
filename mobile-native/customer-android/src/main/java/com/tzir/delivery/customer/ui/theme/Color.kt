package com.tzir.delivery.customer.ui.theme

import androidx.compose.ui.graphics.Color
import com.tzir.delivery.customer.ui.theme.*

// ════════════════════════════════════════
// TZIR COMMAND — Android Color System v3.0
// Dark Graphite + Amber Gold · Apple-Inspired
// ════════════════════════════════════════

// ── Amber Gold (Primary Brand) ──
val AmberGold       = Color(0xFFF5A623)
val AmberGoldDark   = Color(0xFFD48A00)
val AmberGoldLight  = Color(0xFFFFCC66)
val AmberGoldDim    = Color(0x1AF5A623)
val AmberGoldGlow   = Color(0x4DF5A623) // Increased glow

// ── Graphite Scale ──
val Graphite950     = Color(0xFF080808) // Deeper black
val Graphite900     = Color(0xFF0E0E0E)
val Graphite800     = Color(0xFF141416) // Slightly warmer dark
val Graphite700     = Color(0xFF1C1C1E)
val Graphite600     = Color(0xFF3A3A3C)
val Graphite500     = Color(0xFF48484A)
val Graphite400     = Color(0xFF636366)
val Graphite300     = Color(0xFF8E8E93)
val Graphite200     = Color(0xFFAEAEB2)
val Graphite100     = Color(0xFFC7C7CC)
val Graphite50      = Color(0xFFE5E5EA)

// ── Surfaces — Light Mode ──
val SurfaceLight    = Color(0xFFFFFFFF)
val BackgroundLight = Color(0xFFF8F9FA)
val Surface2Light   = Color(0xFFF2F2F7)
val BorderLight     = Color(0xFFE5E5EA)

// ── Surfaces — Dark Mode ──
val SurfaceDark     = Color(0xFF1C1C1E)
val BackgroundDark  = Color(0xFF111111)
val Surface2Dark    = Color(0xFF2C2C2E)
val BorderDark      = Color(0xFF3A3A3C)

// ── Text — Light Mode ──
val TextPrimaryLight   = Color(0xFF1A1A1A)
val TextSecondaryLight = Color(0xFF6B7280)
val TextMutedLight     = Color(0xFF9CA3AF)

// ── Text — Dark Mode ──
val TextPrimaryDark    = Color(0xFFF5F5F7)
val TextSecondaryDark  = Color(0xFF8E8E93)
val TextMutedDark      = Color(0xFF636366)

// ── Semantic — Light ──
val SuccessLight    = Color(0xFF34C759)
val SuccessBgLight  = Color(0x1A34C759)
val WarningLight    = Color(0xFFFF9500)
val WarningBgLight  = Color(0x1AFF9500)
val ErrorLight      = Color(0xFFFF3B30)
val ErrorBgLight    = Color(0x1AFF3B30)
val InfoLight       = Color(0xFF007AFF)
val InfoBgLight     = Color(0x1A007AFF)

// ── Semantic — Dark ──
val SuccessDark     = Color(0xFF30D158)
val SuccessBgDark   = Color(0x1A30D158)
val WarningDark     = Color(0xFFFFD60A)
val WarningBgDark   = Color(0x1AFFD60A)
val ErrorDark       = Color(0xFFFF453A)
val ErrorBgDark     = Color(0x1AFF453A)
val InfoDark        = Color(0xFF0A84FF)
val InfoBgDark      = Color(0x1A0A84FF)

// ── Glassmorphism ──
val GlassWhite      = Color(0xB3FFFFFF)  // 70% white
val GlassDark       = Color(0x991C1C1E)  // 60% dark
val GlassBorderLight = Color(0x80FFFFFF) // 50% white border
val GlassBorderDark  = Color(0x33FFFFFF) // 20% white border on dark

// ── Online/Offline ──
val OnlineGreen     = Color(0xFF34C759)
val OfflineGray     = Color(0xFF636366)

// ══ Legacy Aliases (backward compatibility during migration) ══
// These will be removed once all screens are migrated
val Amber           = AmberGold
val AmberDark       = AmberGoldDark
val AmberLight      = AmberGoldLight
val AmberDim        = AmberGoldDim
val Navy950         = Graphite950
val Navy900         = Graphite900
val Navy800         = Graphite800
val Navy700         = Graphite700
val Navy600         = Graphite600
val Navy400         = Graphite500
val Navy200         = Graphite300
val Navy100         = Graphite100
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
val PrimaryTurquoise = AmberGold
val AppleWhite       = SurfaceLight
val TextOfficial     = Graphite800
val TextGray         = Graphite400
val AppleGray        = Surface2Light
