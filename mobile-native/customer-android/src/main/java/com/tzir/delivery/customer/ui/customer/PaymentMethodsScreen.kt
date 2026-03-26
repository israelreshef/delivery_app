package com.tzir.delivery.customer.ui.customer

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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavHostController
import androidx.compose.ui.res.stringResource
import com.tzir.delivery.customer.R
import com.tzir.delivery.customer.ui.theme.*
import com.tzir.delivery.customer.ui.components.*

data class CreditCard(
    val id: String,
    val last4: String,
    val brand: String,
    val expiry: String
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PaymentMethodsScreen(navController: NavHostController) {
    val visaLabel = stringResource(R.string.payment_visa)
    val mastercardLabel = stringResource(R.string.payment_mastercard)
    
    // Mock data for now
    var cards by remember(visaLabel, mastercardLabel) { mutableStateOf(listOf(
        CreditCard("1", "4242", visaLabel, "12/26"),
        CreditCard("2", "8888", mastercardLabel, "05/25")
    )) }

    PremiumBackground {
        Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = { navController.popBackStack() }) {
                    Icon(Icons.Default.ArrowBack, contentDescription = null, tint = AmberGold)
                }
                Text(stringResource(R.string.payment_methods), fontSize = 24.sp, fontWeight = FontWeight.Bold, color = Color.White)
            }

            Spacer(modifier = Modifier.height(24.dp))

            Text(stringResource(R.string.your_saved_cards), color = Graphite400, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
            Spacer(modifier = Modifier.height(16.dp))

            LazyColumn(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                items(cards) { card ->
                    PaymentCardItem(card = card, onDelete = { 
                        cards = cards.filter { it.id != card.id }
                    })
                }
                
                item {
                    TzirButton(
                        text = stringResource(R.string.add_new_card),
                        onClick = { /* TODO: Open Add Card UI */ },
                        modifier = Modifier.fillMaxWidth().height(56.dp),
                        icon = Icons.Default.Add
                    )
                }
            }

            Spacer(modifier = Modifier.height(32.dp))

            Text(stringResource(R.string.recent_transactions), color = Graphite400, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
            Spacer(modifier = Modifier.height(16.dp))
            
            // Mock Transactions
            LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.weight(1f)) {
                items(5) { i ->
                    TransactionItem(index = i)
                }
            }
        }
    }
}

@Composable
fun PaymentCardItem(card: CreditCard, onDelete: () -> Unit) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.padding(20.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.CreditCard, contentDescription = null, tint = AmberGold)
                Spacer(Modifier.width(16.dp))
                Column {
                    Text("${card.brand} **** ${card.last4}", color = Color.White, fontWeight = FontWeight.Bold)
                    Text(stringResource(R.string.expires_label, card.expiry), color = Graphite400, fontSize = 12.sp)
                }
            }
            IconButton(onClick = onDelete) {
                Icon(Icons.Default.Delete, contentDescription = null, tint = Color.Red.copy(alpha = 0.7f))
            }
        }
    }
}

@Composable
fun TransactionItem(index: Int) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column {
            Text(stringResource(R.string.delivery_service_prefix, index), color = Color.White, fontWeight = FontWeight.Medium)
            Text(stringResource(R.string.mock_date), color = Graphite400, fontSize = 12.sp)
        }
        Text("- ₪${(25..150).random()}", color = Color.White, fontWeight = FontWeight.Black)
    }
}
