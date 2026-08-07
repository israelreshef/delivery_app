package com.tzir.delivery.customer.network

import com.tzir.delivery.customer.BuildConfig
import io.ktor.client.HttpClient
import io.ktor.client.engine.okhttp.OkHttp
import io.ktor.client.plugins.auth.Auth
import io.ktor.client.plugins.auth.providers.bearer
import io.ktor.client.plugins.auth.providers.BearerTokens
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.plugins.logging.LogLevel
import io.ktor.client.plugins.logging.Logger
import io.ktor.client.plugins.logging.Logging
import io.ktor.client.plugins.defaultRequest
import io.ktor.client.plugins.HttpResponseValidator
import io.ktor.client.plugins.ClientRequestException
import io.ktor.client.request.header
import io.ktor.http.HttpStatusCode
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.json.Json
import android.os.Build

object KtorClientFactory {
    private var hostOverride: String? = null

    /**
     * Override the backend host at runtime (e.g. from a debug/settings screen).
     * Takes precedence over the BuildConfig value until the process restarts.
     */
    fun setBackendHost(host: String) {
        hostOverride = host.trim().removeSuffix("/")
    }

    /**
     * Resolve the backend base URL.
     * On the Android emulator the host machine is reachable via 10.0.2.2,
     * NOT localhost or the host LAN IP. On a physical device we use the
     * host machine's LAN IP.
     * The backend serves plain HTTP on port 5000 (no TLS).
     */
    fun resolveBaseUrl(): String {
        val host = if (!hostOverride.isNullOrBlank()) {
            hostOverride
        } else if (isProbablyEmulator()) {
            "10.0.2.2"
        } else {
            BuildConfig.BACKEND_HOST.takeIf { it.isNotBlank() } ?: "192.168.33.13"
        }
        return "http://$host:5000"
    }

    private fun isProbablyEmulator(): Boolean {
        val fingerprint = Build.FINGERPRINT.orEmpty()
        val model = Build.MODEL.orEmpty()
        val hardware = Build.HARDWARE.orEmpty()
        val product = Build.PRODUCT.orEmpty()
        return fingerprint.contains("generic", ignoreCase = true) ||
            fingerprint.contains("emulator", ignoreCase = true) ||
            fingerprint.contains("sdk_gphone", ignoreCase = true) ||
            model.contains("emulator", ignoreCase = true) ||
            model.contains("Android SDK built for", ignoreCase = true) ||
            hardware.contains("ranchu", ignoreCase = true) ||
            hardware.contains("goldfish", ignoreCase = true) ||
            product.contains("sdk_gphone", ignoreCase = true) ||
            product.contains("emulator", ignoreCase = true)
    }

    fun createClient(): HttpClient {
        return HttpClient(OkHttp) {
            install(ContentNegotiation) {
                json(Json {
                    prettyPrint = true
                    isLenient = true
                    ignoreUnknownKeys = true
                })
            }
            install(Logging) {
                this.logger = object : Logger {
                    override fun log(message: String) {
                        println("HTTP Client: $message")
                    }
                }
                this.level = LogLevel.ALL
            }
            install(Auth) {
                bearer {
                    loadTokens {
                        TokenManager.token?.let { BearerTokens(it, TokenManager.getRefreshToken() ?: "") }
                    }
                    sendWithoutRequest { request: io.ktor.client.request.HttpRequestBuilder ->
                        val path = request.url.build().encodedPath
                        !path.contains("/auth/login") && !path.contains("/auth/register")
                    }
                }
            }
            defaultRequest {
                // Any specific default headers can go here
            }
            HttpResponseValidator {
                validateResponse { response ->
                    // NOTE: Do NOT force a session logout here. A single 401/403 during
                    // in-app navigation (e.g. a failed profile/orders fetch) was bouncing the
                    // user back to the login screen. Callers handle auth errors gracefully.
                    // Genuine token expiry is handled by the auth flow / re-login.
                }
            }
        }
    }
}
