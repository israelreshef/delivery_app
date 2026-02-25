# TZIR COMMAND — Complete UI Redesign Prompt
# For: Google Gemini Pro / Gemini 2.0 Flash
# Purpose: Full end-to-end design system migration
# Version: 1.0 | Date: February 2026

---

## CONTEXT & MISSION

You are a world-class UI/UX designer and senior frontend engineer.
Your task is to migrate the entire TZIR Delivery platform — both the
Next.js web app and the Android (Jetpack Compose) courier app — from
its current "Premium Corporate Blue" color scheme to a new premium
design system called **TZIR Command**.

The new design language is inspired by Apple's precision and minimalism,
combined with the authority of professional command-center interfaces
(think Bloomberg Terminal meets Apple). The result must feel premium,
fast, and completely differentiated from competitors like Bringg,
Onfleet, and Routific.

---

## BRAND IDENTITY

**Brand Name:** TZIR Delivery
**Design System Name:** TZIR Command
**Design DNA:** Apple-precision · Mission-critical · Premium authority
**Typography direction:** Clean, confident, institutional — not friendly or playful
**Mood:** A logistics command center, not a delivery app

---

## 1. COMPLETE COLOR SYSTEM

### 1A — CSS Custom Properties (globals.css — Next.js)

Replace the entire existing `:root` and `.dark` blocks with the following:

```css
/* ════════════════════════════════════════
   TZIR COMMAND — Design System v2.0
   Navy + Amber · Apple-precision
════════════════════════════════════════ */

:root {
  /* ── Navy Scale ── */
  --navy-950:  #05101F;
  --navy-900:  #0A1929;
  --navy-800:  #0D2137;
  --navy-700:  #122845;
  --navy-600:  #1A3557;
  --navy-400:  #2E5480;
  --navy-200:  #5C8AB0;
  --navy-100:  #A8C8E0;

  /* ── Amber (Primary Brand Accent) ── */
  --amber:       #F5A623;
  --amber-dark:  #C8821A;
  --amber-light: #FEF3DC;
  --amber-dim:   rgba(245, 166, 35, 0.10);
  --amber-glow:  rgba(245, 166, 35, 0.20);

  /* ── Light Mode Surfaces ── */
  --background:          210 25% 95%;   /* #EEF3F8 */
  --foreground:          214 80% 8%;    /* #05101F */

  --card:                0 0% 100%;
  --card-foreground:     214 80% 8%;

  --popover:             0 0% 100%;
  --popover-foreground:  214 80% 8%;

  --primary:             38 91% 55%;    /* #F5A623 — Amber */
  --primary-foreground:  214 80% 8%;    /* Navy on Amber */

  --secondary:           210 25% 95%;
  --secondary-foreground: 214 50% 30%;

  --muted:               210 20% 94%;
  --muted-foreground:    210 30% 50%;

  --accent:              38 91% 55%;
  --accent-foreground:   214 80% 8%;

  --destructive:         0 84% 60%;
  --destructive-foreground: 0 0% 100%;

  --border:              210 25% 88%;
  --input:               210 25% 88%;
  --ring:                38 91% 55%;    /* Amber focus ring */

  --radius: 0.625rem;                   /* 10px — precise, not rounded */
}

.dark {
  --background:          214 80% 8%;    /* #05101F — Deep Navy */
  --foreground:          210 40% 92%;   /* #E2EEF7 */

  --card:                212 70% 12%;   /* #0A1929 */
  --card-foreground:     210 40% 92%;

  --popover:             212 70% 12%;
  --popover-foreground:  210 40% 92%;

  --primary:             38 91% 55%;    /* Amber stays the same */
  --primary-foreground:  214 80% 8%;

  --secondary:           212 60% 16%;   /* #0D2137 */
  --secondary-foreground: 210 30% 70%;

  --muted:               212 60% 16%;
  --muted-foreground:    210 25% 50%;

  --accent:              38 91% 55%;
  --accent-foreground:   214 80% 8%;

  --destructive:         0 62% 50%;
  --destructive-foreground: 0 0% 100%;

  --border:              212 40% 22%;
  --input:               212 40% 22%;
  --ring:                38 91% 55%;
}
```

---

### 1B — Tailwind Config (tailwind.config.js)

