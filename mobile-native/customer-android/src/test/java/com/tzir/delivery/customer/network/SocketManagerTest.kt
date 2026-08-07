package com.tzir.delivery.customer.network

import io.mockk.every
import io.mockk.mockk
import io.mockk.mockkObject
import io.mockk.mockkStatic
import io.mockk.slot
import io.mockk.unmockkAll
import io.mockk.verify
import io.socket.client.IO
import io.socket.client.Socket
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Test

class SocketManagerTest {

    private lateinit var mockSocket: Socket

    @Before
    fun setUp() {
        mockkObject(TokenManager)
        every { TokenManager.token } returns "test_access_token"
        mockSocket = mockk(relaxed = true)
        mockkStatic(IO::class)
        every { IO.socket(any<String>(), any<IO.Options>()) } returns mockSocket
        every { mockSocket.connect() } returns mockSocket
        every { mockSocket.connected() } returns false
    }

    @After
    fun tearDown() {
        SocketManager.disconnect()
        unmockkAll()
    }

    @Test
    fun `connect sends token via auth handshake only, never via query string`() {
        val optionsSlot = slot<IO.Options>()
        every { IO.socket(any<String>(), capture(optionsSlot)) } returns mockSocket

        SocketManager.connect("42")

        val captured = optionsSlot.captured
        assertEquals(mapOf("token" to "test_access_token"), captured.auth)
        assertNull("Token must never travel in the URL query string", captured.query)
        verify { mockSocket.connect() }
    }

    @Test
    fun `connect without token does not crash and has no auth`() {
        every { TokenManager.token } returns null
        val optionsSlot = slot<IO.Options>()
        every { IO.socket(any<String>(), capture(optionsSlot)) } returns mockSocket

        SocketManager.connect("42")

        val captured = optionsSlot.captured
        assertEquals(null, captured.auth)
        assertNull(captured.query)
    }

    @Test
    fun `trackDelivery emits join_delivery_room`() {
        SocketManager.connect("42")
        SocketManager.trackDelivery("123")

        verify { mockSocket.emit("join_delivery_room", any()) }
    }

    @Test
    fun `joinSupportRoom joins both support channels`() {
        SocketManager.connect("42")
        SocketManager.joinSupportRoom(7, "42")

        verify { mockSocket.emit("join_support", any()) }
        verify { mockSocket.emit("join_ticket_room", any()) }
    }

    @Test
    fun `sendChatMessage without a socket does not crash`() {
        SocketManager.sendChatMessage("1", "hello")
    }

    @Test
    fun `disconnect when never connected does not crash`() {
        SocketManager.disconnect()
    }
}
