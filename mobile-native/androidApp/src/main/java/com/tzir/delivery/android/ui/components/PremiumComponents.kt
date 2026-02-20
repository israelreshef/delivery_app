package com.tzir.delivery.android.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

// --- Apple-Level Color Palette ---
val PrimaryTurquoise = Color(0xFF00C4B4)
val SoftLightBlue = Color(0xFFE3F2FD)
val AppleWhite = Color(0xFFFFFFFF)
val AppleGray = Color(0xFFF5F5F7)
val TextOfficial = Color(0xFF1D1D1F)
val TextGray = Color(0xFF86868B)

@Composable
fun GlassCard(
    modifier: Modifier = Modifier,
    cornerRadius: Dp = 24.dp,
    content: @Composable BoxScope.() -> Unit
) {
    Box(
        modifier = modifier
            .shadow(
                elevation = 8.dp,
                shape = RoundedCornerShape(cornerRadius),
                ambientColor = Color.Black.copy(alpha = 0.05f),
                spotColor = Color.Black.copy(alpha = 0.05f)
            )
            .clip(RoundedCornerShape(cornerRadius))
            .background(AppleWhite)
            .border(
                width = 0.5.dp,
                color = Color.Black.copy(alpha = 0.05f),
                shape = RoundedCornerShape(cornerRadius)
            )
    ) {
        content()
    }
}

/**
 * A more professional, minimalist version of the dark card.
 * Uses a deep turquoise/navy mix for an official look without being "heavy".
 */
@Composable
fun OfficialCard(
    modifier: Modifier = Modifier,
    cornerRadius: Dp = 24.dp,
    content: @Composable BoxScope.() -> Unit
) {
    Box(
        modifier = modifier
            .shadow(
                elevation = 10.dp,
                shape = RoundedCornerShape(cornerRadius),
                ambientColor = PrimaryTurquoise.copy(alpha = 0.2f),
                spotColor = PrimaryTurquoise.copy(alpha = 0.2f)
            )
            .clip(RoundedCornerShape(cornerRadius))
            .background(
                Brush.verticalGradient(
                    colors = listOf(
                        Color(0xFF004D40), // Deep Turquoise
                        Color(0xFF00251A)
                    )
                )
            )
    ) {
        content()
    }
}

@Composable
fun AppleButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    containerColor: Color = PrimaryTurquoise
) {
    Button(
        onClick = onClick,
        modifier = modifier
            .height(52.dp)
            .fillMaxWidth(),
        enabled = enabled,
        shape = RoundedCornerShape(14.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = containerColor,
            contentColor = Color.White,
            disabledContainerColor = containerColor.copy(alpha = 0.5f),
            disabledContentColor = Color.White.copy(alpha = 0.5f)
        ),
        elevation = ButtonDefaults.buttonElevation(
            defaultElevation = 2.dp,
            pressedElevation = 0.dp
        )
    ) {
        Text(
            text = text,
            fontSize = 16.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 0.5.sp
        )
    }
}@Composable
fun DarkGlassCard(
    modifier: Modifier = Modifier,
    cornerRadius: Dp = 24.dp,
    content: @Composable BoxScope.() -> Unit
) {
    Box(
        modifier = modifier
            .shadow(12.dp, RoundedCornerShape(cornerRadius), ambientColor = Color.Black.copy(alpha = 0.3f))
            .clip(RoundedCornerShape(cornerRadius))
            .background(Color(0xFF1D1D1F)) // Deep Black/Gray
    ) {
        content()
    }
}

@Composable
fun NeonCard(
    modifier: Modifier = Modifier,
    cornerRadius: Dp = 24.dp,
    glowColor: Color = PrimaryTurquoise,
    content: @Composable BoxScope.() -> Unit
) {
    Box(
        modifier = modifier
            .shadow(16.dp, RoundedCornerShape(cornerRadius), spotColor = glowColor, ambientColor = glowColor)
            .clip(RoundedCornerShape(cornerRadius))
            .background(AppleWhite)
            .border(1.dp, glowColor.copy(alpha = 0.3f), RoundedCornerShape(cornerRadius))
    ) {
        content()
    }
}

@Composable
fun EarningsRow(
    label: String, 
    value: String, 
    isBold: Boolean = false, 
    isPositive: Boolean = false, 
    isNegative: Boolean = false,
    fontSize: androidx.compose.ui.unit.TextUnit = 16.sp
) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = label, 
            color = if (isBold) TextOfficial else Color.Gray,
            fontSize = fontSize,
            fontWeight = if (isBold) FontWeight.ExtraBold else FontWeight.Medium
        )
        Text(
            text = value,
            color = when {
                isPositive -> Color(0xFF2E7D32)
                isNegative -> Color(0xFFD32F2F)
                else -> TextOfficial
            },
            fontSize = fontSize,
            fontWeight = if (isBold) FontWeight.ExtraBold else FontWeight.Bold
        )
    }
}

@Composable
fun ActiveMissionCard(mission: com.tzir.delivery.shared.model.Mission, onDetailsClick: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .shadow(8.dp, RoundedCornerShape(24.dp))
            .clip(RoundedCornerShape(24.dp))
            .clickable(onClick = onDetailsClick),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF004D40)), // Official Deep Turquoise
        shape = RoundedCornerShape(24.dp)
    ) {
        Column(modifier = Modifier.padding(24.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Surface(
                    color = AppleWhite.copy(alpha = 0.2f),
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
                    color = SoftLightBlue, 
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp
                )
            }
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                "${androidx.compose.ui.res.stringResource(com.tzir.delivery.android.R.string.order_prefix)}${mission.orderNumber}", 
                color = Color.White, 
                fontSize = 24.sp, 
                fontWeight = FontWeight.Black
            )
            Spacer(modifier = Modifier.height(8.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("📍", fontSize = 12.sp)
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    mission.pickupAddress, 
                    color = Color.White.copy(alpha = 0.7f), 
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

@Composable
fun StatCard(label: String, value: String, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = Color.White),
        shape = RoundedCornerShape(20.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp)
        ) {
            Text(
                text = label, 
                color = Color.Gray, 
                fontSize = 13.sp,
                fontWeight = FontWeight.Medium
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = value, 
                style = MaterialTheme.typography.headlineSmall, 
                fontWeight = FontWeight.ExtraBold, 
                color = Color(0xFF001C44)
            )
        }
    }
}
