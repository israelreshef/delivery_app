package com.tzir.delivery.courier

import com.tzir.delivery.courier.database.LocationUpdateEntity
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class LocationUpdateEntityTest {

    @Test
    fun `create location update with defaults`() {
        val loc = LocationUpdateEntity(latitude = 32.0853, longitude = 34.7818)
        assertEquals(32.0853, loc.latitude, 0.0001)
        assertEquals(34.7818, loc.longitude, 0.0001)
        assertEquals(0, loc.id)
        assertFalse(loc.synced)
        assertTrue(loc.timestamp > 0)
    }

    @Test
    fun `create location update with all fields`() {
        val loc = LocationUpdateEntity(id = 5, latitude = 32.1, longitude = 34.8, timestamp = 1000L, synced = true)
        assertEquals(5, loc.id)
        assertEquals(32.1, loc.latitude, 0.0001)
        assertEquals(34.8, loc.longitude, 0.0001)
        assertEquals(1000L, loc.timestamp)
        assertTrue(loc.synced)
    }
}
