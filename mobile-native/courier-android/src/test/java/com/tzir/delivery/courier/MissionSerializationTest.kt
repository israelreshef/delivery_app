package com.tzir.delivery.courier

import com.tzir.delivery.courier.model.Mission
import kotlinx.serialization.json.Json
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Test

class MissionSerializationTest {

    private val json = Json { ignoreUnknownKeys = true }

    @Test
    fun `parse mission from full JSON`() {
        val input = """
            {
                "id": 42,
                "order_number": "TZ-2026-0042",
                "status": "assigned",
                "pickup_address": "הרצל 5, תל אביב",
                "delivery_address": "בן יהודה 10, תל אביב",
                "package_description": "מסמכים משפטיים",
                "estimated_price": 45.5,
                "price": 50.0,
                "pickup_lat": 32.0853,
                "pickup_lng": 34.7818,
                "delivery_lat": 32.0910,
                "delivery_lng": 34.7890,
                "distance_km": 3.2,
                "duration_mins": 15,
                "base_fare": 35.0,
                "tip": 5.0,
                "is_urgent": true,
                "delivery_type": "legal"
            }
        """.trimIndent()

        val mission = json.decodeFromString<Mission>(input)
        assertEquals(42, mission.id)
        assertEquals("TZ-2026-0042", mission.orderNumber)
        assertEquals("assigned", mission.status)
        assertEquals(45.5, mission.estimatedPrice, 0.001)
        assertEquals(50.0, mission.price!!, 0.001)
        assertEquals(32.0853, mission.pickupLat!!, 0.0001)
        assertEquals(34.7818, mission.pickupLng!!, 0.0001)
        assertEquals(3.2, mission.distanceKm, 0.001)
        assertEquals(15, mission.durationMins)
        assertEquals(true, mission.isUrgent)
    }

    @Test
    fun `parse mission with minimal fields`() {
        val input = """
            {
                "id": 1,
                "order_number": "TZ-0001",
                "status": "pending",
                "pickup_address": "א",
                "delivery_address": "ב"
            }
        """.trimIndent()

        val mission = json.decodeFromString<Mission>(input)
        assertEquals(1, mission.id)
        assertEquals("pending", mission.status)
        assertNull(mission.price)
        assertNull(mission.pickupLat)
        assertEquals(0.0, mission.tip, 0.001)
        assertEquals(false, mission.otpVerified)
    }

    @Test
    fun `parse mission list from API response`() {
        val input = """
            [
                {"id": 1, "order_number": "TZ-1", "status": "pending", "pickup_address": "א", "delivery_address": "ב"},
                {"id": 2, "order_number": "TZ-2", "status": "assigned", "pickup_address": "ג", "delivery_address": "ד"}
            ]
        """.trimIndent()

        val missions = json.decodeFromString<List<Mission>>(input)
        assertEquals(2, missions.size)
        assertEquals("TZ-1", missions[0].orderNumber)
        assertEquals("assigned", missions[1].status)
    }
}
