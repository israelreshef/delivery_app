package com.tzir.delivery.customer.ui.customer

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import com.tzir.delivery.customer.model.User
import com.tzir.delivery.customer.repository.AuthRepository
import com.tzir.delivery.customer.repository.CustomerRepository

import com.tzir.delivery.customer.R

sealed class CustomerScreen(val route: String, val labelRes: Int, val icon: ImageVector) {
    object Home : CustomerScreen("home", R.string.nav_home, Icons.Default.Home)
    object NewOrder : CustomerScreen("new_order", R.string.nav_new_order, Icons.Default.LocalShipping)
    object History : CustomerScreen("history", R.string.nav_history, Icons.Default.History)
    object Profile : CustomerScreen("profile", R.string.nav_profile, Icons.Default.Person)
    object Tracking : CustomerScreen("tracking/{orderId}", R.string.nav_tracking, Icons.Default.LocalShipping)
    object PaymentMethods : CustomerScreen("payment_methods", R.string.nav_payments, Icons.Default.AccountBalanceWallet)
    object AddressSelection : CustomerScreen("address_selection", R.string.nav_address, Icons.Default.Place)
    object OrderSummary : CustomerScreen("order_summary/{pickup}/{delivery}/{pLat}/{pLng}/{dLat}/{dLng}", R.string.nav_summary, Icons.Default.Description)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CustomerNavGraph(
    navController: NavHostController,
    currentUser: User,
    authRepository: AuthRepository,
    customerRepository: CustomerRepository
) {
    Scaffold(
        bottomBar = {
            NavigationBar(
                containerColor = MaterialTheme.colorScheme.surface,
                contentColor = MaterialTheme.colorScheme.primary
            ) {
                val navBackStackEntry by navController.currentBackStackEntryAsState()
                val currentRoute = navBackStackEntry?.destination?.route

                val items = listOf(
                    CustomerScreen.Home,
                    CustomerScreen.NewOrder,
                    CustomerScreen.History,
                    CustomerScreen.Profile
                )

                items.forEach { screen ->
                    NavigationBarItem(
                        icon = { Icon(screen.icon, contentDescription = androidx.compose.ui.res.stringResource(screen.labelRes)) },
                        label = { Text(androidx.compose.ui.res.stringResource(screen.labelRes)) },
                        selected = currentRoute == screen.route,
                        onClick = {
                            if (currentRoute != screen.route) {
                                navController.navigate(screen.route) {
                                    popUpTo(navController.graph.startDestinationId)
                                    launchSingleTop = true
                                }
                            }
                        }
                    )
                }
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = CustomerScreen.Home.route,
            modifier = Modifier.padding(innerPadding)
        ) {
            composable(CustomerScreen.Home.route) {
                CustomerHomeScreen(
                    navController = navController, 
                    currentUser = currentUser,
                    repository = customerRepository
                )
            }
            composable(CustomerScreen.NewOrder.route) {
                ProtocolSelectionScreen(navController = navController)
            }
            composable(CustomerScreen.History.route) {
                OrderHistoryScreen(
                    navController = navController,
                    repository = customerRepository
                )
            }
            composable(CustomerScreen.Profile.route) {
                CustomerProfileScreen(
                    navController = navController,
                    authRepository = authRepository
                )
            }
            composable(CustomerScreen.Tracking.route) { backStackEntry ->
                val orderId = backStackEntry.arguments?.getString("orderId") ?: ""
                TrackingMapScreen(
                    orderId = orderId,
                    navController = navController,
                    repository = customerRepository
                )
            }
            composable(CustomerScreen.PaymentMethods.route) {
                PaymentMethodsScreen(navController = navController)
            }
            composable(CustomerScreen.AddressSelection.route) {
                AddressSelectionScreen(navController = navController)
            }
            composable(CustomerScreen.OrderSummary.route) { backStackEntry ->
                val pickup = backStackEntry.arguments?.getString("pickup") ?: ""
                val delivery = backStackEntry.arguments?.getString("delivery") ?: ""
                val pLat = backStackEntry.arguments?.getString("pLat")?.toDoubleOrNull() ?: 0.0
                val pLng = backStackEntry.arguments?.getString("pLng")?.toDoubleOrNull() ?: 0.0
                val dLat = backStackEntry.arguments?.getString("dLat")?.toDoubleOrNull() ?: 0.0
                val dLng = backStackEntry.arguments?.getString("dLng")?.toDoubleOrNull() ?: 0.0
                
                OrderSummaryScreen(
                    pickup = pickup,
                    delivery = delivery,
                    pLat = pLat,
                    pLng = pLng,
                    dLat = dLat,
                    dLng = dLng,
                    navController = navController,
                    repository = customerRepository
                )
            }
            composable("order_success/{orderNumber}") { backStackEntry ->
                val orderNumber = backStackEntry.arguments?.getString("orderNumber") ?: ""
                OrderSuccessScreen(
                    orderNumber = orderNumber,
                    navController = navController
                )
            }
            composable("order_confirmation/{orderNumber}/{estimatedTime}/{courierName}") { entry ->
                val orderNumber = entry.arguments?.getString("orderNumber") ?: ""
                val estimatedTime = entry.arguments?.getString("estimatedTime") ?: ""
                val courierName = entry.arguments?.getString("courierName") ?: ""
                OrderConfirmationScreen(
                    navController = navController,
                    orderNumber = orderNumber,
                    estimatedTime = estimatedTime,
                    courierName = courierName
                )
            }
        }
    }
}