Replace all `blue-*` references with the following mapping:

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        // Primary Brand — Amber
        brand: {
          DEFAULT: '#F5A623',
          dark:    '#C8821A',
          light:   '#FEF3DC',
          dim:     'rgba(245,166,35,0.10)',
          glow:    'rgba(245,166,35,0.20)',
        },
        // Navy Scale (replaces all blue-* classes)
        navy: {
          950: '#05101F',
          900: '#0A1929',
          800: '#0D2137',
          700: '#122845',
          600: '#1A3557',
          400: '#2E5480',
          200: '#5C8AB0',
          100: '#A8C8E0',
        },
        // Semantic (unchanged names, new values)
        success: '#16A34A',
        warning: '#D97706',
        error:   '#DC2626',
        info:    '#2563EB',
      },
      borderRadius: {
        DEFAULT: '10px',
        sm:  '7px',
        md:  '10px',
        lg:  '14px',
        xl:  '18px',
      },
      fontFamily: {
        sans: ['Instrument Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'amber': '0 4px 14px rgba(245,166,35,0.30)',
        'amber-lg': '0 8px 28px rgba(245,166,35,0.25)',
        'navy': '0 4px 20px rgba(5,16,31,0.12)',
      },
    },
  },
}
```

---

### 1C — Class Migration Map (Find & Replace)

Apply these replacements **globally** across all .tsx / .jsx / .ts files:

```
BACKGROUNDS:
bg-blue-600       → bg-brand
bg-blue-500       → bg-brand
bg-blue-700       → bg-brand-dark
bg-blue-800       → bg-navy-900
bg-blue-900       → bg-navy-950
bg-blue-50        → bg-brand-light
bg-blue-100       → bg-brand-dim  (use: bg-[rgba(245,166,35,0.10)])
bg-indigo-600     → bg-navy-600

TEXT COLORS:
text-blue-600     → text-brand
text-blue-500     → text-brand
text-blue-700     → text-brand-dark
text-blue-800     → text-navy-400
text-blue-900     → text-navy-950

BORDERS:
border-blue-600   → border-brand
border-blue-200   → border-brand-light
ring-blue-500     → ring-brand

GRADIENTS:
from-blue-600 to-indigo-600  → from-brand to-brand-dark
from-blue-500 to-blue-400    → from-brand to-brand-dark

HOVER STATES:
hover:bg-blue-700 → hover:bg-brand-dark
hover:text-blue-600 → hover:text-brand
```

---

## 2. TYPOGRAPHY SYSTEM

### 2A — Font Import (layout.tsx or _document.tsx)

```typescript
// In your <head> or next/font setup:
import { Instrument_Sans } from 'next/font/google'
import { JetBrains_Mono } from 'next/font/google'

const instrumentSans = Instrument_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
})
```

### 2B — Typography Scale

```css
/* Apply these as global styles */
h1 { font-size: 22px; font-weight: 700; letter-spacing: -0.3px; }
h2 { font-size: 18px; font-weight: 700; letter-spacing: -0.2px; }
h3 { font-size: 15px; font-weight: 700; }
h4 { font-size: 13.5px; font-weight: 700; }

/* Labels & metadata — always use mono */
.label-mono {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--muted-foreground);
}

/* ID tags (order numbers, codes) */
.id-tag {
  font-family: var(--font-mono);
  font-size: 11px;
  padding: 3px 7px;
  border-radius: 6px;
  background: hsl(var(--muted));
  border: 1px solid hsl(var(--border));
  color: hsl(var(--muted-foreground));
}
```

---

## 3. COMPONENT SPECIFICATIONS

### 3A — Primary Button

```tsx
// Primary CTA — Amber on Navy text
<button className="
  bg-brand hover:bg-brand-dark
  text-navy-950 font-semibold
  px-[18px] py-[9px] rounded-[10px]
  transition-all duration-150
  hover:-translate-y-px
  shadow-amber hover:shadow-amber-lg
  text-[13px]
">
  + הזמנה חדשה
</button>

