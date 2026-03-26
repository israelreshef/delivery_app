package com.tzir.delivery.customer.ui.customer

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavHostController
import com.tzir.delivery.customer.model.*
import com.tzir.delivery.customer.repository.CustomerRepository
import androidx.compose.ui.res.stringResource
import com.tzir.delivery.customer.R
import com.tzir.delivery.customer.ui.theme.*
import com.tzir.delivery.customer.ui.components.*
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OrderSummaryScreen(
    pickup: String,
    delivery: String,
    pLat: Double,
    pLng: Double,
    dLat: Double,
    dLng: Double,
    navController: NavHostController,
    repository: CustomerRepository
) {
    val scope = rememberCoroutineScope()
    var isLoading by remember { mutableStateOf(false) }
    var isQuoteLoading by remember { mutableStateOf(true) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    var estimatedPrice by remember { mutableStateOf<Double?>(null) }
    var distanceKm by remember { mutableStateOf<Double?>(null) }
    var durationMins by remember { mutableStateOf<Double?>(null) }

    LaunchedEffect(pLat, pLng, dLat, dLng) {
        val quote = repository.getOrderQuote(pLat, pLng, dLat, dLng)
        if (quote != null && quote.success == true) {
            estimatedPrice = quote.price
            distanceKm = quote.distance_km
            durationMins = quote.duration_mins
        } else {
            errorMessage = "שגיאה או בעיה בתמחור מסלול"
        }
        isQuoteLoading = false
    }

    val mockPackageLabel = stringResource(R.string.mock_package)

    PremiumBackground {
        Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = { navController.popBackStack() }) {
                    Icon(Icons.Default.ArrowBack, contentDescription = null, tint = AmberGold)
                }
                Text(stringResource(R.string.order_summary), fontSize = 24.sp, fontWeight = FontWeight.Bold, color = Color.White)
            }

            Spacer(modifier = Modifier.height(32.dp))

            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(24.dp)) {
                    SummaryItem(icon = Icons.Default.MyLocation, label = stringResource(R.string.pickup), value = pickup)
                    Spacer(Modifier.height(16.dp))
                    SummaryItem(icon = Icons.Default.Place, label = stringResource(R.string.delivery_dest), value = delivery, iconColor = Color.Red)
                    Spacer(Modifier.height(24.dp))
                    HorizontalDivider(color = Color.White.copy(alpha = 0.1f))
                    Spacer(Modifier.height(16.dp))
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("מסלול משוער", color = Graphite400)
                        if (isQuoteLoading) {
                            CircularProgressIndicator(color = AmberGold, modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                        } else {
                            Text("${distanceKm ?: "--"} ק״מ • ${durationMins ?: "--"} דק׳", color = Color.White, fontWeight = FontWeight.Bold)
                        }
                    }
                    Spacer(Modifier.height(8.dp))
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text(stringResource(R.string.estimated_price), color = Graphite400)
                        if (isQuoteLoading) {
                            CircularProgressIndicator(color = AmberGold, modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                        } else {
                            Text("₪ ${estimatedPrice ?: "--"}", color = AmberGold, fontWeight = FontWeight.Black, fontSize = 18.sp)
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            Text(stringResource(R.string.payment_method), color = Graphite400, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
            Spacer(modifier = Modifier.height(12.dp))

            GlassCard(modifier = Modifier.fillMaxWidth().clickable { /* TODO: Select card */ }) {
                Row(modifier = Modifier.padding(20.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.CreditCard, null, tint = AmberGold)
                    Spacer(Modifier.width(16.dp))
                    Text(stringResource(R.string.visa_test), color = Color.White)
                    Spacer(Modifier.weight(1f))
                    Icon(Icons.Default.ChevronRight, null, tint = Graphite400)
                }
            }

            Spacer(modifier = Modifier.weight(1f))

            // Error message
            errorMessage?.let { msg ->
                Text(
                    text = msg,
                    color = Color.Red,
                    fontSize = 14.sp,
                    modifier = Modifier.padding(horizontal = 4.dp, vertical = 8.dp)
                )
            }

            if (isLoading) {
                CircularProgressIndicator(
                    modifier = Modifier.align(Alignment.CenterHorizontally),
                    color = AmberGold
                )
            } else {
                TzirButton(
                    text = stringResource(R.string.confirm_order),
                    onClick = {
                        scope.launch {
                            isLoading = true
                            errorMessage = null
                            val orderNumber = repository.createOrder(
                                CreateOrderRequest(
                                    sender = SenderData(
                                        senderName = "Demo Customer",
                                        senderPhone = "0503333333",
                                        senderAddress = AddressData(pickup, lat = pLat, lon = pLng)
                                    ),
                                    recipient = RecipientData(
                                        recipientName = "Recipient",
                                        recipientPhone = "0504444444",
                                        recipientAddress = AddressData(delivery, lat = dLat, lon = dLng)
                                    ),
                                    package_data = PackageData(
                                        packageContent = mockPackageLabel,
                                        packageWeight = 1.0,
                                        packageSize = "small"
                                    ),
                                    service = ServiceData(
                                        deliveryType = "standard",
                                        urgency = "standard"
                                    )
                                )
                            )
                            isLoading = false
                            if (orderNumber != null) {
                                navController.navigate("order_success/$orderNumber") {
                                    popUpTo(CustomerScreen.Home.route) { inclusive = false }
                                }
                            } else {
                                errorMessage = "לא ניתן לשלוח הזמנה. אנא נסה שנית."
                            }
                        }
                    },
                    modifier = Modifier.fillMaxWidth().height(56.dp).navigationBarsPadding()
                )
            }
        }
    }
}

@Composable
fun SummaryItem(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    value: String,
    iconColor: Color = AmberGold
) {
    Row(verticalAlignment = Alignment.Top) {
        Icon(icon, null, tint = iconColor, modifier = Modifier.size(20.dp))
        Spacer(Modifier.width(16.dp))
        Column {
            Text(label, color = Graphite400, fontSize = 12.sp)
            Text(value, color = Color.White, fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
        }
    }
}
