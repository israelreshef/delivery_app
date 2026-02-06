# 🚀 מדריך פריסה מהיר - 3 שלבים פשוטים

## ✅ **הכנה - כבר עשינו!**

נוצרו הקבצים הבאים:
- ✅ `backend/Procfile` - הוראות הרצה ל-Railway
- ✅ `backend/runtime.txt` - גרסת Python
- ✅ `backend/railway.json` - קונפיגורציה
- ✅ `frontend/.env.production` - משתני סביבה
- ✅ `gunicorn` הותקן ונוסף ל-requirements.txt

---

## 📝 **שלב 1: פרסם Backend ל-Railway (10 דקות)**

### 1.1 הירשם ל-Railway
1. לך ל-https://railway.app
2. לחץ "Login" → התחבר עם GitHub
3. אשר גישה לריפו שלך

### 1.2 צור פרויקט
1. לחץ "New Project"
2. בחר "Deploy from GitHub repo"
3. בחר את `delivery_app`
4. Root Directory: `backend`

### 1.3 הוסף PostgreSQL
1. בפרויקט, לחץ "+ New"
2. בחר "Database" → "PostgreSQL"
3. Railway יצור DB אוטומטית

### 1.4 הגדר משתני סביבה
לחץ על ה-backend service → Variables → הוסף:

```
DATABASE_URL = ${{Postgres.DATABASE_URL}}
SECRET_KEY = tzir-super-secret-2026-change-this
JWT_SECRET_KEY = tzir-jwt-secret-2026-change-this
CORS_ORIGINS = https://tzirdelivery.co.il,https://www.tzirdelivery.co.il
```

### 1.5 Deploy!
- Railway יעשה deploy אוטומטית
- חכה 2-3 דקות
- העתק את ה-URL (למשל: `https://tzir-backend-production.up.railway.app`)

---

## 📝 **שלב 2: פרסם Frontend ל-Vercel (5 דקות)**

### 2.1 עדכן .env.production
```bash
cd frontend
```

ערוך `.env.production` והחלף את ה-URL:
```
NEXT_PUBLIC_API_URL=https://tzir-backend-production.up.railway.app/api
NEXT_PUBLIC_SOCKET_URL=https://tzir-backend-production.up.railway.app
```

### 2.2 הירשם ל-Vercel
1. לך ל-https://vercel.com
2. לחץ "Sign Up" → התחבר עם GitHub

### 2.3 צור פרויקט
1. לחץ "Add New" → "Project"
2. בחר את `delivery_app`
3. Root Directory: `frontend`
4. Framework Preset: Next.js (אוטומטי)

### 2.4 הוסף Environment Variables
לחץ "Environment Variables" והוסף:

```
Name: NEXT_PUBLIC_API_URL
Value: https://tzir-backend-production.up.railway.app/api

Name: NEXT_PUBLIC_SOCKET_URL
Value: https://tzir-backend-production.up.railway.app
```

### 2.5 Deploy!
- לחץ "Deploy"
- חכה 2-3 דקות
- תקבל URL זמני

---

## 📝 **שלב 3: חבר את הדומיין (15 דקות)**

### 3.1 ב-Vercel
1. לך ל-Project Settings → Domains
2. לחץ "Add Domain"
3. הקלד: `tzirdelivery.co.il`
4. לחץ "Add"
5. Vercel יראה לך הוראות DNS

### 3.2 אצל ספק הדומיין
לך לפאנל הניהול של הדומיין והוסף:

**אם Vercel אומר להוסיף A Record:**
```
Type: A
Name: @
Value: 76.76.21.21
TTL: 3600
```

**אם Vercel אומר להוסיף CNAME:**
```
Type: CNAME
Name: @
Value: cname.vercel-dns.com
TTL: 3600
```

**ו-CNAME ל-www:**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: 3600
```

### 3.3 חכה ל-DNS Propagation
- לוקח 5 דקות - 48 שעות
- בדרך כלל 10-30 דקות
- בדוק ב-https://dnschecker.org

---

## ✅ **בדיקה**

### Backend:
```bash
curl https://tzir-backend-production.up.railway.app/api/health
```

צפוי: `{"status": "ok"}`

### Frontend:
פתח בדפדפן: `https://tzirdelivery.co.il`

צפוי: דף הבית של TZIR Delivery

---

## 🔧 **אחרי Deploy - חשוב!**

### 1. הרץ Migrations
ב-Railway, לחץ על ה-backend service → "Deploy Logs"

אם יש שגיאות DB, הרץ:
```bash
# ב-Railway Console
flask db upgrade
python -c "from app import create_app; app = create_app(); print('DB Ready!')"
```

### 2. צור משתמש Admin
```bash
# ב-Railway Console
python create_demo_users.py
```

---

## 💰 **עלויות**

- **Vercel:** חינם (Hobby Plan)
- **Railway:** $5/חודש (Developer Plan)
- **סה"כ:** $5/חודש

---

## 🆘 **בעיות נפוצות**

### "Application Error" ב-Railway
```bash
# בדוק logs
railway logs

# בדוק שgunicorn מותקן
cat requirements.txt | grep gunicorn
```

### Frontend לא מתחבר ל-Backend
1. בדוק ש-CORS_ORIGINS נכון ב-Railway
2. בדוק ש-.env.production עודכן
3. Redeploy את הפרונטאנד

### DNS לא עובד
1. וודא שהרשומות נכונות
2. חכה 30 דקות
3. נקה cache: `ipconfig /flushdns` (Windows)

---

## 🎉 **סיימת!**

האתר שלך זמין ב:
- ✅ https://tzirdelivery.co.il
- ✅ https://www.tzirdelivery.co.il

**SSL אוטומטי מ-Vercel!** 🔒

---

## 📞 **צריך עזרה?**

1. בדוק logs ב-Railway/Vercel
2. וודא שכל משתני הסביבה נכונים
3. בדוק ש-DNS התעדכן

**בהצלחה!** 🚀
