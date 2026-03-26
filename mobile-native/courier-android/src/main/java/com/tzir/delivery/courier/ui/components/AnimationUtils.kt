package com.tzir.delivery.courier.ui.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.composed
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import com.tzir.delivery.courier.ui.theme.*

// ════════════════════════════════════════
// TZIR Animation Utilities
// Micro-interactions & shared animations
// ════════════════════════════════════════

/**
 * Modifier extension: press-to-scale spring animation.
 * Gives buttons and cards an Apple-like "push down" feel.
 */
fun Modifier.scaleOnPress(
    interactionSource: MutableInteractionSource,
    targetScale: Float = 0.96f
): Modifier = composed {
    val isPressed by interactionSource.collectIsPressedAsState()
    val scale by animateFloatAsState(
        targetValue = if (isPressed) targetScale else 1f,
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioMediumBouncy,
            stiffness = Spring.StiffnessLow
        ),
        label = "scaleOnPress"
    )
    this.graphicsLayer {
        scaleX = scale
        scaleY = scale
    }
}

/**
 * Staggered fade-slide-in animation for list items.
 * Usage: Modifier.fadeSlideIn(index, visible)
 */
fun Modifier.fadeSlideIn(
    index: Int,
    visible: Boolean,
    baseDelay: Int = 50,
    duration: Int = 400
): Modifier = composed {
    val delay = index * baseDelay
    val alpha by animateFloatAsState(
        targetValue = if (visible) 1f else 0f,
        animationSpec = tween(durationMillis = duration, delayMillis = delay, easing = FastOutSlowInEasing),
        label = "fadeAlpha_$index"
    )
    val offsetY by animateFloatAsState(
        targetValue = if (visible) 0f else 40f,
        animationSpec = tween(durationMillis = duration, delayMillis = delay, easing = FastOutSlowInEasing),
        label = "fadeOffset_$index"
    )
    this.graphicsLayer {
        this.alpha = alpha
        translationY = offsetY
    }
}

/**
 * Shimmer loading effect — horizontal gradient sweep.
 */
fun Modifier.shimmerEffect(): Modifier = composed {
    val transition = rememberInfiniteTransition(label = "shimmer")
    val offsetX by transition.animateFloat(
        initialValue = -300f,
        targetValue = 1000f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1200, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "shimmerOffset"
    )
    this.background(
        Brush.linearGradient(
            colors = listOf(
                Color.Transparent,
                Color.White.copy(alpha = 0.12f),
                Color.Transparent
            ),
            start = Offset(offsetX, 0f),
            end = Offset(offsetX + 300f, 0f)
        )
    )
}

/**
 * Pulse glow effect — infinite scale pulse for active indicators.
 */
@Composable
fun rememberPulseScale(
    minScale: Float = 0.95f,
    maxScale: Float = 1.05f,
    durationMs: Int = 1500
): Float {
    val transition = rememberInfiniteTransition(label = "pulse")
    val scale by transition.animateFloat(
        initialValue = minScale,
        targetValue = maxScale,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMs, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulseScale"
    )
    return scale
}

/**
 * Counter animation — smoothly animate between two numeric values.
 */
@Composable
fun animateCounterFloat(
    targetValue: Float,
    durationMs: Int = 800
): Float {
    val animatable = remember { Animatable(0f) }
    LaunchedEffect(targetValue) {
        animatable.animateTo(
            targetValue = targetValue,
            animationSpec = tween(durationMillis = durationMs, easing = FastOutSlowInEasing)
        )
    }
    return animatable.value
}

/**
 * Counter animation for integers — smoothly count up.
 */
@Composable
fun animateCounterInt(
    targetValue: Int,
    durationMs: Int = 800
): Int {
    return animateCounterFloat(targetValue.toFloat(), durationMs).toInt()
}
