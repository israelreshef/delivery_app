package com.tzir.delivery.courier.network

import io.mockk.clearMocks
import io.mockk.every
import io.mockk.just
import io.mockk.mockkObject
import io.mockk.runs
import io.mockk.unmockkAll
import io.mockk.verify
import org.junit.After
import org.junit.Assert.assertNotNull
import org.junit.Before
import org.junit.Test

class KtorClientFactoryTest {

    @Before
    fun setUp() {
        mockkObject(TokenManager)
        every { TokenManager.token } returns "test_access_token"
        every { TokenManager.getRefreshToken() } returns "test_refresh_token"
        every { TokenManager.token = any() } just runs
        every { TokenManager.saveRefreshToken(any()) } just runs
        every { TokenManager.clearTokens() } just runs
        KtorClientFactory.setBackendHost("")
    }

    @After
    fun tearDown() {
        unmockkAll()
    }

    @Test
    fun `createClient returns non-null client`() {
        val client = KtorClientFactory.createClient()
        assertNotNull(client)
        client.close()
    }

    @Test
    fun `createClient with onUnauthorized callback does not crash`() {
        var unauthorizedCalled = false
        val client = KtorClientFactory.createClient(
            onUnauthorized = { unauthorizedCalled = true }
        )
        assertNotNull(client)
        client.close()
    }

    @Test
    fun `resolveBaseUrl returns an https URL on port 5000 by default`() {
        val url = KtorClientFactory.resolveBaseUrl()
        assertNotNull(url)
        assert(url.startsWith("https://"))
        assert(url.endsWith(":5000"))
    }

    @Test
    fun `resolveBaseUrl honors a full URL host override`() {
        KtorClientFactory.setBackendHost("https://api.example.com:8443")
        val url = KtorClientFactory.resolveBaseUrl()
        assertNotNull(url)
        assert(url == "https://api.example.com:8443")
    }

    @Test
    fun `resolveBaseUrl wraps a bare host override with configured scheme and port`() {
        KtorClientFactory.setBackendHost("10.0.2.2")
        val url = KtorClientFactory.resolveBaseUrl()
        assertNotNull(url)
        assert(url == "https://10.0.2.2:5000")
        KtorClientFactory.setBackendHost("")
    }
}
