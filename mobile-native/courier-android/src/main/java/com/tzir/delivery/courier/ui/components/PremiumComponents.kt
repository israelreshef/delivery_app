package com.tzir.delivery.courier.ui.components

import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
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
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

import com.tzir.delivery.courier.ui.theme.*

// TZIR Premium Components v3.0
// Glassmorphic ֲ· Theme-Aware ֲ· Apple-Inspired
// Glassmorphism components already available in PremiumComponents.kt (ported per Phase 2)
// ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•

/**
 * Glassmorphic Card ג€” the primary card component.
 * Adapts automatically to dark/light mode.
 * Uses semi-transparent background with subtle border.
 */
@Composable
fun GlassCard(
    modifier: Modifier = Modifier,
    cornerRadius: Dp = 24.dp,
    opacity: Float = 0.85f,
    content: @Composable BoxScope.() -> Unit
) {
    val isDark = TZIRTheme.colors == DarkExtendedColors
    val bgColor = if (isDark) Color(0xFF0D0D10).copy(alpha = opacity) else Color(0xFFFFFFFF).copy(alpha = opacity)
    val borderColor = if (isDark) Color(0x33FFFFFF) else Color(0x14000000)

    Box(
        modifier = modifier
            .shadow(
                elevation = 12.dp,
                shape = RoundedCornerShape(cornerRadius),
                ambientColor = Color.Black.copy(alpha = if (isDark) 0.4f else 0.05f),
                spotColor = Color.Black.copy(alpha = if (isDark) 0.4f else 0.05f)
            )
            .clip(RoundedCornerShape(cornerRadius))
            .background(
                Brush.linearGradient(
                    colors = listOf(
                        bgColor,
                        bgColor.copy(alpha = bgColor.alpha * 0.9f)
                    )
                )
            )
            .border(
                width = 1.dp,
                brush = Brush.linearGradient(
                    colors = listOf(
                        borderColor,
                        borderColor.copy(alpha = 0.1f)
                    )
                ),
                shape = RoundedCornerShape(cornerRadius)
            )
    ) {
        content()
    }
}

/**
 * Glow Card ג€” glassmorphic card with animated amber glow.
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
 * Earnings Row ג€” used in earnings detail sheets.
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
 * Active Mission Card ג€” glassmorphic with amber glow accent.
 */
@Composable
fun ActiveMissionCard(mission: com.tzir.delivery.courier.model.Mission, onDetailsClick: () -> Unit) {
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
                        Text("נ", fontSize = 16.sp)
                    }
                }
                Spacer(modifier = Modifier.width(12.dp))
                Text(
                    androidx.compose.ui.res.stringResource(com.tzir.delivery.courier.R.string.status_btn_transit),
                    color = AmberGold,
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp
                )
            }
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                "${androidx.compose.ui.res.stringResource(com.tzir.delivery.courier.R.string.order_prefix)}${mission.orderNumber}",
                color = MaterialTheme.colorScheme.onSurface,
                fontSize = 24.sp,
                fontWeight = FontWeight.Black
            )
            Spacer(modifier = Modifier.height(8.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("נ“", fontSize = 12.sp)
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
                text = androidx.compose.ui.res.stringResource(com.tzir.delivery.courier.R.string.status_btn_update),
                onClick = onDetailsClick,
                modifier = Modifier.height(48.dp)
            )
        }
    }
}

/**
 * Apple-style button ג€” used for secondary/outlined actions.
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

@Composable
fun OrderOfferDialog(
    mission: com.tzir.delivery.courier.model.Mission,
    onAccept: () -> Unit,
    onDecline: () -> Unit,
    isLoading: Boolean = false
) {
    Dialog(
        onDismissRequest = { /* No dismiss outside */ },
        properties = DialogProperties(dismissOnBackPress = false, dismissOnClickOutside = false)
    ) {
        Card(
            modifier = Modifier.fillMaxWidth().padding(16.dp),
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
        ) {
            Column(
                modifier = Modifier.padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Header
                Text(
                    text = "הצעה למשלוח חדש!",
                    fontSize = 22.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = AmberGold
                )
                Spacer(modifier = Modifier.height(16.dp))

                // Addresses
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                    Text("🟢", fontSize = 16.sp)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = mission.pickupAddress,
                        maxLines = 1,
                        fontSize = 15.sp,
                        color = MaterialTheme.colorScheme.onSurface,
                        fontWeight = FontWeight.Bold
                    )
                }
                Spacer(modifier = Modifier.height(8.dp))
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                    Text("🔴", fontSize = 16.sp)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = mission.deliveryAddress,
                        maxLines = 1,
                        fontSize = 15.sp,
                        color = MaterialTheme.colorScheme.onSurface,
                        fontWeight = FontWeight.Bold
                    )
                }
                
                Spacer(modifier = Modifier.height(16.dp))
                HorizontalDivider(color = Color.Gray.copy(alpha = 0.2f))
                Spacer(modifier = Modifier.height(16.dp))

                // Price
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center) {
                    val displayPrice = mission.price ?: mission.estimatedPrice
                    Text(
                        text = "₪ $displayPrice",
                        fontSize = 32.sp,
                        fontWeight = FontWeight.Black,
                        color = SuccessDark
                    )
                }

                Spacer(modifier = Modifier.height(24.dp))

                // Buttons
                if (isLoading) {
                    CircularProgressIndicator(color = AmberGold)
                } else {
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                        Button(
                            onClick = onDecline,
                            modifier = Modifier.weight(1f).height(50.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = Color.DarkGray, contentColor = Color.White),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Text("דחה", fontSize = 16.sp, fontWeight = FontWeight.Bold)
                        }
                        
                        Button(
                            onClick = onAccept,
                            modifier = Modifier.weight(1f).height(50.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = AmberGold, contentColor = Color.Black),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Text("קבל", fontSize = 16.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}
