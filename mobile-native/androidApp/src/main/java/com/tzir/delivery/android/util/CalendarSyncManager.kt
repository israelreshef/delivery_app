package com.tzir.delivery.android.util

import android.content.ContentValues
import android.content.Context
import android.provider.CalendarContract
import java.util.TimeZone
import com.tzir.delivery.shared.model.Mission
import android.util.Log

class CalendarSyncManager(private val context: Context) {

    fun addMissionToCalendar(mission: Mission): Boolean {
        try {
            val cr = context.contentResolver
            
            // Get default visible calendar ID
            val calendarId = getDefaultCalendarId() ?: return false
            
            val values = ContentValues().apply {
                // Set to start now and end in 1 hour
                val startTime = System.currentTimeMillis()
                put(CalendarContract.Events.DTSTART, startTime)
                put(CalendarContract.Events.DTEND, startTime + 3600000)
                put(CalendarContract.Events.TITLE, "משלוח ציר #${mission.orderNumber}")
                put(CalendarContract.Events.DESCRIPTION, "איסוף: ${mission.pickupAddress}\nמסירה: ${mission.deliveryAddress}")
                put(CalendarContract.Events.EVENT_LOCATION, mission.pickupAddress)
                put(CalendarContract.Events.CALENDAR_ID, calendarId)
                put(CalendarContract.Events.EVENT_TIMEZONE, TimeZone.getDefault().id)
            }
            
            val uri = cr.insert(CalendarContract.Events.CONTENT_URI, values)
            return uri != null
        } catch (e: Exception) {
            Log.e("CalendarSync", "Error adding event", e)
            return false
        }
    }

    private fun getDefaultCalendarId(): Long? {
        val projection = arrayOf(CalendarContract.Calendars._ID)
        val selection = "${CalendarContract.Calendars.VISIBLE} = 1"
        val cursor = context.contentResolver.query(
            CalendarContract.Calendars.CONTENT_URI,
            projection,
            selection,
            null,
            null
        )
        cursor?.use {
            if (it.moveToFirst()) {
                return it.getLong(0)
            }
        }
        return null
    }
}
