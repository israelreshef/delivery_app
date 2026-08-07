package com.tzir.delivery.courier

import com.tzir.delivery.courier.database.PendingActionEntity
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class PendingActionEntityTest {

    @Test
    fun `create pending action with defaults`() {
        val action = PendingActionEntity(
            actionType = "UPDATE_STATUS",
            endpoint = "/api/courier/orders/5/status",
            payloadJson = """{"status": "delivered"}""",
            httpMethod = "PUT"
        )
        assertEquals("UPDATE_STATUS", action.actionType)
        assertEquals(0, action.retryCount)
        assertEquals(3, action.maxRetries)
        assertEquals("pending", action.status)
        assertTrue(action.createdAt > 0)
    }

    @Test
    fun `pending action tracks retries`() {
        val action = PendingActionEntity(
            actionType = "CREATE_CONTACT",
            endpoint = "/api/courier/my-clients",
            payloadJson = """{"name": "test"}""",
            httpMethod = "POST",
            retryCount = 2,
            maxRetries = 5
        )
        assertEquals(2, action.retryCount)
        assertEquals(5, action.maxRetries)
    }
}
