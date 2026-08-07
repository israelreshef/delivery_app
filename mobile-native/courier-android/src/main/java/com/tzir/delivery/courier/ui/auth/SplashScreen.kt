package com.tzir.delivery.courier.ui.auth

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.*
import androidx.compose.ui.graphics.*
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tzir.delivery.courier.R
import com.tzir.delivery.courier.ui.theme.*
import kotlinx.coroutines.delay

@Composable
fun SplashScreen(onAnimationFinish: () -> Unit) {
    var visible by remember { mutableStateOf(false) }

    // Logo spring scale
    val scale by animateFloatAsState(
        targetValue = if (visible) 1f else 0.7f,
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioMediumBouncy,
            stiffness = Spring.StiffnessLow
        ),
        label = "logoScale"
    )

    // Logo alpha
    val logoAlpha by animateFloatAsState(
        targetValue = if (visible) 1f else 0f,
        animationSpec = tween(800),
        label = "logoAlpha"
    )

    LaunchedEffect(Unit) {
        visible = true
        delay(2200)
        onAnimationFinish()
    }

    val isDark = true // Splash always dark for dramatic effect

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Graphite900),
        contentAlignment = Alignment.Center
    ) {
        // Subtle BrandBlue radial glow
        Box(
            modifier = Modifier
                .size(400.dp)
                .background(
                    Brush.radialGradient(
                        colors = listOf(
                            BrandBlue.copy(alpha = 0.06f),
                            Color.Transparent
                        )
                    )
                )
        )

        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // Logo Circle
            Box(
                modifier = Modifier
                    .size(140.dp)
                    .graphicsLayer {
                        scaleX = scale
                        scaleY = scale
                        alpha = logoAlpha
                    }
                    .shadow(
                        elevation = 24.dp,
                        shape = CircleShape,
                        ambientColor = BrandBlue.copy(alpha = 0.15f),
                        spotColor = BrandBlue.copy(alpha = 0.2f)
                    )
                    .background(Graphite800, CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    "TZIR",
                    style = androidx.compose.ui.text.TextStyle(
                        brush = Brush.linearGradient(
                            colors = listOf(BrandBlue, BrandBlueDark)
                        ),
                        fontWeight = FontWeight.Black,
                        fontSize = 38.sp,
                        letterSpacing = 2.sp
                    )
                )
            }

            Spacer(modifier = Modifier.height(40.dp))

            // App name + subtitle
            AnimatedVisibility(
                visible = visible,
                enter = fadeIn(tween(1000, delayMillis = 400)) +
                        slideInVertically(tween(1000, delayMillis = 400)) { it / 3 }
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        stringResource(R.string.app_name),
                        color = TextPrimaryDark,
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.sp
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        stringResource(R.string.splash_subtitle),
                        color = Graphite300,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Normal
                    )
                }
            }
        }

        // Loading indicator
        AnimatedVisibility(
            visible = visible,
            enter = fadeIn(tween(600, delayMillis = 800)),
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 64.dp)
        ) {
            CircularProgressIndicator(
                modifier = Modifier.size(22.dp),
                color = BrandBlue,
                strokeWidth = 2.dp
            )
        }
    }
}
