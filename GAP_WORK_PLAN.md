# תוכנית עבודה לסגירת פערים
## מבוסס על IMPLEMENTATION_ROADMAP.md

---

## עדיפות 1: WebSocket — השלמת event handlers

### מה חסר (טופל)
הקליינט לא מאזין לאירועים `new_order` ו-`order_assigned_to_you`, שה-backend פולט. אין `time_window_alert`.

### משימות — ✅ הושלם

**1.1 SocketManager.kt — הוספת מאזינים** ✅
- [x] `"new_order_available"` → `_newOrderEvents.emit(data)` SharedFlow
- [x] `"order_assigned_to_you"` → `_missionUpdates.emit(Unit)` (גיבוי ל-`"new_assignment"`)
- [x] `"time_window_alert"` → אופציונלי; דורש גם backend — הושאר מחוץ לתחום כרגע
- [x] `connectionState` StateFlow → tracking online/offline
- [x] `registerSyncCallback()` → MainActivity רושם callback ש-triggers `refreshAvailableMissions()`
- [x] Reconnection: `EVENT_CONNECT` now fires `syncCallback?.invoke()` (ללא צורך ב-`EVENT_RECONNECT` — library v2.x שולח `EVENT_CONNECT` גם על reconnect)
- [x] Reconnection options: `reconnectionAttempts = Int.MAX_VALUE`, `reconnectionDelay = 2000ms`, `reconnectionDelayMax = 30000ms`, `timeout = 10000ms`

**1.2 MainActivity.kt** ✅
- [x] `SocketManager.registerSyncCallback { → courierRepository.refreshAvailableMissions() }`

**1.3 DashboardScreen.kt** ✅
- [x] `LaunchedEffect` אוסף `SocketManager.newOrderEvents` ומרענן את ה-ViewModel

### מה עדיין לא נעשה
- Backend tests ל-WebSocket — ✅ **4/4 PASSED** (אחרי התקנת dependencies חסרות)
- Mobile unit tests ל-SocketManager — עדיין חסר

### תלויות / קבצים רלוונטיים
- `mobile-native/.../services/SocketManager.kt`
- `backend/sockets/delivery_events.py`
- `backend/tests/`

---

## עדיפות 2: SyncManager — חיבור והפעלה ✅

### משימות — ✅ הושלם

**2.1 Hilt DI** ✅
- [x] `DatabaseModule.kt`: להוסיף `@Provides fun providePendingActionDao(db: TzirDatabase): PendingActionDao`
- [x] `SyncManager` — `@Inject constructor` + Hilt auto-discovery (PendingActionDao זמין)
- [x] `RepositoryModule.kt`: `provideCourierRepository` — מוסיף `syncManager: SyncManager`
- [x] `LocationModule.kt`: `provideLocationManager` — מוסיף `syncManager: SyncManager`

**2.2 MainActivity.kt** ✅
- [x] `@Inject lateinit var syncManager: SyncManager`
- [x] `syncManager.observeConnectivity(applicationContext)` (אחרי SocketManager init)
- [x] `syncManager.registerHandler("ACCEPT_ORDER")` — מפרק endpoint, קורא ל-acceptMission
- [x] `syncManager.registerHandler("UPDATE_STATUS")` — מפרק endpoint+payload, קורא ל-updateMissionStatus
- [x] `syncManager.processQueue()` — ב-LaunchedEffect

**2.3 Repositories — קריאה ל-enqueue בכשלון רשת** ✅
- [x] `CourierRepository.acceptMission()`: catch → `syncManager.enqueue("ACCEPT_ORDER", ...)`
- [x] `CourierRepository.updateMissionStatus()`: catch → `syncManager.enqueue("UPDATE_STATUS", ...)`
- [x] `LocationManager.startTracking().sendLocation()`: catch → `syncManager.enqueue("SEND_LOCATION", ...)`

### מה עדיין לא נעשה
- handler ל-`SEND_LOCATION` — דורש LocationUpdateDao (עדיפות 3)

---

## עדיפות 3: LocationUpdate Entity + Offline Queue

### מה שחסר
ל-Room DB אין טבלה ל-location updates. מיקומים שנשלחים בזמן Offline הולכים לאיבוד.

### משימות

**3.1 יצירת LocationUpdateEntity**
```kotlin
@Entity(tableName = "location_updates")
data class LocationUpdateEntity(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val latitude: Double,
    val longitude: Double,
    val timestamp: Long,
    val synced: Boolean = false
)
```

**3.2 יצירת LocationUpdateDao**
```kotlin
@Dao
interface LocationUpdateDao {
    @Insert suspend fun insert(update: LocationUpdateEntity)
    @Query("SELECT * FROM location_updates WHERE synced = 0 LIMIT 100") suspend fun getPending(): List<LocationUpdateEntity>
    @Query("UPDATE location_updates SET synced = 1 WHERE id IN (:ids)") suspend fun markSynced(ids: List<Int>)
    @Query("DELETE FROM location_updates WHERE synced = 1") suspend fun clearSynced()
}
```

**3.3 רישום ב-TzirDatabase**
- [ ] להוסיף entity + DAO
- [ ] לעדכן גרסה ל-5

**3.4 עדכון LocationManager / LocationService**
- [ ] כששליחת location נכשלת → `pendingActionDao.insert(LocationUpdateEntity(...))` (במקום לזרוק)

