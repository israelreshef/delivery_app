package com.tzir.delivery.customer.ui.customer

import androidx.compose.animation.*
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavHostController
import com.tzir.delivery.customer.ui.components.*
import com.tzir.delivery.customer.ui.theme.*
import kotlinx.coroutines.delay

/**
 * Screen shown after an order is successfully placed.
 * Displays: order number, estimated time, and courier name (when assigned).
 *
 * Navigation args (all required, passed as route segments):
 *   orderNumber   – e.g. "ORD-20260320-ABC123"
 *   estimatedTime – ISO string or human-readable string  e.g. "כ-45 דקות"
 *   courierName   – courier full name, or "" if not yet assigned
 */
@Composable
fun OrderConfirmationScreen(
    navController: NavHostController,
    orderNumber: String,
    estimatedTime: String,
    courierName: String
) {
    var showContent by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        delay(150) // Small delay for a nice entrance animation
        showContent = true
    }

    PremiumBackground {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            AnimatedVisibility(
                visible = showContent,
                enter = scaleIn() + fadeIn()
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {

                    // ✅ Success Icon
                    Box(
                        modifier = Modifier
                            .size(96.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.CheckCircle,
                            contentDescription = null,
                            tint = BrandBlue,
                            modifier = Modifier.size(96.dp)
                        )
                    }

                    Spacer(Modifier.height(24.dp))

                    Text(
                        text = "ההזמנה נשלחה בהצלחה!",
                        fontSize = 26.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                        textAlign = TextAlign.Center
                    )

                    Spacer(Modifier.height(8.dp))

                    Text(
                        text = "שליחך כבר בדרך אליך",
                        fontSize = 15.sp,
                        color = Graphite400,
                        textAlign = TextAlign.Center
                    )

                    Spacer(Modifier.height(32.dp))

                    // ─── Order Details Card ───────────────────────────────
                    GlassCard(modifier = Modifier.fillMaxWidth()) {
                        Column(
                            modifier = Modifier.padding(20.dp),
                            verticalArrangement = Arrangement.spacedBy(14.dp)
                        ) {
                            ConfirmationRow(
                                icon = Icons.Default.Receipt,
                                label = "מספר הזמנה",
                                value = orderNumber
                            )
                            HorizontalDivider(color = Color.White.copy(alpha = 0.08f))
                            ConfirmationRow(
                                icon = Icons.Default.Schedule,
                                label = "זמן משוער",
                                value = estimatedTime.ifBlank { "מחושב..." }
                            )
                            if (courierName.isNotBlank()) {
                                HorizontalDivider(color = Color.White.copy(alpha = 0.08f))
                                ConfirmationRow(
                                    icon = Icons.Default.DeliveryDining,
                                    label = "שליח",
                                    value = courierName
                                )
                            }
                        }
                    }

                    Spacer(Modifier.height(32.dp))

                    // ─── Buttons ──────────────────────────────────────────
                    TzirButton(
                        text = "עקוב אחר ההזמנה",
                        onClick = { navController.navigate("tracking/$orderNumber") },
                        modifier = Modifier.fillMaxWidth().height(54.dp),
                        icon = Icons.Default.Visibility
                    )

                    Spacer(Modifier.height(12.dp))

                    TextButton(
                        onClick = {
                            navController.popBackStack(CustomerScreen.Home.route, inclusive = false)
                        }
                    ) {
                        Text("חזרה לדף הבית", color = Graphite400, fontSize = 14.sp)
                    }
                }
            }
        }
    }
}

@Composable
private fun ConfirmationRow(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    value: String
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(icon, contentDescription = null, tint = BrandBlue, modifier = Modifier.size(20.dp))
        Spacer(Modifier.width(12.dp))
        Column {
            Text(label, color = Graphite400, fontSize = 11.sp)
            Text(value, color = Color.White, fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
        }
    }
}
