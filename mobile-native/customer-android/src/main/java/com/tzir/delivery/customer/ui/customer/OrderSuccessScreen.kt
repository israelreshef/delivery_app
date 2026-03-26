package com.tzir.delivery.customer.ui.customer

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import com.tzir.delivery.customer.ui.components.PremiumBackground
import com.tzir.delivery.customer.ui.components.TzirButton
import com.tzir.delivery.customer.ui.theme.AmberGold
import com.tzir.delivery.customer.ui.theme.Graphite400

@Composable
fun OrderSuccessScreen(orderNumber: String, navController: NavController) {
    PremiumBackground {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Icon(
                imageVector = Icons.Default.CheckCircle,
                contentDescription = null,
                tint = AmberGold,
                modifier = Modifier.size(80.dp)
            )
            Spacer(modifier = Modifier.height(24.dp))
            Text(
                text = "ההזמנה נשלחה בהצלחה!",
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
                color = Color.White
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "מספר הזמנה: $orderNumber",
                style = MaterialTheme.typography.bodyLarge,
                color = AmberGold,
                fontWeight = FontWeight.SemiBold
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "ההזמנה ממתינה לשיוך שליח",
                style = MaterialTheme.typography.bodyMedium,
                color = Graphite400
            )
            Spacer(modifier = Modifier.height(32.dp))
            TzirButton(
                text = "חזרה לדף הבית",
                onClick = {
                    navController.navigate(CustomerScreen.Home.route) {
                        popUpTo(0) { inclusive = true }
                    }
                },
                modifier = Modifier.fillMaxWidth()
            )
        }
    }
}