**3.5 SyncManager.registerHandler("SEND_LOCATION")**
- [ ] handler שולח batch מה-LocationUpdateDao.getPending() ל-`api.sendLocation()`, מסמן synced

### תלויות / קבצים רלוונטיים
- `mobile-native/.../database/` (נוצר חדש)
- `mobile-native/.../services/SyncManager.kt`
- `mobile-native/.../location/LocationManager.kt`

---

## עדיפות 4: Academy — השלמת endpoints חסרים

### מה שחסר
3 endpoints קיימים ב-backend אבל לא מחוברים ל-mobile:
- `GET /api/academy/courses/{id}/certificate`
- `POST /api/academy/verify-certificate`
- `GET /api/academy/protocols/my-certifications`

וגם: `enrollCourse`, `getCourseProgress` לא קיימים.

### משימות

**4.1 Mobile: DeliveryApi.kt — הוספת methods**
- [ ] `suspend fun getCertificate(courseId: Int): String?`
- [ ] `suspend fun getMyCertifications(): List<Map<String, Any>>`

**4.2 DeliveryApiImpl — מימוש**
- [ ] `GET /api/academy/protocols/my-certifications` → `getMyCertifications()`
- [ ] מומלץ: להוסיף `AcademyCertificate.kt` model ב-model package

**4.3 CourierRepository.kt — חשיפת StateFlow**
- [ ] `_myCertifications: MutableStateFlow<List<Map<String, Any>>>(emptyList())`
- [ ] `refreshMyCertifications()`

**4.4 AcademyScreen.kt — תצוגת תעודות**
- [ ] Tab שלישי: "התעודות שלי" → רשימת certifications

### תלויות / קבצים רלוונטיים
- `mobile-native/.../network/DeliveryApi.kt`
- `mobile-native/.../repository/CourierRepository.kt`
- `mobile-native/.../ui/courier/AcademyScreen.kt`
- `backend/routes/academy_protocols.py` (my-certifications endpoint — ✅ קיים)

---

## עדיפות 5: Testing — טסטים בסיסיים

### מה שחסר
רק 4 unit tests קיימים. חסרים MockK tests, טסטים ל-Repository, API models.

### משימות

**5.1 CourierRepositoryTest.kt**
- [ ] `testGetAvailableMissions()` — MockK ל-DeliveryApi, verify StateFlow
- [ ] `testAcceptOrder()` — MockK, verify אמת/שקר

**5.2 PaymentRepositoryTest.kt**
- [ ] `testCreateWithdrawal()` — MockK ל-DeliveryApi
- [ ] `testGetPaymentMethods()` — MockK

**5.3 Model Serialization Tests**
- [ ] `Mission` serialization/deserialization
- [ ] `CourierVehicle` model
- [ ] `AuthResponse` / `LoginRequest`

**5.4 Endpoint Verification Script**
- [ ] `scripts/test_endpoints.sh` / `.ps1` — בדיקה אוטומטית מול backend

### תלויות / קבצים רלוונטיים
- `mobile-native/.../src/test/`
- `mobile-native/.../build.gradle.kts` — ✅ dependencies already added

---

## עדיפות 6: Polish — Week 3 Day 4-5

### מה שחסר
Performance, memory, battery, E2E — לא התחיל.

### משימות

**6.1 Error UI States**
- [ ] לעבור על כל screen ולוודא שכשלון API מציג Snackbar/Toast/Error state
- [ ] במיוחד: `AcademyScreen`, `DocumentsScreen`, `ClientsScreen`, `VehicleScreen`

**6.2 Retry Logic**
- [ ] להוסיף `maxRetries` + `delay` בכל Repository method (או ב-SyncManager level)
- [ ] `retryWithBackoff {}` utility function

**6.3 Debug Logging**
- [ ] לוודא ש-`Timber` או `Log.d` קיימים בכל נקודת API call
- [ ] Crashlytics `log()` + `recordException()` ב-catches משמעותיים

**6.4 Performance**
- [ ] לאתר recompositions מיותרות ב-Compose
- [ ] `remember` + `derivedStateOf` איפה שחסר

### קבצים רלוונטיים
- Cross-cutting — נוגע כמעט לכל המסכים

---

## סדר ביצוע מומלץ

```
שבוע 1: WebSocket (1.1-1.3) + SyncManager DI (2.1-2.2)
שבוע 2: SyncManager Repos (2.3) + LocationUpdate (3.1-3.5)
שבוע 3: Academy (4.1-4.4) + Testing (5.1-5.4)
שבוע 4: Polish (6.1-6.4) + E2E verification
```

## סטטוס נוכחי (מקור: סעיפים 2-3 ב-IMPLEMENTATION_ROADMAP.md)

| Week | Day | נושא | % השלמה |
|---|---|---|---|
| 1 | 1-2 | Payment System | 85% |
| 1 | 3-4 | Room Database | 40% |
| 1 | 5 | WebSocket | 35% |
| 2 | 1-2 | Academy | 80% |
| 2 | 3 | Route Optimization | 90% |
| 2 | 4-5 | Testing | 10% |
| 3 | 1-2 | Hilt DI | 85% |
| 3 | 3 | Error Handling | 40% |
| 3 | 4-5 | Final Polish | 0% |
