package com.tzir.delivery.customer

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Modifier
import androidx.navigation.compose.rememberNavController
import com.tzir.delivery.customer.ui.theme.MyApplicationTheme
import com.tzir.delivery.customer.ui.auth.SplashScreen
import com.tzir.delivery.customer.ui.auth.LoginScreen
import com.tzir.delivery.customer.ui.auth.RegisterScreen
import com.tzir.delivery.customer.ui.customer.CustomerNavGraph
import com.tzir.delivery.customer.network.DeliveryApiImpl
import com.tzir.delivery.customer.network.KtorClientFactory
import com.tzir.delivery.customer.network.TokenManager
import com.tzir.delivery.customer.security.IncompatibleDeviceScreen
import com.tzir.delivery.customer.security.SecurityEnforcer
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.unit.LayoutDirection
import com.tzir.delivery.customer.repository.AuthRepository
import com.tzir.delivery.customer.repository.CustomerRepository

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Initialize Secure Token Storage
        TokenManager.init(applicationContext)

        // Manual DI for Native App
        val client = KtorClientFactory.createClient()
        val api = DeliveryApiImpl(client)
        val authRepository = AuthRepository.getInstance(api)
        val customerRepository = CustomerRepository.getInstance(api)

        setContent {
            val deviceCompatible = remember { SecurityEnforcer.isDeviceCompatible() }
            if (!deviceCompatible) {
                IncompatibleDeviceScreen()
                return@setContent
            }
            MyApplicationTheme {
                CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Rtl) {
                    Surface(
                        modifier = Modifier.fillMaxSize(),
                        color = MaterialTheme.colorScheme.background
                    ) {
                        val currentUser by authRepository.currentUser.collectAsState()
                        var isRegistering by remember { mutableStateOf(false) }
                        var showSplash by remember { mutableStateOf(true) }
                        val navController = rememberNavController()

                        // Restore a persisted session (token) into memory before deciding
                        // the start screen, so the user isn't bounced to login on restart.
                        LaunchedEffect(showSplash) {
                            if (!showSplash) {
                                authRepository.restoreSessionIfNeeded(api)
                            }
                        }

                        if (showSplash) {
                            SplashScreen(onAnimationFinish = { showSplash = false })
                        } else if (currentUser != null) {
                            CustomerNavGraph(
                                navController = navController,
                                currentUser = currentUser!!,
                                authRepository = authRepository,
                                customerRepository = customerRepository
                            )
                        } else if (isRegistering) {
                            RegisterScreen(
                                repository = authRepository,
                                onRegisterSuccess = { },
                                onBackToLogin = { isRegistering = false }
                            )
                        } else {
                            LoginScreen(
                                repository = authRepository,
                                onLoginSuccess = { },
                                onNavigateToRegister = { isRegistering = true }
                            )
                        }
                    }
                }
            }
        }
    }
}
