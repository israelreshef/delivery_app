package com.tzir.delivery.android.ui.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.Spring
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
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

import com.tzir.delivery.android.ui.theme.*

// ════════════════════════════════════════
// TZIR Premium Components v3.0
// Glassmorphic · Theme-Aware · Apple-Inspired
// ════════════════════════════════════════

/**
 * Glassmorphic Card — the primary card component.
 * Adapts automatically to dark/light mode.
 * Uses semi-transparent background with subtle border.
 */
@Composable
fun GlassCard(
    modifier: Modifier = Modifier,
    cornerRadius: Dp = 24.dp,
    opacity: Float = 1f,
    content: @Composable BoxScope.() -> Unit
) {
    val isDark = true // Force dark for premium components
    val bgColor = if (isDark) Color(0xCC080808) else Color(0xCCFFFFFF)
    val borderColor = if (isDark) Color(0x1AFFFFFF) else Color(0x14000000)

    Box(
        modifier = modifier
            .shadow(
                elevation = if (isDark) 20.dp else 10.dp,
                shape = RoundedCornerShape(cornerRadius),
                ambientColor = Color.Black.copy(alpha = if (isDark) 0.5f else 0.08f),
                spotColor = Color.Black.copy(alpha = if (isDark) 0.5f else 0.08f)
            )
            .clip(RoundedCornerShape(cornerRadius))
            .background(bgColor.copy(alpha = bgColor.alpha * opacity))
            .border(
                width = 0.5.dp,
                color = borderColor,
                shape = RoundedCornerShape(cornerRadius)
            )
    ) {
        content()
    }
}

/**
 * Glow Card — glassmorphic card with animated amber glow.
 * Used for highlighted items like active missions.
 */
@Composable
fun GlowCard(
    modifier: Modifier = Modifier,
    cornerRadius: Dp = 24.dp,
    glowColor: Color = AmberGold,
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
 * Stat Card — for displaying KPI metrics.
 * Theme-aware, glassmorphic surface.
 */
@Composable
fun StatCard(label: String, value: String, modifier: Modifier = Modifier) {
    GlassCard(modifier = modifier) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp)
        ) {
            Text(
                text = label,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                fontSize = 13.sp,
                fontWeight = FontWeight.Medium
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = value,
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.ExtraBold,
                color = MaterialTheme.colorScheme.onSurface
            )
        }
    }
}

/**
 * Earnings Row — used in earnings detail sheets.
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

/**
 * Active Mission Card — glassmorphic with amber glow accent.
 */
@Composable
fun ActiveMissionCard(mission: com.tzir.delivery.shared.model.Mission, onDetailsClick: () -> Unit) {
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()
    val scale by animateFloatAsState(
        if (isPressed) 0.97f else 1f,
        spring(Spring.DampingRatioMediumBouncy, Spring.StiffnessLow),
        label = "missionScale"
    )

    val isDark = TZIRTheme.colors == DarkExtendedColors

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .graphicsLayer { scaleX = scale; scaleY = scale }
            .shadow(
                elevation = 16.dp,
                shape = RoundedCornerShape(24.dp),
                spotColor = AmberGold.copy(alpha = 0.3f),
                ambientColor = AmberGold.copy(alpha = 0.2f)
            )
            .clip(RoundedCornerShape(24.dp))
            .clickable(interactionSource = interactionSource, indication = null, onClick = onDetailsClick),
        colors = CardDefaults.cardColors(
            containerColor = if (isDark) Graphite800 else SurfaceLight
        ),
        shape = RoundedCornerShape(24.dp)
    ) {
        Column(modifier = Modifier.padding(24.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Surface(
                    color = AmberGold.copy(alpha = 0.15f),
                    shape = CircleShape,
                    modifier = Modifier.size(32.dp)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Text("🚚", fontSize = 16.sp)
                    }
                }
                Spacer(modifier = Modifier.width(12.dp))
                Text(
                    androidx.compose.ui.res.stringResource(com.tzir.delivery.android.R.string.status_btn_transit),
                    color = AmberGold,
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp
                )
            }
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                "${androidx.compose.ui.res.stringResource(com.tzir.delivery.android.R.string.order_prefix)}${mission.orderNumber}",
                color = MaterialTheme.colorScheme.onSurface,
                fontSize = 24.sp,
                fontWeight = FontWeight.Black
            )
            Spacer(modifier = Modifier.height(8.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("📍", fontSize = 12.sp)
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    mission.pickupAddress,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    fontSize = 14.sp,
                    maxLines = 1,
                    overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis
                )
            }
            Spacer(modifier = Modifier.height(20.dp))
            TzirButton(
                text = androidx.compose.ui.res.stringResource(com.tzir.delivery.android.R.string.status_btn_update),
                onClick = onDetailsClick,
                modifier = Modifier.height(48.dp)
            )
        }
    }
}

/**
 * Apple-style button — used for secondary/outlined actions.
 */
@Composable
fun AppleButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    containerColor: Color = AmberGold
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()
    val scale by animateFloatAsState(
        if (isPressed) 0.96f else 1f,
        spring(Spring.DampingRatioMediumBouncy, Spring.StiffnessLow),
        label = "appleBtn"
    )

    Button(
        onClick = onClick,
        modifier = modifier
            .graphicsLayer { scaleX = scale; scaleY = scale }
            .height(52.dp)
            .fillMaxWidth(),
        enabled = enabled,
        shape = RoundedCornerShape(14.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = containerColor,
            contentColor = Graphite950,
            disabledContainerColor = containerColor.copy(alpha = 0.5f),
            disabledContentColor = Graphite950.copy(alpha = 0.5f)
        ),
        elevation = ButtonDefaults.buttonElevation(
            defaultElevation = 2.dp,
            pressedElevation = 0.dp
        ),
        interactionSource = interactionSource
    ) {
        Text(
            text = text,
            fontSize = 16.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 0.3.sp
        )
    }
}
