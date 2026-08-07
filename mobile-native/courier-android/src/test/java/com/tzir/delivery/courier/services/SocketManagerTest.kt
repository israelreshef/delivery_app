package com.tzir.delivery.courier.services

import com.tzir.delivery.courier.network.TokenManager
import io.mockk.clearMocks
import io.mockk.every
import io.mockk.just
import io.mockk.mockk
import io.mockk.mockkObject
import io.mockk.runs
import io.mockk.unmockkAll
import io.mockk.verify
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class SocketManagerTest {

    @Before
    fun setUp() {
        mockkObject(TokenManager)
        every { TokenManager.token } returns "test_access_token"
        every { TokenManager.getRefreshToken() } returns "test_refresh_token"
        every { TokenManager.token = any() } just runs
    }

    @After
    fun tearDown() {
        unmockkAll()
    }

    @Test
    fun `joined flow defaults to false`() {
        assertFalse(SocketManager.joined.value)
    }

    @Test
    fun `notifyTokenRefreshed does nothing when not pending rejoin`() {
        SocketManager.notifyTokenRefreshed()
        // no exception → success
    }

    @Test
    fun `rejoin no-ops when no courierId set`() {
        every { TokenManager.token } returns "fresh_token"
        SocketManager.rejoin()
        // no exception means no crash even when socket is null
    }

    @Test
    fun `connectionState defaults to false`() {
        assertFalse(SocketManager.connectionState.value)
    }
}
