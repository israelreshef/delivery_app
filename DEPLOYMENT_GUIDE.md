# 🚀 מדריך פריסה ל-Production - tzirdelivery.co.il

## 📋 **תוכן עניינים**
1. [אפשרויות פריסה](#אפשרויות-פריסה)
2. [המלצה: Vercel + Railway](#המלצה-vercel--railway)
3. [חלופה: VPS (DigitalOcean/AWS)](#חלופה-vps)
4. [הגדרת DNS](#הגדרת-dns)
5. [SSL Certificate](#ssl-certificate)

---

## 🎯 **אפשרויות פריסה**

### **אופציה 1: Vercel (Frontend) + Railway (Backend)** ⭐ מומלץ
**עלות:** $0-20/חודש  
**קושי:** ⭐ קל  
**זמן:** 30 דקות

**יתרונות:**
- ✅ חינם להתחלה
- ✅ SSL אוטומטי
- ✅ CI/CD אוטומטי
- ✅ קל מאוד לתחזוקה

---

### **אופציה 2: VPS (DigitalOcean/AWS)**
**עלות:** $5-20/חודש  
**קושי:** ⭐⭐⭐ בינוני  
**זמן:** 2-3 שעות

**יתרונות:**
- ✅ שליטה מלאה
- ✅ גמישות מקסימלית
- ✅ יכול לרוץ הכל על שרת אחד

---

## 🌟 **המלצה: Vercel + Railway**

### **שלב 1: פריסת Backend ל-Railway**

#### 1.1 הכנת הפרויקט:

```bash
# צור קובץ Procfile
cd backend
echo "web: gunicorn app:app" > Procfile

# צור runtime.txt
echo "python-3.11" > runtime.txt

# עדכן requirements.txt
pip freeze > requirements.txt
```

#### 1.2 התקן Gunicorn:
```bash
pip install gunicorn
pip freeze > requirements.txt
```

#### 1.3 צור `railway.json`:
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "gunicorn -w 4 -b 0.0.0.0:$PORT app:app",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

#### 1.4 פריסה ל-Railway:

1. **הירשם ל-Railway:**
   - לך ל-https://railway.app
   - התחבר עם GitHub

2. **צור פרויקט חדש:**
   - לחץ "New Project"
   - בחר "Deploy from GitHub repo"
   - בחר את הריפו שלך
   - בחר את תיקיית `backend`

3. **הוסף PostgreSQL:**
   - לחץ "+ New"
   - בחר "Database" → "PostgreSQL"
   - Railway יצור אוטומטית DB

4. **הגדר משתני סביבה:**
   ```
   DATABASE_URL=${POSTGRESQL_URL}
   SECRET_KEY=your-super-secret-key-change-this-in-production
   JWT_SECRET_KEY=your-jwt-secret-key-change-this
   CORS_ORIGINS=https://tzirdelivery.co.il,https://www.tzirdelivery.co.il
   REDIS_URL=redis://localhost:6379
   EXTERNAL_API_KEY=your-api-key-here
   ```

5. **Deploy:**
   - Railway יעשה deploy אוטומטי
   - תקבל URL כמו: `https://your-app.railway.app`

---

### **שלב 2: פריסת Frontend ל-Vercel**

#### 2.1 הכנת הפרויקט:

```bash
cd frontend

# עדכן .env.production
cat > .env.production << EOF
NEXT_PUBLIC_API_URL=https://your-app.railway.app/api
NEXT_PUBLIC_SOCKET_URL=https://your-app.railway.app
EOF
```

#### 2.2 פריסה ל-Vercel:

1. **הירשם ל-Vercel:**
   - לך ל-https://vercel.com
   - התחבר עם GitHub

2. **צור פרויקט חדש:**
   - לחץ "Add New" → "Project"
   - בחר את הריפו שלך
   - Root Directory: `frontend`

3. **הגדר Environment Variables:**
   ```
   NEXT_PUBLIC_API_URL=https://your-app.railway.app/api
   NEXT_PUBLIC_SOCKET_URL=https://your-app.railway.app
   ```

4. **Deploy:**
   - לחץ "Deploy"
   - תקבל URL כמו: `https://your-app.vercel.app`

---

### **שלב 3: הגדרת DNS לדומיין tzirdelivery.co.il**

#### 3.1 ב-Vercel (Frontend):

1. לך ל-Project Settings → Domains
2. לחץ "Add Domain"
3. הוסף: `tzirdelivery.co.il` ו-`www.tzirdelivery.co.il`
4. Vercel ייתן לך הוראות DNS

#### 3.2 אצל ספק הדומיין שלך:

הוסף רשומות DNS הבאות:

```
Type    Name    Value                           TTL
A       @       76.76.21.21                     3600
CNAME   www     cname.vercel-dns.com            3600
```

**או אם Vercel נותן לך IP אחר:**
```
Type    Name    Value                           TTL
A       @       [IP מ-Vercel]                   3600
CNAME   www     [CNAME מ-Vercel]                3600
```

#### 3.3 ל-Backend (אופציונלי):

אם רוצה subdomain ל-API:
```
Type    Name    Value                           TTL
CNAME   api     your-app.railway.app            3600
```

---

### **שלב 4: SSL Certificate**

**Vercel:**
- ✅ SSL אוטומטי - לא צריך לעשות כלום!
- Vercel יוציא Let's Encrypt certificate אוטומטית

**Railway:**
- ✅ SSL אוטומטי גם כן!

---

## 🔧 **קבצים שצריך ליצור**

### 1. `backend/Procfile`
```
web: gunicorn -w 4 -b 0.0.0.0:$PORT app:app
```

### 2. `backend/runtime.txt`
```
python-3.11
```

### 3. `backend/railway.json`
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "gunicorn -w 4 -b 0.0.0.0:$PORT app:app",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### 4. `frontend/.env.production`
```env
NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app/api
NEXT_PUBLIC_SOCKET_URL=https://your-backend-url.railway.app
```

---

## ✅ **Checklist לפני Deploy**

### Backend:
- [ ] `gunicorn` ב-requirements.txt
- [ ] `Procfile` קיים
- [ ] `runtime.txt` קיים
- [ ] משתני סביבה מוגדרים
- [ ] `SECRET_KEY` שונה מ-dev
- [ ] `CORS_ORIGINS` מוגדר לדומיין הסופי

### Frontend:
- [ ] `.env.production` עם URL הנכון
- [ ] Build עובר בהצלחה (`npm run build`)
- [ ] אין hardcoded URLs

### Database:
- [ ] PostgreSQL מוגדר ב-Railway
- [ ] Migrations רצו (`flask db upgrade`)
- [ ] משתמשי demo נוצרו

---

## 🚀 **פקודות Deploy**

### Backend (Railway):
```bash
cd backend

# הוסף gunicorn
pip install gunicorn
pip freeze > requirements.txt

# צור קבצים
echo "web: gunicorn -w 4 -b 0.0.0.0:\$PORT app:app" > Procfile
echo "python-3.11" > runtime.txt

# Push to GitHub
git add .
git commit -m "Prepare for Railway deployment"
git push
```

### Frontend (Vercel):
```bash
cd frontend

# בדוק build
npm run build

# עדכן env
echo "NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api" > .env.production
echo "NEXT_PUBLIC_SOCKET_URL=https://your-backend.railway.app" >> .env.production

# Push to GitHub
git add .
git commit -m "Prepare for Vercel deployment"
git push
```

---

## 🔍 **בדיקה אחרי Deploy**

1. **בדוק Backend:**
   ```bash
   curl https://your-backend.railway.app/api/health
   ```

2. **בדוק Frontend:**
   - פתח https://tzirdelivery.co.il
   - נסה login
   - צור הזמנה

3. **בדוק SSL:**
   - וודא שיש מנעול ירוק בדפדפן
   - בדוק ש-HTTPS עובד

---

## 💰 **עלויות**

### Vercel (Frontend):
- **Hobby Plan:** חינם!
- **Pro Plan:** $20/חודש (אם צריך יותר)

### Railway (Backend + DB):
- **Trial:** $5 credit חינם
- **Developer Plan:** $5/חודש
- **Team Plan:** $20/חודש

**סה"כ:** $5-25/חודש

---

## 🆘 **פתרון בעיות**

### Backend לא עולה:
```bash
# בדוק logs ב-Railway
railway logs

# בדוק שgunicorn מותקן
pip list | grep gunicorn
```

### Frontend לא מתחבר ל-Backend:
```bash
# בדוק CORS
curl -H "Origin: https://tzirdelivery.co.il" \
  -H "Access-Control-Request-Method: POST" \
  -X OPTIONS https://your-backend.railway.app/api/orders
```

### DNS לא עובד:
```bash
# בדוק DNS propagation
nslookup tzirdelivery.co.il

# או השתמש ב:
# https://dnschecker.org
```

---

## 📞 **צריך עזרה?**

אם משהו לא עובד:
1. בדוק logs ב-Railway/Vercel
2. וודא שכל משתני הסביבה מוגדרים
3. בדוק ש-DNS התעדכן (לוקח עד 48 שעות)

**מוכן לפרסם!** 🚀
