package com.tzir.delivery.customer.ui.customer

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavHostController
import com.tzir.delivery.customer.model.Order
import com.tzir.delivery.customer.model.OrderStatus
import com.tzir.delivery.customer.model.User
import com.tzir.delivery.customer.repository.CustomerRepository
import com.tzir.delivery.customer.ui.theme.*
import com.tzir.delivery.customer.ui.components.*
import androidx.compose.ui.res.stringResource
import com.tzir.delivery.customer.R
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
fun CustomerHomeScreen(
    navController: NavHostController,
    currentUser: User,
    repository: CustomerRepository
) {
    val activeOrders by repository.activeOrders.collectAsState()
    var isLoading by remember { mutableStateOf(true) }

    LaunchedEffect(Unit) {
        isLoading = true
        repository.refreshActiveOrders()
        isLoading = false
    }

    PremiumBackground {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp)
        ) {
            // ─── Connectivity Banner ─────────────────────────────────────
            ConnectivityBanner(modifier = Modifier.fillMaxWidth())

            Spacer(modifier = Modifier.height(8.dp))

            // Personalized Greeting
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = stringResource(R.string.hello_user, currentUser.fullName ?: currentUser.username),
                        color = Color.White,
                        fontSize = 24.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Text(stringResource(R.string.where_to_today), color = Graphite400, fontSize = 14.sp)
                }
                IconButton(onClick = { navController.navigate(CustomerScreen.Profile.route) }) {
                    Icon(Icons.Default.AccountCircle, contentDescription = null, tint = AmberGold, modifier = Modifier.size(32.dp))
                }
            }
            
            Spacer(modifier = Modifier.height(24.dp))
            
            // Quick Actions
            Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                TzirButton(
                    text = stringResource(R.string.new_delivery),
                    onClick = { navController.navigate(CustomerScreen.NewOrder.route) },
                    modifier = Modifier.weight(1f).height(56.dp),
                    icon = Icons.Default.Add
                )
            }
            
            Spacer(modifier = Modifier.height(32.dp))
            
            Text(
                text = stringResource(R.string.active_deliveries),
                color = Color.White,
                fontSize = 18.sp,
                fontWeight = FontWeight.SemiBold
            )
            
            Spacer(modifier = Modifier.height(16.dp))
            
            if (activeOrders.isEmpty()) {
                GlassCard(modifier = Modifier.fillMaxWidth()) {
                    Box(modifier = Modifier.padding(32.dp), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(Icons.Default.History, contentDescription = null, tint = Graphite600, modifier = Modifier.size(48.dp))
                            Spacer(Modifier.height(8.dp))
                            Text(stringResource(R.string.no_active_deliveries), color = Graphite400)
                        }
                    }
                }
            } else {
                LazyColumn(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    items(activeOrders) { order ->
                        ActiveOrderCard(
                            order = order,
                            repository = repository,
                            onClick = { navController.navigate("tracking/${order.id}") }
                        )
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ActiveOrderCard(
    order: Order,
    repository: CustomerRepository,
    onClick: () -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var isDownloadingInvoice by remember { mutableStateOf(false) }

    GlassCard(
        modifier = Modifier.fillMaxWidth(),
        onClick = onClick
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                Text(order.type.toHebrew(), fontWeight = FontWeight.Bold, color = Color.White)
                Text(order.status.toHebrew(), color = AmberGold, fontWeight = FontWeight.Bold, fontSize = 12.sp)
            }
            Spacer(Modifier.height(8.dp))
            Text("${stringResource(R.string.from_prefix)} ${order.pickupLocation.addressString}", fontSize = 12.sp, color = Graphite400)
            Text("${stringResource(R.string.to_prefix)} ${order.dropoffLocation.addressString}", fontSize = 12.sp, color = Graphite400)
            Spacer(Modifier.height(12.dp))
            LinearProgressIndicator(
                progress = { 0.5f },
                modifier = Modifier.fillMaxWidth().height(4.dp),
                color = AmberGold,
                trackColor = Color.White.copy(alpha = 0.1f)
            )

            // ─── Invoice button: shown only for delivered orders ───
            if (order.status == OrderStatus.DELIVERED) {
                Spacer(Modifier.height(12.dp))
                HorizontalDivider(color = Color.White.copy(alpha = 0.1f))
                Spacer(Modifier.height(12.dp))
                Button(
                    onClick = {
                        scope.launch {
                            isDownloadingInvoice = true
                            try {
                                val pdfUrl = withContext(Dispatchers.IO) {
                                    repository.getInvoiceDownloadUrl(order.id)
                                }
                                if (pdfUrl != null) {
                                    val intent = Intent(Intent.ACTION_VIEW).apply {
                                        setDataAndType(Uri.parse(pdfUrl), "application/pdf")
                                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                                        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                                    }
                                    context.startActivity(intent)
                                } else {
                                    showToast(context, "שגיאה: לא נמצאה חשבונית עבור הזמנה זו")
                                }
                            } catch (e: Exception) {
                                showToast(context, "שגיאה בהורדת החשבונית: ${e.localizedMessage ?: "נסה שוב"}")
                            } finally {
                                isDownloadingInvoice = false
                            }
                        }
                    },
                    enabled = !isDownloadingInvoice,
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = AmberGold.copy(alpha = 0.15f),
                        contentColor = AmberGold
                    )
                ) {
                    if (isDownloadingInvoice) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(16.dp),
                            color = AmberGold,
                            strokeWidth = 2.dp
                        )
                        Spacer(Modifier.width(8.dp))
                        Text("טוען חשבונית...")
                    } else {
                        Icon(Icons.Default.Receipt, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(8.dp))
                        Text("הצג חשבונית PDF", fontWeight = FontWeight.SemiBold)
                    }
                }
            }
        }
    }
}

private fun showToast(context: Context, message: String) {
    Toast.makeText(context, message, Toast.LENGTH_LONG).show()
}