// Secondary — Navy
<button className="
  bg-navy-900 hover:bg-navy-700
  text-[#e8f2fa] font-semibold
  px-[18px] py-[9px] rounded-[10px]
  transition-all duration-150 text-[13px]
">
  שמור
</button>

// Outline — Amber border
<button className="
  border-[1.5px] border-brand text-brand
  hover:bg-brand-dim
  px-[18px] py-[9px] rounded-[10px]
  font-semibold text-[13px] transition-all duration-150
">
  דוח מלא
</button>

// Ghost
<button className="
  border-[1.5px] border-border text-muted-foreground
  hover:border-border-2 hover:text-foreground
  hover:bg-secondary
  px-[18px] py-[9px] rounded-[10px]
  font-semibold text-[13px] transition-all duration-150
">
  ייצוא
</button>
```

### 3B — Input Fields

```tsx
<input className="
  w-full bg-secondary border-[1.5px] border-border
  rounded-[10px] px-[13px] py-[9px]
  font-sans text-[13px] text-foreground
  placeholder:text-muted-foreground
  outline-none transition-colors duration-150
  focus:border-brand focus:bg-card
" />
```

### 3C — Cards

```tsx
// Standard card
<div className="
  bg-card border border-border
  rounded-[14px] overflow-hidden
  shadow-navy
">
  {/* Card header */}
  <div className="
    flex items-center justify-between
    px-[18px] py-[14px]
    border-b border-border
  ">
    <h4>כותרת כרטיס</h4>
    {/* actions */}
  </div>
  {/* Card body */}
  <div className="p-[18px]">
    {/* content */}
  </div>
</div>

// Hero stat card (dark)
<div className="
  bg-navy-900 border border-navy-800
  rounded-[14px] p-[16px] relative overflow-hidden
">
  {/* Ambient glow top-right */}
  <div className="
    absolute top-0 right-0
    w-20 h-20 rounded-full
    bg-[radial-gradient(circle,rgba(245,166,35,0.15)_0%,transparent_70%)]
  " />
  {/* content */}
</div>
```

### 3D — Status Badges

```tsx
const statusConfig = {
  delivered: {
    label: 'נמסר',
    className: 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400',
    dot: 'bg-green-500',
  },
  inTransit: {
    label: 'בדרך',
    className: 'bg-brand-dim text-amber-700 dark:text-amber-400',
    dot: 'bg-brand',
  },
  pending: {
    label: 'ממתין',
    className: 'bg-secondary text-muted-foreground border border-border',
    dot: 'bg-muted-foreground',
  },
  cancelled: {
    label: 'בוטל',
    className: 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400',
    dot: 'bg-red-500',
  },
}

// Badge component:
<span className={`
  inline-flex items-center gap-[5px]
  px-[8px] py-[3px] rounded-[6px]
  text-[11px] font-bold
  ${statusConfig[status].className}
`}>
  <span className={`w-[5px] h-[5px] rounded-full ${statusConfig[status].dot}`} />
  {statusConfig[status].label}
</span>
```

### 3E — Sidebar (Web)

```tsx
// Sidebar background: bg-navy-900 (light mode) / bg-navy-950 (dark mode)
// Active item: border-r-2 border-brand + bg-brand-dim + text-brand
// Inactive: text-navy-200, hover: bg-white/5

// Active nav item
<div className="
  flex items-center gap-[9px] px-[10px] py-[9px]
  rounded-[10px] cursor-pointer
  border-r-2 border-brand
  bg-[rgba(245,166,35,0.10)] text-brand
  font-semibold text-[13.5px]
">

// Inactive nav item
<div className="
  flex items-center gap-[9px] px-[10px] py-[9px]
  rounded-[10px] cursor-pointer
  text-navy-200 font-medium text-[13.5px]
  hover:bg-white/5 hover:text-[#d8eaf5]
  transition-all duration-150
">
```

### 3F — Toast / Alert Notifications

```tsx
const toastVariants = {
  success: 'bg-green-50 text-green-800 border-r-[2.5px] border-green-500 dark:bg-green-950/20 dark:text-green-300',
  warning: 'bg-amber-50 text-amber-800 border-r-[2.5px] border-amber-500 dark:bg-amber-950/20 dark:text-amber-300',
  error:   'bg-red-50 text-red-800 border-r-[2.5px] border-red-500 dark:bg-red-950/20 dark:text-red-300',
  info:    'bg-blue-50 text-blue-800 border-r-[2.5px] border-blue-500 dark:bg-blue-950/20 dark:text-blue-300',
}

<div className={`
  flex items-center gap-[9px]
  px-[12px] py-[10px] rounded-[9px]
  text-[12px] font-semibold
  ${toastVariants[type]}
`}>
  {icon} {message}
</div>
```

---

## 4. ANDROID — JETPACK COMPOSE

### 4A — Color.kt (Complete Replacement)

```kotlin
package com.tzir.delivery.ui.theme

import androidx.compose.ui.graphics.Color

// ════════════════════════════════════════
// TZIR COMMAND — Android Color System
// Navy + Amber · TZIR Delivery v2.0
// ════════════════════════════════════════

// Amber (Primary Brand)
val Amber          = Color(0xFFF5A623)
val AmberDark      = Color(0xFFC8821A)
val AmberLight     = Color(0xFFFEF3DC)
val AmberDim       = Color(0x1AF5A623)  // 10% opacity

// Navy Scale
val Navy950        = Color(0xFF05101F)
val Navy900        = Color(0xFF0A1929)
val Navy800        = Color(0xFF0D2137)
val Navy700        = Color(0xFF122845)
val Navy600        = Color(0xFF1A3557)
val Navy400        = Color(0xFF2E5480)
val Navy200        = Color(0xFF5C8AB0)
val Navy100        = Color(0xFFA8C8E0)

// Surfaces — Light Mode
val SurfaceLight   = Color(0xFFFFFFFF)
val BackgroundLight = Color(0xFFEEF3F8)
val Surface2Light  = Color(0xFFF4F8FC)
val BorderLight    = Color(0xFFDDE6EF)

// Surfaces — Dark Mode
val SurfaceDark    = Color(0xFF0A1929)   // Navy900
val BackgroundDark = Color(0xFF05101F)   // Navy950
val Surface2Dark   = Color(0xFF0D2137)   // Navy800
val BorderDark     = Color(0x1F5C8AB0)   // Navy200 @ 12%

// Text — Light Mode
val TextPrimaryLight   = Color(0xFF05101F)
val TextSecondaryLight = Color(0xFF3A5068)
val TextMutedLight     = Color(0xFF7A9BB5)

// Text — Dark Mode
val TextPrimaryDark    = Color(0xFFEAF2FA)
val TextSecondaryDark  = Color(0xFF7AAAC8)
val TextMutedDark      = Color(0xFF2E5480)

// Semantic
val Success        = Color(0xFF16A34A)
val SuccessBg      = Color(0x1A16A34A)
val Warning        = Color(0xFFD97706)
val WarningBg      = Color(0x1AD97706)
val ErrorRed       = Color(0xFFDC2626)
val ErrorBg        = Color(0x1ADC2626)
val InfoBlue       = Color(0xFF2563EB)
val InfoBg         = Color(0x1A2563EB)

// Status colors
val StatusDelivered   = Success
val StatusInTransit   = Amber
val StatusPending     = Navy200
val StatusCancelled   = ErrorRed
```

### 4B — Theme.kt (Complete Replacement)

```kotlin
package com.tzir.delivery.ui.theme

import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

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

@Composable
fun TZIRTheme(
    darkTheme: Boolean,
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) TZIRDarkColorScheme else TZIRLightColorScheme

    MaterialTheme(
        colorScheme = colorScheme,
        typography  = TZIRTypography,
        content     = content
    )
}
```

### 4C — Type.kt

```kotlin
package com.tzir.delivery.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

// Add Instrument Sans to your res/font folder
val InstrumentSans = FontFamily(
    Font(R.font.instrument_sans_regular, FontWeight.Normal),
    Font(R.font.instrument_sans_medium, FontWeight.Medium),
    Font(R.font.instrument_sans_semibold, FontWeight.SemiBold),
    Font(R.font.instrument_sans_bold, FontWeight.Bold),
)

val TZIRTypography = Typography(
    headlineLarge  = TextStyle(fontFamily = InstrumentSans, fontWeight = FontWeight.Bold, fontSize = 28.sp, letterSpacing = (-0.5).sp),
    headlineMedium = TextStyle(fontFamily = InstrumentSans, fontWeight = FontWeight.Bold, fontSize = 22.sp, letterSpacing = (-0.3).sp),
    headlineSmall  = TextStyle(fontFamily = InstrumentSans, fontWeight = FontWeight.Bold, fontSize = 18.sp, letterSpacing = (-0.2).sp),
    titleLarge     = TextStyle(fontFamily = InstrumentSans, fontWeight = FontWeight.SemiBold, fontSize = 16.sp),
    titleMedium    = TextStyle(fontFamily = InstrumentSans, fontWeight = FontWeight.SemiBold, fontSize = 14.sp),
    titleSmall     = TextStyle(fontFamily = InstrumentSans, fontWeight = FontWeight.SemiBold, fontSize = 12.sp),
    bodyLarge      = TextStyle(fontFamily = InstrumentSans, fontWeight = FontWeight.Normal, fontSize = 15.sp),
    bodyMedium     = TextStyle(fontFamily = InstrumentSans, fontWeight = FontWeight.Normal, fontSize = 13.sp),
    bodySmall      = TextStyle(fontFamily = InstrumentSans, fontWeight = FontWeight.Normal, fontSize = 11.sp),
    labelLarge     = TextStyle(fontFamily = InstrumentSans, fontWeight = FontWeight.Bold, fontSize = 13.sp),
    labelMedium    = TextStyle(fontFamily = InstrumentSans, fontWeight = FontWeight.Bold, fontSize = 11.sp, letterSpacing = 0.5.sp),
    labelSmall     = TextStyle(fontFamily = InstrumentSans, fontWeight = FontWeight.Medium, fontSize = 10.sp, letterSpacing = 1.sp),
)
```

### 4D — Android Hardcoded Colors Migration

Replace all existing hardcoded Color() values:

```kotlin
// ── OLD → NEW ──────────────────────────────
// Backgrounds & surfaces
Color(0xFF001C44)  →  Navy950    // #05101F
Color(0xFF00251A)  →  Navy900    // #0A1929
Color(0xFF004E92)  →  Navy600    // #1A3557

// Primary accent (was cyan/turquoise)
Color(0xFF00D4FF)  →  Amber      // #F5A623
Color(0xFF00C4B4)  →  Amber      // #F5A623
Color(0xFF00E5FF)  →  Amber      // #F5A623

// Secondary accent (was royal blue)
Color(0xFF1565C0)  →  Navy600    // #1A3557
Color(0xFF004D40)  →  Navy700    // #122845

// Light backgrounds / off-white
Color(0xFFF8FBFE)  →  BackgroundLight  // #EEF3F8
Color(0xFFE0F7FA)  →  AmberLight       // #FEF3DC
Color(0xFFE3F2FD)  →  Surface2Light    // #F4F8FC
```

### 4E — Compose Component Snippets

```kotlin
// Primary Button
Button(
    onClick = { },
    colors = ButtonDefaults.buttonColors(
        containerColor = Amber,
        contentColor   = Navy950,
    ),
    shape = RoundedCornerShape(10.dp),
    elevation = ButtonDefaults.buttonElevation(defaultElevation = 0.dp),
) {
    Text(text = "הזמנה חדשה", fontWeight = FontWeight.SemiBold)
}

// Outlined Button
OutlinedButton(
    onClick = { },
    border = BorderStroke(1.5.dp, Amber),
    shape  = RoundedCornerShape(10.dp),
    colors = ButtonDefaults.outlinedButtonColors(contentColor = Amber),
) {
    Text("דוח מלא")
}

// Status Badge
@Composable
fun StatusBadge(status: OrderStatus) {
    val (bg, text, dot) = when (status) {
        OrderStatus.DELIVERED   -> Triple(SuccessBg, Success,  Success)
        OrderStatus.IN_TRANSIT  -> Triple(AmberDim,  AmberDark, Amber)
        OrderStatus.PENDING     -> Triple(Surface2Light, Navy400, Navy200)
        OrderStatus.CANCELLED   -> Triple(ErrorBg,   ErrorRed, ErrorRed)
    }
    Row(
        modifier = Modifier
            .background(bg, RoundedCornerShape(6.dp))
            .padding(horizontal = 8.dp, vertical = 3.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(5.dp)
    ) {
        Box(modifier = Modifier.size(5.dp).background(dot, CircleShape))
        Text(status.label, color = text, fontSize = 11.sp, fontWeight = FontWeight.Bold)
    }
}

// Card Surface
Card(
    modifier = Modifier.fillMaxWidth(),
    shape    = RoundedCornerShape(14.dp),
    colors   = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
    elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
) { }

// Top App Bar
TopAppBar(
    title = { Text("Dashboard", fontWeight = FontWeight.Bold) },
    colors = TopAppBarDefaults.topAppBarColors(
        containerColor = MaterialTheme.colorScheme.surface,
        titleContentColor = MaterialTheme.colorScheme.onSurface,
        actionIconContentColor = Amber,
    ),
)

// Bottom Navigation Bar
NavigationBar(
    containerColor = MaterialTheme.colorScheme.surface,
    tonalElevation = 0.dp,
) {
    // Selected item indicator uses Amber
    NavigationBarItem(
        selected = true,
        onClick = { },
        icon = { Icon(Icons.Default.Home, contentDescription = null) },
        label = { Text("בית") },
        colors = NavigationBarItemDefaults.colors(
            selectedIconColor      = Amber,
            selectedTextColor      = Amber,
            indicatorColor         = AmberDim,
            unselectedIconColor    = Navy200,
            unselectedTextColor    = Navy200,
        )
    )
}

// FAB (Floating Action Button)
FloatingActionButton(
    onClick = { },
    containerColor = Amber,
    contentColor   = Navy950,
    shape = RoundedCornerShape(13.dp),
    elevation = FloatingActionButtonDefaults.elevation(defaultElevation = 4.dp),
) {
    Icon(Icons.Default.Add, contentDescription = "הוסף")
}
```

---

## 5. DARK / LIGHT MODE LOGIC

```typescript
// Dark mode trigger priority (in order):
// 1. User preference stored in app settings
// 2. System/OS setting (prefers-color-scheme)
// 3. Time-based fallback: Dark after 20:00, Light before 07:00

// Time-based fallback (Next.js)
const getDefaultTheme = (): 'dark' | 'light' => {
  const hour = new Date().getHours()
  if (hour >= 20 || hour < 7) return 'dark'
  return 'light'
}

// Android equivalent:
fun getDefaultTheme(): Boolean {
  val hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
  return hour >= 20 || hour < 7  // true = dark
}
```

---

## 6. FOCUS RING & INTERACTION STATES

```css
/* Global focus ring — Amber, not blue */
*:focus-visible {
  outline: 2px solid #F5A623;
  outline-offset: 2px;
  border-radius: 6px;
}

/* Table row hover */
tbody tr:hover {
  background-color: rgba(245, 166, 35, 0.06);
}

/* Input active border */
input:focus, textarea:focus, select:focus {
  border-color: #F5A623 !important;
  box-shadow: 0 0 0 3px rgba(245, 166, 35, 0.12);
}

/* Button hover lift */
.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(245, 166, 35, 0.35);
}
```

---

## 7. SCROLLBAR STYLING

```css
/* Webkit browsers */
::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb {
  background: #2E5480;   /* Navy400 */
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover { background: #5C8AB0; }
```

---

## 8. QUALITY CHECKLIST (Apply before finalizing)

Before completing the migration, verify:

- [ ] Zero remaining `blue-*` Tailwind classes anywhere in the codebase
- [ ] Zero remaining `Color(0xFF00D4FF)` or similar old hardcoded values in Kotlin
- [ ] All focus rings are Amber, not blue
- [ ] All primary CTA buttons use Amber bg + Navy text
- [ ] Sidebar active state is Amber border-right + Amber text
- [ ] All status badges use the new 4-state system (delivered/transit/pending/cancelled)
- [ ] Dark mode tested — Navy backgrounds, Amber accents preserved
- [ ] Light mode tested — Clean #EEF3F8 bg, white cards, Amber CTAs
- [ ] Font is Instrument Sans throughout (not Inter, Roboto, or system-ui)
- [ ] Time-based theme switching implemented and tested
- [ ] Mobile Bottom Nav: selected = Amber, unselected = Navy200
- [ ] FAB button: Amber background, Navy950 icon

---

## 9. WHAT NOT TO CHANGE

Do NOT modify:
- Application logic, routing, or state management
- API calls, data structures, or business logic
- Component hierarchy or layout structure
- Existing animation durations (only change colors within animations)
- Accessibility attributes (aria-*, role, etc.)
- RTL/LTR direction logic

---

## 10. FINAL NOTE TO GEMINI

The goal of this migration is not just a color swap.
TZIR should feel like a premium command center — authoritative, precise,
and completely differentiated from every other delivery platform.

Every Amber element should feel intentional and earned.
Every Navy surface should feel deep and trustworthy.
White space is not empty — it is breathing room.

Execute with the precision of an Apple engineer
and the aesthetic judgment of a world-class product designer.

---
*TZIR Command Design System v2.0 — February 2026*
*Prepared for Gemini Pro migration prompt*
