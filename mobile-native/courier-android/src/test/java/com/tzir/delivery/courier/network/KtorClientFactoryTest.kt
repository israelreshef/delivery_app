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
    fun `resolveBaseUrl returns an http URL on port 5000`() {
        val url = KtorClientFactory.resolveBaseUrl()
        assertNotNull(url)
        assert(url.startsWith("http://"))
        assert(url.endsWith(":5000"))
    }
}
