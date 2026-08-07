---
description: How to run the courier and customer mobile apps on Android emulators
---

# הרצת אפליקציות הניידות על אמולטורי Android

הפרויקט מכיל **שתי אפליקציות אנדרואיד** (Native, Gradle) תחת `mobile-native`:

| אפליקציה | חבילה | מודול Gradle | AVD |
|-----------|--------|--------------|-----|
| שליחים (Courier) | `com.tzir.delivery.courier` | `:courierApp` | `Pixel_7` |
| לקוחות (Customer) | `com.tzir.delivery.customer` | `:customerApp` | `Pixel_7_Customer` |

## ✅ הדרך המומלצת – סקריפטי ההרצה (Launchers)

אין צורך להריץ שרת/מסד/מוליד ידנית. הסקריפטים בשורש הפרויקט עושים הכל
(DB + Backend + Frontend + בניית APK + השקת אימולטור + התקנה + הפעלת האפליקציה).

### `run.bat` – הרצה מלאה (שני האימולטורים)

מריץ את כל הסטאק ואת **שני האימולטורים במקביל**, ופותח כל אפליקציה על האימולטור שלה:

- `emulator-5554` (AVD `Pixel_7`) → **אפליקציית השליחים**
- `emulator-5556` (AVD `Pixel_7_Customer`) → **אפליקציית הלקוחות**

### `run-courier.bat` – שליחים בלבד

מריץ Backend + Frontend + אימולטור **שליחים** בלבד (`emulator-5554`), בונה ומתקין ומשיק את אפליקציית השליחים.

### `run-customer.bat` – לקוחות בלבד

מריץ Backend + Frontend + אימולטור **לקוחות** בלבד (`emulator-5556`), בונה ומתקין ומשיק את אפליקציית הלקוחות.

> כל סקריפט מזהה אם אימולטור כבר ריצה (`adb devices`) ומדלג על השקה כפולה. ניתן להריץ שניים מהם במקביל (למשל
> `run-courier.bat` בענן אחד ו-`run-customer.bat` באחר) כדי לדמות תהליך של הזמנה→מסירה.

---

## תשתית הסקריפטים

| קובץ | תפקיד |
|------|-------|
| `scripts/start-services.bat` | DB + Backend (`localhost:5000`) + Frontend (`localhost:3000`) – משותף |
| `scripts/start-emulator.bat` | השקת אמולטור עם פורט קבוע, עם הגנה מפני הפעלה כפולה |
| `scripts/mobile_deploy.py` | המתנה ל-boot, התקנת `adb install -r` והפעלת האפליקציה (`am start`) |

---

## זרימת טסט המומלצת (הזמנה → מסירה → אישור)

1. הפעל את `run.bat` (מעלה הכל כולל שני האימולטורים).
2. **אפליקציית לקוחות** (`emulator-5556`) – בצע הזמנה.
3. **אפליקציית שליחים** (`emulator-5554`) – אשר/מבצע את המשלוח.
4. **ממשק ניהול** ב-`http://localhost:3000` – עקוב אחרי התהליך ואשר אותו.

---

## דרישות מקדימות

1. **פרויקט Gradle** – `mobile-native` עם שני המודולים `:courierApp` ו-`:customerApp`.
2. **Android SDK** – ברירת מחדל ב-`%LOCALAPPDATA%\Android\Sdk`.
3. **AVDs** – שניים נדרשים: `Pixel_7` (שליחים) ו-`Pixel_7_Customer` (לקוחות).
4. **Java (JBR)** – משמש את ה-build (`C:\Program Files\Android\Android Studio\jbr`).

---

## גישה ידנית (ללא הסקריפטים)

```powershell
# בניית APK לשליחים
cd mobile-native
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
.\gradlew.bat :courierApp:assembleDebug

# בניית APK ללקוחות
.\gradlew.bat :customerApp:assembleDebug

# הפעלת אימולטור עם פורט קבוע
& "$env:LOCALAPPDATA\Android\Sdk\emulator\emulator.exe" -avd Pixel_7 -port 5554

# התקנה והפעלה אצל השליח
adb -s emulator-5554 install -r mobile-native\courier-android\build\outputs\apk\debug\courierApp-debug.apk
adb -s emulator-5554 shell am start -n com.tzir.delivery.courier/.MainActivity
```

## שרתים מקומיים

- Backend: `http://localhost:5000`
- Frontend/Admin: `http://localhost:3000`
- האפליקציות באמולטור משתמשות ב-`http://10.0.2.2:5000` (מקביל ל-localhost מתוך האמולטור).

## בעיות נפוצות ופתרונות

### 1. "מכשיר לא נתמך" (Device Not Supported)
שתי האפליקציות מפעילות בדיקת חומרה (`SecurityEnforcer`). באמולטור הבדיקה מדולגת (debug). ראה `docs/KNOWN_ISSUES_AND_WORKAROUNDS.md` #1.

### 2. האפליקציה לא מתחברת לשרת
- ודא שה-Backend רץ על `http://localhost:5000`
- האפליקציה משתמשת ב-`http://10.0.2.2:5000` (כתובת מיוחדת לאמולטור)

### 3. אימולטור לא מושק / לא online
- ודא שהפורט לא תפוס: `adb devices` מציג `emulator-5554` / `emulator-5556`.
- אם אימולטור תופס פורט אחר, סגור אותו קודם: `adb -s <serial> emu kill`.

### 4. APK לא נמצא
רכזי build בהתאם: `mobile-native\<courier|customer>-android\build\outputs\apk\debug\*-debug.apk`. בנה קודם עם `.gradlew.bat :courierApp:assembleDebug` / `:customerApp:assembleDebug`.

## פקודות שימושיות

```powershell
# צפייה ב-logs בזמן אמת
adb -s emulator-5554 logcat | Select-String "TzirCourierApp|LocationService"

# ניקוי אפליקציה והפעלה מחדש
adb -s emulator-5554 shell pm clear com.tzir.delivery.courier
adb -s emulator-5554 shell am start -n com.tzir.delivery.courier/.MainActivity
```

## תכונות שתוקנו

✅ **חיבור API** – Base URL `10.0.2.2:5000` + retry logic ו-error handling  
✅ **מניעת מסך לבן** – Error boundaries ו-loading states  
✅ **הרשאות** – בקשת הרשאות אוטומטית בהפעלה  
✅ **הרצה דטרמיניסטית** – פורט קבוע לכל אפליקציה + הגנה מפני השקה כפולה

## מבנה האפליקציות

**אפליקציית השליחים (Courier), `mobile-native/courier-android`:**
- 📊 Dashboard – סטטיסטיקות ומשמרות
- 📦 Missions/Tasks – משימות ומשלוחים
- 💰 Earnings – דוחות כספיים
- 📄 Documents – חתימות ותמונות
- 🗺️ Route Optimization – תכנון מסלולים

**אפליקציית הלקוחות (Customer), `mobile-native/customer-android`:**
- 🛒 הזמנות וסל לקוחות
- 📦 מעקב אחר משלוח
- 👤 פרופיל והגדרות