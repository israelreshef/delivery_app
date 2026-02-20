package com.tzir.delivery.android.ui.auth

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
import com.tzir.delivery.android.R
import com.tzir.delivery.android.ui.components.*
import kotlinx.coroutines.delay

@Composable
fun SplashScreen(onAnimationFinish: () -> Unit) {
    var visible by remember { mutableStateOf(false) }
    val scale by animateFloatAsState(
        targetValue = if (visible) 1.1f else 0.8f,
        animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy, stiffness = Spring.StiffnessLow),
        label = "logoScale"
    )

    LaunchedEffect(Unit) {
        visible = true
        delay(2500) // Slightly longer for premium feel
        onAnimationFinish()
    }

    PremiumBackground {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Box(
                    modifier = Modifier
                        .size(160.dp)
                        .graphicsLayer {
                            scaleX = scale
                            scaleY = scale
                        }
                        .shadow(24.dp, CircleShape, ambientColor = PrimaryTurquoise.copy(alpha = 0.2f))
                        .background(AppleWhite, CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        "TZIR",
                        style = androidx.compose.ui.text.TextStyle(
                            brush = Brush.linearGradient(
                                colors = listOf(
                                PrimaryTurquoise,
                                TextOfficial
                            )
                            ),
                            fontWeight = FontWeight.Black,
                            fontSize = 42.sp,
                            letterSpacing = 2.sp
                        )
                    )
                }
                
                Spacer(modifier = Modifier.height(48.dp))
                
                AnimatedVisibility(
                    visible = visible,
                    enter = fadeIn(animationSpec = tween(1000, delayMillis = 500)) + 
                            slideInVertically(animationSpec = tween(1000, delayMillis = 500)) { it / 2 }
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            stringResource(R.string.app_name),
                            color = TextOfficial,
                            fontSize = 24.sp,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 1.sp
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            stringResource(R.string.splash_subtitle),
                            color = TextGray,
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
            }
            
            // Minimal Loading Indicator at bottom
            Box(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(bottom = 64.dp)
            ) {
                CircularProgressIndicator(
                    modifier = Modifier.size(24.dp),
                    color = PrimaryTurquoise,
                    strokeWidth = 2.dp
                )
            }
        }
    }
}
