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

data class DeliveryProtocol(
    val slug: String,
    val title: String,
    val description: String,
    val icon: androidx.compose.ui.graphics.vector.ImageVector,
    val pricePrefix: String
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProtocolSelectionScreen(navController: NavHostController) {
    val protocols = listOf(
        DeliveryProtocol("standard", stringResource(R.string.standard_package), stringResource(R.string.standard_package_desc), Icons.Default.Inventory, "₪ 25"),
        DeliveryProtocol("legal_document", stringResource(R.string.legal_document), stringResource(R.string.legal_document_desc), Icons.Default.Description, "₪ 45"),
        DeliveryProtocol("food_fragile", stringResource(R.string.food_and_fragile), stringResource(R.string.food_and_fragile_desc), Icons.Default.Restaurant, "₪ 35"),
        DeliveryProtocol("large_package", stringResource(R.string.large_package), stringResource(R.string.large_package_desc), Icons.Default.LocalShipping, "₪ 85")
    )

    PremiumBackground {
        Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = { navController.popBackStack() }) {
                    Icon(Icons.Default.ArrowBack, contentDescription = null, tint = AmberGold)
                }
                Text(stringResource(R.string.select_delivery_type), fontSize = 20.sp, fontWeight = FontWeight.Bold, color = Color.White)
            }
            
            Spacer(modifier = Modifier.height(24.dp))

            LazyColumn(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                items(protocols) { protocol ->
                    ProtocolCard(protocol = protocol) {
                        navController.navigate("address_selection?protocol=${protocol.slug}") 
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProtocolCard(protocol: DeliveryProtocol, onClick: () -> Unit) {
    GlassCard(
        modifier = Modifier.fillMaxWidth(),
        onClick = onClick
    ) {
        Row(modifier = Modifier.padding(20.dp), verticalAlignment = Alignment.CenterVertically) {
            Surface(shape = androidx.compose.foundation.shape.CircleShape, color = AmberGold.copy(alpha = 0.1f)) {
                Icon(protocol.icon, contentDescription = null, tint = AmberGold, modifier = Modifier.padding(12.dp))
            }
            Spacer(Modifier.width(16.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(protocol.title, fontWeight = FontWeight.Bold, color = Color.White, fontSize = 16.sp)
                Text(protocol.description, color = Graphite400, fontSize = 12.sp)
            }
            Text("${stringResource(R.string.price_from)} ${protocol.pricePrefix}", color = AmberGold, fontWeight = FontWeight.Black, fontSize = 14.sp)
        }
    }
}
