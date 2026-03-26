package com.tzir.delivery.courier.network

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

object KtorClientFactory {
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
                        android.util.Log.e("HTTP Client", message)
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
                    if (response.status == HttpStatusCode.Unauthorized || response.status == HttpStatusCode.Forbidden) {
                        TokenManager.clearTokens()
                        com.tzir.delivery.courier.repository.AuthRepository.instance?.logout()
                    }
                }
            }
        }
    }
}
