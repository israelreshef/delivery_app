package com.tzir.delivery.customer.ui.customer

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavHostController
import com.tzir.delivery.customer.model.Order
import com.tzir.delivery.customer.repository.CustomerRepository
import androidx.compose.ui.res.stringResource
import com.tzir.delivery.customer.R
import com.tzir.delivery.customer.ui.theme.*
import com.tzir.delivery.customer.ui.components.*

@Composable
fun OrderHistoryScreen(
    navController: NavHostController,
    repository: CustomerRepository
) {
    val orderHistory by repository.orderHistory.collectAsState()
    var isLoading by remember { mutableStateOf(true) }

    LaunchedEffect(Unit) {
        isLoading = true
        repository.refreshOrderHistory()
        isLoading = false
    }

    PremiumBackground {
        Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
            Text(
                stringResource(R.string.order_history),
                fontSize = 28.sp,
                fontWeight = FontWeight.Black,
                color = AmberGold
            )
            Spacer(modifier = Modifier.height(24.dp))

            if (isLoading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = AmberGold)
                }
            } else if (orderHistory.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text(stringResource(R.string.no_orders_yet), color = Graphite400)
                }
            } else {
                LazyColumn(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    items(orderHistory) { order ->
                        OrderCard(order = order) {
                            navController.navigate("tracking/${order.id}")
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OrderCard(order: Order, onClick: () -> Unit) {
    GlassCard(
        modifier = Modifier.fillMaxWidth(),
        onClick = onClick
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column {
                Text(order.type.name.replace("_", " "), fontWeight = FontWeight.Bold, color = Color.White)
                Text(order.id.take(8).uppercase(), fontSize = 12.sp, color = Graphite400)
                Text(order.status.name, fontSize = 12.sp, color = AmberGold)
            }
            Text("₪ ${order.price}", fontWeight = FontWeight.Black, color = AmberGold, fontSize = 18.sp)
        }
    }
}
