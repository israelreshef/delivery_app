package com.tzir.delivery.courier.repository

import com.tzir.delivery.courier.network.DeliveryApi
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class PaymentRepositoryTest {

    private val mockApi = mockk<DeliveryApi>()

    @Test
    fun `createWithdrawal propagates failure message when api throws`() = runBlocking {
        coEvery { mockApi.createWithdrawal(any(), any()) } throws RuntimeException("gateway unreachable")

        val repo = PaymentRepository(api = mockApi)
        val error = repo.createWithdrawal(500.0, "bank details")

        assertEquals("gateway unreachable", error)
        coVerify { mockApi.createWithdrawal(500.0, "bank details") }
    }

    @Test
    fun `createWithdrawal returns api not available when api is null`() = runBlocking {
        val repo = PaymentRepository(api = null)
        val error = repo.createWithdrawal(500.0, "bank details")
        assertEquals("API not available", error)
    }

    @Test
    fun `getPaymentMethods loads methods into state`() = runBlocking {
        val methods = listOf(
            com.tzir.delivery.courier.model.PaymentMethod(1, "bit", "Bit שלי", emptyMap(), true, "2026-07-15"),
            com.tzir.delivery.courier.model.PaymentMethod(2, "bank_transfer", "פועלים", emptyMap(), false, "2026-07-16")
        )
        coEvery { mockApi.getPaymentMethods() } returns methods

        val repo = PaymentRepository(api = mockApi)
        repo.fetchPaymentMethods()

        assertTrue(awaitState { repo.paymentMethods.value.isNotEmpty() })
        assertEquals(2, repo.paymentMethods.value.size)
        assertEquals("bit", repo.paymentMethods.value[0].methodType)
    }

    @Test
    fun `fetchPaymentMethods sets error state on failure`() = runBlocking {
        coEvery { mockApi.getPaymentMethods() } throws RuntimeException("boom")

        val repo = PaymentRepository(api = mockApi)
        repo.fetchPaymentMethods()

        assertTrue(awaitState { repo.error.value != null })
    }

    private fun awaitState(cond: () -> Boolean): Boolean {
        var attempts = 0
        while (attempts < 50) {
            if (cond()) return true
            Thread.sleep(20)
            attempts++
        }
        return cond()
    }
}