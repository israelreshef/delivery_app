# ✅ Checklist לפני Deploy

## 📋 **Backend**

### קבצים:
- [x] `Procfile` קיים
- [x] `runtime.txt` קיים  
- [x] `railway.json` קיים
- [x] `gunicorn` ב-requirements.txt

### קונפיגורציה:
- [ ] `SECRET_KEY` שונה מ-dev
- [ ] `JWT_SECRET_KEY` שונה מ-dev
- [ ] `CORS_ORIGINS` מוגדר לדומיין הסופי
- [ ] `DATABASE_URL` מצביע ל-PostgreSQL

### בדיקות:
- [ ] `python app.py` עובד מקומית
- [ ] כל ה-tests עוברים
- [ ] אין שגיאות בקונסול

---

## 📋 **Frontend**

### קבצים:
- [x] `.env.production` קיים
- [ ] `.env.production` עודכן עם URL הנכון

### קונפיגורציה:
- [ ] `NEXT_PUBLIC_API_URL` מצביע ל-Railway
- [ ] `NEXT_PUBLIC_SOCKET_URL` מצביע ל-Railway
- [ ] אין hardcoded URLs בקוד

### בדיקות:
- [ ] `npm run build` עובר בהצלחה
- [ ] אין warnings קריטיים
- [ ] כל הדפים נטענים

---

## 📋 **Database**

- [ ] PostgreSQL מוגדר ב-Railway
- [ ] `DATABASE_URL` מוגדר כמשתנה סביבה
- [ ] Migrations רצו (`flask db upgrade`)
- [ ] משתמשי demo נוצרו

---

## 📋 **DNS**

- [ ] רשומת A/CNAME ל-@ (root domain)
- [ ] רשומת CNAME ל-www
- [ ] TTL מוגדר (3600 מומלץ)
- [ ] DNS התעדכן (בדוק ב-dnschecker.org)

---

## 📋 **Security**

- [ ] `SECRET_KEY` ייחודי וחזק
- [ ] `JWT_SECRET_KEY` ייחודי וחזק
- [ ] HTTPS פעיל (SSL מ-Vercel)
- [ ] CORS מוגדר נכון
- [ ] Rate limiting פעיל

---

## 📋 **אחרי Deploy**

- [ ] Backend עובד (curl /api/health)
- [ ] Frontend עובד (פתח בדפדפן)
- [ ] Login עובד
- [ ] יצירת הזמנה עובדת
- [ ] Real-time updates עובדים
- [ ] SSL certificate פעיל

---

## 🎯 **מוכן לDeploy?**

אם כל הסימונים מסומנים - **קדימה!**

עקוב אחרי `DEPLOY_NOW.md` 🚀
