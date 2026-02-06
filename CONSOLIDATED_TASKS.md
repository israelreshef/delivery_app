# 📋 רשימת משימות מאוחדת (סטטוס פרויקט)

להלן ריכוז כל המשימות הפתוחות שטרם בוצעו, מתוך כלל קבצי התכנון (`PROJECT_MASTER_PLAN.md` ו-`task.md`).

## 🛠 משימות דחופות (Courier Dashboard)
מתוך העבודה הנוכחית על אפליקציית השליחים:
- [x] יישום מודל "קבל/דחה" (Accept/Reject Modal) להצעות משלוח חדשות. *(עיצוב משופר עם מפה, טיימר ומחיר מודגש)*.

---

## 🔥 שלב 2: אפליקציית לקוח (Customer Web App)
**מטרה:** לאפשר ללקוח להירשם ולהזמין בקלות.
- [x] **הרשמה (Register):** עיצוב טופס הרשמה (שם, טלפון, מייל) וחיבור ל-API `/auth/register`.
- [x] **דשבורד לקוח:**
    - [x] תצוגת "הזמנות שלי" (היסטוריה וסטטוס).
    - [x] כפתור "הזמנה חדשה" בולט ונגיש.
- [x] **תהליך הזמנה:**
    - [x] וידוא שמירת כל השדות (איסוף, מסירה, נמען) בצורה תקינה.
    - [x] דף "תודה" לאחר הזמנה עם מעבר למעקב משלוח.

---

## 🚗 שלב 3: אפליקציית שליחים (Web Dashboard)
- [x] **מסך משימות:** שיפור תצוגת רשימת המשלוחים הפעילים (נוסף מצב "רשימה" לצד המפה).
- [x] **לוגין שליחים:** וידוא הרשאות נפרדות ומאובטחות (נבדק: Routes מוגנים ע"י `@role_required('courier')`).
- [x] **תיקון באגים קריטיים:**
    - [x] תיקון שגיאות 401 בחלון ה-Consent ובקריאות API.
    - [x] סנכרון נתיבי API (plural vs singular).
    - [x] תיקון סכמת מסד נתונים (מחיקה ויצירה מחדש).

---

## 📱 שלב 4 & 5: אפליקציית מובייל (React Native)
**מטרה:** אפליקציית Native אמיתית (לא Web) לעבודה מהשטח.
- [x] **הקמת שלד (Foundation):**
    - [x] הקמת פרויקט Expo עם TypeScript.
    - [x] הגדרת ניווט (React Navigation).
    - [x] מסך התחברות (Login Screen) פונקציונלי.
- [x] **מסכי ליבה:**
    - [x] מסך בית (Home Screen) עם רשימת משלוחים.
    - [x] מסך פרטי משלוח (Delivery Details).
    - [x] הוכחת מסירה (POD) עם מצלמה וחתימה.
- [x] **שירותי רקע:**
    - [x] מעקב מיקום (Background Location Task).
    - [x] התראות (Notifications).
- [ ] **מצב אופליין (Offline):** בדיקות סופיות לסנכרון נתונים.

---

## ⚙️ בדיקות ואימות (QA)
- [x] **אימות סופי:** ביצוע תהליך מלא (End-to-End) של יצירת הזמנה -> שיוך לשליח -> איסוף -> מסירה (אומת ברמת הקוד + תיקוני Backend).
- [x] **שיפור UI/UX:**
    - [x] החלת ערכת נושא "Corporate Blue".
    - [x] הטמעת פונט Assistant.
    - [x] ניקוי אזהרות קונסול (Console Warnings).

---

## ⚖️ רגולציה, משפט ואבטחת מידע (Legal & Compliance)
**מטרה:** עמידה בדרישות החוק הישראלי, הגנת הפרטיות ומזעור חשיפה משפטית (Gig Economy).

### 1. דיני ראיות ורשומה מוסדית (סעיף 36 לפקודת הראיות)
*   [x] **לוגים מאובטחים (Audit Logs):** יצירת טבלת לוגים לקריאה-בלבד (Immutable).
*   [x] **חתימה דיגיטלית פנימית:** חיתום רשומות קריטיות (HMAC-SHA256).

### 2. הגנת הפרטיות (תקנות 2017)
*   [x] **זכויות משתמש:** כפתורי מחיקת חשבון והורדת מידע.
*   [x] **מדיניות פרטיות (Consent):**
    - [x] מודל הסכמה (Consent Modal) תקין ופונקציונלי.
    - [x] שמירת זמן אישור בבסיס הנתונים.

### 3. מודל העסקה (Gig Economy)
*   [x] **טרמינולוגיה:** שינוי ל"הצעה" ו"בקשה".
*   [x] **חופש פעולה:** כפתור "דחה" בולט.
*   [x] **חשבוניות:** תמיכה עקרונית בחשבונית עצמית.

### 4. מסירות משפטיות ("כתבי בי-דין")
*   [x] **נוהל מסירה אישית:** זיהוי, חתימה, צילום ומיקום.

---

## 🚀 שדרוגים עתידיים והרחבות (Roadmap)
**מטרה:** תכנון לטווח הרחוק (Phase 6+) לאחר התבססות המערכת.

### 1. אופטימיזציית מסלולים (AI)
*   [ ] **אלגוריתם חכם:** שילוב מנוע AI לתכנון מסלול אופטימלי למספר משלוחים במקביל.
*   [ ] **בדיקות שטח:** מנגנון ללימוד ועדכון מסלולים על בסיס נתוני זמן אמת ודיווחים מהשטח.

### 2. אינטגרציות חיצוניות
*   [ ] **WhatsApp Business API:** חיבור למערכת הודעות אוטומטית (עדכוני סטטוס ללקוח בווטסאפ). *לביצוע בשלב מתקדם (עלויות).*

### 3. פיננסים
*   [ ] **משיכת כספים (Cash Out):** אפשרות לשליח לבצע משיכה מיידית של הרווחים שנצברו ("ארנק דיגיטלי"). *לביצוע בשלב מתקדם.*

### 4. דשבורד מנהלים מתקדם (Analytics & AI)
*   [ ] **חיזוי ביקושים:** דשבורד סטטיסטי לחיזוי עומסים (בהמשך שילוב AI לניתוח שוק ומגמות).
*   [ ] **ניהול מתקדם:** כלים לקבלת החלטות מבוססי נתונים בזמן אמת.

### 5. שימור ומוטיבציה (Gamification)
*   [ ] **משחוק האפליקציה:** מנגנוני הישגים, טבלאות מובילים (Leaderboards) ותגמולים להעלאת מוטיבציית השליחים.

### 6. אבטחה מתקדמת (Sensitive Deliveries)
*   [ ] **זיהוי פנים ביומטרי:** אימות זהות (כדוגמת Microsoft Face API) עבור מסירת חבילות רגישות במיוחד.
