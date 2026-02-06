
# -----------------------------------------------------------------------------
# TZIR Delivery App - הפעלה מלאה של כל המערכות (Full Stack)
# -----------------------------------------------------------------------------

# 1. ניקוי ואיפוס (Clean Slate)
cd backend
# מנקים מיגרציות קודמות
if (Test-Path "migrations") { rd /s /q "migrations" }
cd ..

# 2. הרמת שרתים ותשתיות (Docker)
# מריץ את PostgreSQL + PostGIS + Redis + Backend ברקע
docker-compose up -d --build

# המתן כמה שניות שהדאטה-בייס יעלה...
echo "Waiting for Database to start..."
timeout /t 10

# 3. אתחול הדאטה-בייס (Backend Init - Inside Docker)
# כל הפקודות ירוצו בתוך הקונטיינר כדי למנוע בעיות של סביבה מקומית

echo "Initializing Database..."
# יצירת סביבת מיגרציות חדשה
docker-compose exec -T backend flask db init

# יצירת סקריפט המיגרציה הראשון (Initial Migration)
docker-compose exec -T backend flask db migrate -m "Initial PostGIS setup"

# הרצת המיגרציה בפועל מול ה-Postgres
docker-compose exec -T backend flask db upgrade

# 4. יצירת דאטה ראשוני (Seeding)
# הזנת נתוני בדיקה: שליחים, לקוחות, הזמנות, אזורי חלוקה
echo "Seeding Database..."
docker-compose exec -T backend python seed_random_data.py

# 5. ריצה (הוראות למשתמש)
# כעת הרץ בטרמינל נפרד את ה-Frontend:
# cd frontend
# npm run dev

# וטרמינל נוסף ל-Mobile:
# cd mobile
# npx expo start


echo "✅ System Ready! Backend and DB are running."
echo "To see server logs: docker-compose logs -f backend"
