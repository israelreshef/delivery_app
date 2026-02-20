---
description: How to run the courier mobile application on Android emulator
---

# הרצת אפליקציית השליחים על אמולטור Android

## דרישות מקדימות

1. **Backend צריך לרוץ** - וודא שהשרת פועל על `localhost:5000`
2. **Android Emulator** - וודא שיש לך אמולטור מותקן ופועל
3. **Java 17** - נדרש עבור React Native

## שלב 1: הפעל את ה-Backend

```powershell
# פתח טרמינל חדש
cd c:\Users\Israel\Desktop\delivery_app
.\venv\Scripts\Activate.ps1
python backend/app.py
```

השרת צריך לרוץ על: `http://localhost:5000`

## שלב 2: התקן Dependencies (פעם ראשונה בלבד)

```powershell
cd c:\Users\Israel\Desktop\delivery_app\mobile-monorepo
npm install
```

## שלב 3: הרץ את האפליקציה

### אופציה א': הרצה מהירה (מומלץ)

```powershell
cd c:\Users\Israel\Desktop\delivery_app\mobile-monorepo
npx nx run courier-app:run-android
```

### אופציה ב': דרך Android Studio

```powershell
cd c:\Users\Israel\Desktop\delivery_app\mobile-monorepo\apps\courier-app
npx react-native run-android
```

## בעיות נפוצות ופתרונות

### 1. שגיאת "Unable to connect to development server"

**פתרון:**
```powershell
# הפעל את Metro Bundler ידנית
cd c:\Users\Israel\Desktop\delivery_app\mobile-monorepo
npx nx run courier-app:start
```

### 2. שגיאת "SDK location not found"

**פתרון:**
צור קובץ `local.properties` ב-`apps/courier-app/android/`:
```
sdk.dir=C:\\Users\\Israel\\AppData\\Local\\Android\\Sdk
```

### 3. האפליקציה לא מתחברת לשרת

**בדיקה:**
- וודא שה-Backend רץ על `http://localhost:5000`
- האפליקציה משתמשת ב-`http://10.0.2.2:5000` (כתובת מיוחדת לאמולטור)
- בדוק את ה-logs ב-Metro Bundler

### 4. מסך לבן / Crash

**פתרון:**
```powershell
# נקה cache ובנה מחדש
cd c:\Users\Israel\Desktop\delivery_app\mobile-monorepo
npx nx run courier-app:clean
npx nx run courier-app:run-android
```

## בדיקת קישוריות

אחרי שהאפליקציה עולה, בדוק ב-Metro Bundler logs:
- ✅ `🌐 API Client initialized with BASE_URL: http://10.0.2.2:5000/api`
- ✅ `🚀 Courier App starting in DEVELOPMENT mode`
- ✅ `✅ CourierApp registered successfully`

## תכונות שתוקנו

✅ **חיבור API מתוקן** - עם retry logic ו-error handling משופר
✅ **מניעת מסך לבן** - Error boundaries ו-loading states
✅ **חיבור אינטרנט** - Timeout מוגדל ל-15 שניות
✅ **Logging משופר** - כל בקשה מתועדת ב-console
✅ **הרשאות** - בקשת הרשאות אוטומטית בהפעלה

## מבנה האפליקציה

האפליקציה כוללת 5 מסכים:
- 📊 **Dashboard** - סטטיסטיקות ומשמרות
- 📦 **Tasks** - משימות ומשלוחים
- 💰 **Financial** - דוחות כספיים
- 📄 **Documents** - חתימות ותמונות
- 🗺️ **Route Planner** - תכנון מסלולים

## פקודות שימושיות

```powershell
# הצג logs בזמן אמת
npx nx run courier-app:log-android

# בנה APK לבדיקה
npx nx run courier-app:build-android

# נקה הכל והתחל מחדש
npx nx reset
npm install
npx nx run courier-app:run-android
```
