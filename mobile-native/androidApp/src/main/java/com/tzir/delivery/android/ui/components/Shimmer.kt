
package com.tzir.delivery.android.ui.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

@Composable
fun ShimmerItem(
    height: Dp,
    width: Modifier = Modifier.fillMaxWidth(),
    shape: androidx.compose.ui.graphics.Shape = RoundedCornerShape(8.dp)
) {
    val shimmerColors = listOf(
        Color.LightGray.copy(alpha = 0.6f),
        Color.LightGray.copy(alpha = 0.2f),
        Color.LightGray.copy(alpha = 0.6f),
    )

    val transition = rememberInfiniteTransition(label = "shimmer")
    val translateAnim = transition.animateFloat(
        initialValue = 0f,
        targetValue = 1000f,
        animationSpec = infiniteRepeatable(
            animation = tween(
                durationMillis = 1000,
                easing = FastOutSlowInEasing
            ),
            repeatMode = RepeatMode.Restart
        ),
        label = "translate"
    )

    val brush = Brush.linearGradient(
        colors = shimmerColors,
        start = Offset.Zero,
        end = Offset(x = translateAnim.value, y = translateAnim.value)
    )

    Spacer(
        modifier = width
            .height(height)
            .background(brush = brush, shape = shape)
    )
}

@Composable
fun ShimmerMissionList() {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        repeat(5) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color.White, RoundedCornerShape(12.dp))
                    .padding(16.dp)
            ) {
                Column {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        ShimmerItem(height = 20.dp, width = Modifier.width(120.dp))
                        ShimmerItem(height = 20.dp, width = Modifier.width(60.dp))
                    }
                    Spacer(modifier = Modifier.height(16.dp))
                    ShimmerItem(height = 14.dp, width = Modifier.fillMaxWidth(0.7f))
                    Spacer(modifier = Modifier.height(8.dp))
                    ShimmerItem(height = 14.dp, width = Modifier.fillMaxWidth(0.5f))
                }
            }
        }
    }
}
