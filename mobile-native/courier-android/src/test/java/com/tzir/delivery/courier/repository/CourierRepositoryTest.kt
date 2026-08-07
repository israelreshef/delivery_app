package com.tzir.delivery.courier.repository

import com.tzir.delivery.courier.model.Mission
import com.tzir.delivery.courier.network.DeliveryApi
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class CourierRepositoryTest {

    private val mockApi = mockk<DeliveryApi>()
    private val repository = CourierRepository(api = mockApi)
    private val testDispatcher = StandardTestDispatcher()

    private fun mission(id: Int, status: String = "available") = Mission(
        id = id,
        orderNumber = "TZ-$id",
        status = status,
        pickupAddress = "איסוף $id",
        deliveryAddress = "מסירה $id"
    )

    @Test
    fun `refreshAvailableMissions stores missions and clears offline flag`() = runTest(testDispatcher) {
        val missions = listOf(mission(1), mission(2), mission(3))
        coEvery { mockApi.getAvailableOrders() } returns missions

        repository.refreshAvailableMissions()

        assertEquals(3, repository.availableMissions.value.size)
        assertEquals("TZ-1", repository.availableMissions.value[0].orderNumber)
        assertFalse(repository.isOffline.value)
        coVerify { mockApi.getAvailableOrders() }
    }

    @Test
    fun `refreshAvailableMissions marks offline and empties cache on failure`() = runTest(testDispatcher) {
        coEvery { mockApi.getAvailableOrders() } throws RuntimeException("network down")

        repository.refreshAvailableMissions()

        assertTrue(repository.isOffline.value)
        assertTrue(repository.availableMissions.value.isEmpty())
    }

    @Test
    fun `acceptMission returns true and refreshes lists when accepted`() = runTest(testDispatcher) {
        coEvery { mockApi.acceptOrder(1) } returns true
        coEvery { mockApi.getAvailableOrders() } returns emptyList()
        coEvery { mockApi.getActiveOrder() } returns null

        val result = repository.acceptMission(1)

        assertTrue(result)
        coVerify { mockApi.acceptOrder(1) }
    }

    @Test
    fun `acceptMission returns false when rejected`() = runTest(testDispatcher) {
        coEvery { mockApi.acceptOrder(1) } returns false

        val result = repository.acceptMission(1)

        assertFalse(result)
        coVerify { mockApi.acceptOrder(1) }
    }

    @Test
    fun `acceptMission catches exception and returns false`() = runTest(testDispatcher) {
        coEvery { mockApi.acceptOrder(1) } throws RuntimeException("timeout")

        val result = repository.acceptMission(1)

        assertFalse(result)
    }

    @Test
    fun `refreshStats populates stats flow`() = runTest(testDispatcher) {
        coEvery { mockApi.getStats() } returns com.tzir.delivery.courier.model.CourierStats(
            totalDeliveries = 100,
            todayEarnings = 250.0,
            weeklyEarnings = 1500.0,
            rating = 4.9,
            balance = 1200.0,
            performanceIndex = 92.0,
            rankBadge = "gold",
            completionRate = 98.0,
            avgDeliveryMins = 18,
            isAvailable = true
        )

        repository.refreshStats()

        assertEquals(100, repository.stats.value?.totalDeliveries)
        assertEquals(1500.0, repository.stats.value?.weeklyEarnings)
        assertEquals(4.9, repository.stats.value?.rating)
    }
}