package com.tzir.delivery.customer.ui.customer

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
import com.tzir.delivery.customer.repository.AuthRepository
import androidx.compose.ui.res.stringResource
import com.tzir.delivery.customer.R
import com.tzir.delivery.customer.ui.theme.*
import com.tzir.delivery.customer.ui.components.*

@Composable
fun CustomerProfileScreen(
    navController: NavHostController,
    authRepository: AuthRepository
) {
    val user by authRepository.currentUser.collectAsState()

    PremiumBackground {
        Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
            Text(
                stringResource(R.string.my_profile),
                fontSize = 28.sp,
                fontWeight = FontWeight.Black,
                color = AmberGold
            )
            
            Spacer(modifier = Modifier.height(32.dp))

            // User Info Card
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Surface(
                            modifier = Modifier.size(64.dp),
                            shape = androidx.compose.foundation.shape.CircleShape,
                            color = AmberGold.copy(alpha = 0.2f)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(Icons.Default.Person, contentDescription = null, tint = AmberGold, modifier = Modifier.size(32.dp))
                            }
                        }
                        Spacer(modifier = Modifier.width(16.dp))
                        Column {
                            Text(user?.fullName ?: user?.username ?: stringResource(R.string.user_label), fontWeight = FontWeight.Bold, fontSize = 20.sp, color = Color.White)
                            Text(user?.email ?: "", fontSize = 14.sp, color = Graphite400)
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(32.dp))

            // Menu Items
            ProfileMenuItem(icon = Icons.Default.Wallet, label = stringResource(R.string.payment_methods)) {
                navController.navigate(CustomerScreen.PaymentMethods.route)
            }
            ProfileMenuItem(icon = Icons.Default.LocationOn, label = stringResource(R.string.saved_addresses)) {
                // Navigate to addresses
            }
            ProfileMenuItem(icon = Icons.Default.Notifications, label = stringResource(R.string.notifications)) {
                // Navigate to notifications
            }
            ProfileMenuItem(icon = Icons.Default.Help, label = stringResource(R.string.support_and_help)) {
                // Navigate to support
            }
            
            Spacer(modifier = Modifier.weight(1f))

            TzirButton(
                text = stringResource(R.string.logout),
                onClick = { authRepository.logout() },
                modifier = Modifier.fillMaxWidth().height(56.dp)
            )
        }
    }
}

@Composable
fun ProfileMenuItem(icon: androidx.compose.ui.graphics.vector.ImageVector, label: String, onClick: () -> Unit) {
    TextButton(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
        contentPadding = PaddingValues(16.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
            Icon(icon, contentDescription = null, tint = AmberGold)
            Spacer(modifier = Modifier.width(16.dp))
            Text(label, color = Color.White, fontSize = 16.sp)
            Spacer(modifier = Modifier.weight(1f))
            Icon(Icons.Default.ChevronRight, contentDescription = null, tint = Graphite400)
        }
    }
}
