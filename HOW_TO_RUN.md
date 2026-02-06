# 🚀 הוראות הפעלה למערכת (TZIR Delivery System)

מדריך זה יעזור לך להריץ את המערכת המלאה (שרת ולקוח) בצורה נקייה ומסודרת לצורך ההדגמה.

## דרישות קדם
*   חלון PowerShell או Command Prompt.
*   דפדפן כרום (Chrome).

---

## שלב 1: הפעלת השרת (Backend)
1.  פתח חלון טרמינל חדש.
2.  הכנס את הפקודות הבאות:
    ```powershell
    cd c:\Users\Israel\Desktop\delivery_app\backend
    python app.py
    ```
3.  **מה אמור לקרות?**
    *   השרת יידלק.
    *   אם מחקת את בסיס הנתונים (`delivery.db`), השרת ייצור אותו מחדש אוטומטית.
    *   תראה הודעה: `🌱 Database empty. Auto-seeding demo users...` (יצירת משתמשים לדוגמה).
    *   תראה הודעה: `Running on http://0.0.0.0:5000` (או דומה).

---

## שלב 2: הפעלת הממשק (Frontend)
1.  פתח חלון טרמינל **נוסף** (אל תסגור את הקודם).
2.  הכנס את הפקודות הבאות:
    ```powershell
    cd c:\Users\Israel\Desktop\delivery_app\frontend
    npm run dev
    ```
3.  **מה אמור לקרות?**
    *   הפרויקט ייבנה.
    *   תראה הודעה: `Ready in ...` ו-`url: http://localhost:3000`.

---

## שלב 3: כניסה למערכת (Login)
פתח את הדפדפן בכתובת: **http://localhost:3000**

השתמש בפרטי ההתחברות הבאים (נוצרו אוטומטית):

### 👮 מנהל מערכת (Admin)
*   **אימייל:** `admin@tzir.com`
*   **סיסמה:** `TzirSuper2026!$!`
*   *משמש ל:* צפייה בכל ההזמנות, ניהול שליחים, דשבורד מנהל.

### 🛵 שליח (Courier)
*   **אימייל:** `courier@tzir.com`
*   **סיסמה:** `TzirRiderSpeed!77`
*   *משמש ל:* קבלת משלוחים, דיווח סטטוס, חתימה ומסירה.

### 🏢 לקוח עסקי (Client)
*   **אימייל:** `client@tzir.com`
*   **סיסמה:** `TzirClient2026!`
*   *משמש ל:* יצירת הזמנות חדשות ומעקב.

---

## 💡 טיפים להדגמה מוצלחת
1.  **איפוס נתונים:** אם אתה רוצה להתחיל "דף חלק" לגמרי לפני ההדגמה:
    *   סגור את חלון השרת (Backend).
    *   מחק את הקובץ `backend/delivery.db`.
    *   הפעל מחדש את השרת (`python app.py`).
2.  **מצב אופטימלי:** השתמש בשני דפדפנים שונים (או במצב Incognito) כדי להיות מחובר במקביל גם כמנהל וגם כשליח, ולראות את העדכונים בזמן אמת.
