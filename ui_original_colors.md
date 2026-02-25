# מפרט עיצוב ממשק המשתמש - מצב קודם (לפני העדכון לצבעי TZIR)

קובץ זה נועד לשימוש כפרומפט או כרפרנס לכלי עיצוב (כמו Google Stitch / Claude / ChatGPT) על מנת לקבל המלצות עיצוב חדשות. הוא מתעד את פלטת הצבעים המקורית של המערכת (אתר Next.js ואפליקציית Android).

## 1. אתר האינטרנט (Next.js & Tailwind CSS)
האתר השתמש בערכת צבעים "Premium Corporate Blue" שהוגדרה בקובץ `globals.css` באמצעות משתני CSS (בפורמט HSL):

```css
/* Premium Corporate Blue Theme - Original */
:root {
  --background: 210 40% 98%; /* Very light blue-grey */
  --foreground: 222 47% 11%; /* Deep navy text */

  --card: 0 0% 100%;
  --card-foreground: 222 47% 11%;

  --popover: 0 0% 100%;
  --popover-foreground: 222 47% 11%;

  --primary: 221 83% 53%; /* #2563EB - Royal Blue */
  --primary-foreground: 210 40% 98%;

  --secondary: 210 40% 96%;
  --secondary-foreground: 222 47% 11%;

  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;

  --accent: 210 40% 96.1%;
  --accent-foreground: 222.2 47.4% 11.2%;

  --destructive: 0 84% 60%;
  --destructive-foreground: 210 40% 98%;

  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 221 83% 53%;

  --radius: 0.75rem; 
}

.dark {
  /* Dark Mode - Deep Navy Background */
  --background: 222 47% 11%;
  --foreground: 210 40% 98%;
  /* ... (שאר הצבעים הותאמו לניגודיות חושך על בסיס אותם גווני כחול) */
}
```

בנוסף, רכיבים רבים באתר השתמשו במחלקות ישירות של Tailwind ממשפחת ה-Blue:
* `bg-blue-600`, `text-blue-600` (כחול ראשי)
* `bg-blue-50`, `bg-blue-100` (חיווי ורקעים עדינים)
* `bg-blue-800`, `bg-blue-900` (רקעים כהים לטקסט)
* גראדיינטים: `from-blue-600 to-indigo-600`, `from-blue-500 to-blue-400`

---

## 2. אפליקציית השליחים (Android - Jetpack Compose)
האפליקציה השתמשה בשילוב של ברירת המחדל של Material 3 (סגול/וורוד) יחד עם צבעים שהוגדרו ידנית בקוד ה-UI (בעיקר גווני כחול, ציאן וכחול-כהה).

### ערכת הנושא של Material (Theme.kt)
```kotlin
private val Purple80 = Color(0xFFD0BCFF)
private val PurpleGrey80 = Color(0xFFCCC2DC)
private val Pink80 = Color(0xFFEFB8C8)

private val Purple40 = Color(0xFF6650a4)
private val PurpleGrey40 = Color(0xFF625b71)
private val Pink40 = Color(0xFF7D5260)
// האפליקציה שאבה צבעים דינמיים מצבעי הטפט בגרסאות אנדרואיד 12 ומעלה.
```

### צבעי Custom מקודדים (Hardcoded) שהיו באפליקציה:
ברחבי מסכי האפליקציה (Login, Dashboard, Profile) הוגדרו צבעים קבועים באמצעות קודי Hex:
* **Deep Navy**: `Color(0xFF001C44)`, `Color(0xFF00251A)`, `Color(0xFF004E92)` - שימשו לטקסטים בכירים, בר עליון (TopBar), ורקעים כהים.
* **Modern Cyan / Bright Turquoise**: `Color(0xFF00D4FF)`, `Color(0xFF00C4B4)`, `Color(0xFF00E5FF)` - שימשו לכפתורים ראשיים, אייקונים (כמו ה-Swiper), בחירות אקטיביות.
* **Premium Royal Blue**: `Color(0xFF1565C0)`, `Color(0xFF004D40)` - צבע משני לכפתורים והדגשות.
* **Airy Light Blue / Off-White**: `Color(0xFFF8FBFE)`, `Color(0xFFE0F7FA)`, `Color(0xFFE3F2FD)` - שימשו כרקע כללי של האפליקציה במצב יום.

---
**הוראה למעצב/AI:**
"זהו המצב הקודם של עיצוב האפליקציה והאתר, שהיה מבוסס ברובו על גווני כחול יוקרתי, ציאן, ו-Navy. כעת, עלינו לעדכן את העיצוב כך שיתאים למותג 'TZIR Delivery'. אנא ספק הגדרות CSS (Tailwind) וקודי צבע (Hex/ARGB) תואמים לעיצוב חדש ומדויק..."
