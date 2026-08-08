package com.tzir.delivery.courier.network

import com.tzir.delivery.courier.BuildConfig
import com.tzir.delivery.courier.model.RefreshTokenResponse
import com.tzir.delivery.courier.services.SocketManager
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.engine.okhttp.OkHttp
import io.ktor.client.plugins.auth.Auth
import io.ktor.client.plugins.auth.providers.bearer
import io.ktor.client.plugins.auth.providers.BearerTokens
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.plugins.logging.LogLevel
import io.ktor.client.plugins.logging.Logger
import io.ktor.client.plugins.logging.Logging
import io.ktor.client.plugins.defaultRequest
import io.ktor.client.plugins.HttpTimeout
import io.ktor.client.request.bearerAuth
import io.ktor.http.contentType
import io.ktor.client.request.header
import io.ktor.client.request.post
import io.ktor.http.ContentType
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.json.Json
import android.os.Build

object KtorClientFactory {

    private var clientRef: HttpClient? = null

    private var hostOverride: String? = null

    /**
     * Override the backend base URL at runtime (e.g. from a debug/settings screen).
     * Takes precedence over the BuildConfig value until the process restarts.
     * May be a bare host ("10.0.2.2"), host:port, or full URL ("https://api.x:5000").
     */
    fun setBackendHost(host: String) {
        hostOverride = host.trim().removeSuffix("/")
    }

    /**
     * Resolve the backend base URL.
     * On the Android emulator the host machine is reachable via 10.0.2.2,
     * NOT localhost or the host LAN IP. On a physical device we use the
     * host machine's LAN IP.
     * Scheme/port come from build config (BACKEND_SCHEME/BACKEND_PORT) so the
     * cert/server swap is a build-time config change, never a code change.
     */
    fun resolveBaseUrl(): String {
        val scheme = BuildConfig.BACKEND_SCHEME.takeIf { it.isNotBlank() } ?: "https"
        val port = BuildConfig.BACKEND_PORT.takeIf { it.isNotBlank() } ?: "5000"
        val raw = if (isProbablyEmulator()) {
            "10.0.2.2"
        } else {
            BuildConfig.BACKEND_HOST.takeIf { it.isNotBlank() } ?: "192.168.33.13"
        }
        val effective = hostOverride?.takeIf { it.isNotBlank() } ?: raw
        return if (effective.startsWith("http://") || effective.startsWith("https://")) {
            effective
        } else {
            "$scheme://$effective:$port"
        }
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

    fun createClient(onUnauthorized: () -> Unit = {}): HttpClient {
        return HttpClient(OkHttp) {
            install(ContentNegotiation) {
                json(Json {
                    prettyPrint = false
                    isLenient = true
                    ignoreUnknownKeys = true
                })
            }
            install(HttpTimeout) {
                connectTimeoutMillis = 15_000
                socketTimeoutMillis = 30_000
                requestTimeoutMillis = 30_000
            }
            install(Logging) {
                logger = object : Logger {
                    override fun log(message: String) {
                        android.util.Log.d("HTTP", message)
                    }
                }
                level = LogLevel.HEADERS
            }
            install(Auth) {
                bearer {
                    loadTokens {
                        val access = TokenManager.token
                        val refresh = TokenManager.getRefreshToken()
                        if (access != null) BearerTokens(access, refresh ?: "") else null
                    }
                    refreshTokens {
                        val cl = clientRef ?: return@refreshTokens null
                        val oldRefresh = TokenManager.getRefreshToken()
                        if (oldRefresh == null) {
                            TokenManager.clearTokens()
                            onUnauthorized()
                            return@refreshTokens null
                        }
                        try {
                            val response: RefreshTokenResponse = cl.post("${resolveBaseUrl()}/api/auth/refresh") {
                                bearerAuth(oldRefresh)
                                contentType(ContentType.Application.Json)
                            }.body()
                            TokenManager.token = response.accessToken
                            TokenManager.saveRefreshToken(response.refreshToken)
                            SocketManager.notifyTokenRefreshed()
                            BearerTokens(response.accessToken, response.refreshToken)
                        } catch (e: Exception) {
                            android.util.Log.e("KtorClient", "Token refresh failed", e)
                            TokenManager.clearTokens()
                            onUnauthorized()
                            null
                        }
                    }
                    sendWithoutRequest { request ->
                        val path = request.url.build().encodedPath
                        path !in setOf("/api/auth/login", "/api/auth/register", "/api/auth/refresh")
                    }
                }
            }
            defaultRequest {
                header("Accept", "application/json")
            }
            // 401/403 handling is delegated to the Bearer auth plugin's refreshTokens block above.
            // HttpResponseValidator is intentionally omitted to prevent a double-clearTokens race.
        }.also { clientRef = it }
    }
}
