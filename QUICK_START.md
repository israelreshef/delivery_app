# 🚀 איך להריץ את מערכת TZIR Delivery

## ✅ **תיקון שבוצע - השרת עובד!**

### הבעיה שהייתה:
- חסרה חבילה: `flask-limiter`
- חסר decorator: `api_key_required`

### הפתרון:
1. ✅ הותקנה `flask-limiter`
2. ✅ נוסף `api_key_required` ל-`utils/decorators.py`
3. ✅ נוצר `run_dev.py` להרצה פשוטה

---

## 📋 **הוראות הרצה מהירות**

### Backend (Python/Flask)

#### אופציה 1: הרצה פשוטה (מומלץ לפיתוח)
```powershell
cd backend
python run_dev.py
```

#### אופציה 2: הרצה מלאה עם Socket.IO
```powershell
cd backend
python app.py
```

**השרת ירוץ על:** `http://localhost:5000`

### Frontend (Next.js)

```powershell
cd frontend
npm run dev
```

**הממשק ירוץ על:** `http://localhost:3000`

---

## 🔧 **אם יש בעיות**

### שגיאה: "ModuleNotFoundError"
```powershell
cd backend
pip install -r requirements.txt
```

### שגיאה: "Database not found"
```powershell
cd backend
python -c "from app import create_app; app = create_app(); print('DB Created!')"
```

### שגיאה בפרונטאנד: "Module not found"
```powershell
cd frontend
npm install
```

---

## 🎯 **משתמשי Demo**

השרת יוצר אוטומטית משתמשי demo:

| תפקיד | Username | Password | Email |
|-------|----------|----------|-------|
| Super Admin | `super_admin` | `TzirSuper2026!$!` | admin@tzir.com |
| Finance Admin | `finance_admin` | `TzirFinance$$99` | finance@tzir.com |
| לקוח | `demo_client` | `TzirClient2026!` | client@tzir.com |
| שליח | `demo_courier` | `TzirRiderSpeed!77` | courier@tzir.com |

---

## 📡 **בדיקת חיבור**

### בדיקת Backend:
```powershell
curl http://localhost:5000/api/health
```

או פתח בדפדפן: `http://localhost:5000`

### בדיקת Frontend:
פתח בדפדפן: `http://localhost:3000`

---

## 🌐 **כתובות חשובות**

- **Backend API:** `http://localhost:5000/api`
- **Frontend:** `http://localhost:3000`
- **Admin Panel:** `http://localhost:3000/admin/dashboard`
- **Customer Panel:** `http://localhost:3000/customer/dashboard`
- **Courier Panel:** `http://localhost:3000/courier/dashboard`

---

## ⚙️ **משתני סביבה (Environment Variables)**

### Backend (.env)
```env
DATABASE_URL=sqlite:///delivery.db
SECRET_KEY=your-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-here
CORS_ORIGINS=http://localhost:3000
EXTERNAL_API_KEY=your-api-key-here
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

---

## 🐛 **Debug Mode**

### הפעלת לוגים מפורטים:
```powershell
# Backend
cd backend
$env:FLASK_DEBUG="1"
python run_dev.py
```

---

## ✨ **סטטוס נוכחי**

- ✅ Backend רץ בהצלחה
- ✅ כל ה-endpoints עובדים
- ✅ Database מוכן
- ✅ משתמשי Demo נוצרו
- ✅ Rate Limiting פעיל
- ✅ CORS מוגדר
- ✅ JWT Authentication פעיל

**הכל מוכן לשימוש!** 🎉
