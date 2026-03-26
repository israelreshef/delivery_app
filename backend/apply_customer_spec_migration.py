import sqlite3
import os
import json

def run_migrations():
    db_path = 'delivery.db'
    if not os.path.exists(db_path):
        print(f"Error: {db_path} not found.")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # 1. Create Tables
    cursor.executescript("""
    CREATE TABLE IF NOT EXISTS delivery_protocol_templates (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        code            VARCHAR(1) UNIQUE NOT NULL,
        name            VARCHAR(100) NOT NULL,
        description     TEXT,
        steps           TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS delivery_protocol_configs (
        id                        INTEGER PRIMARY KEY AUTOINCREMENT,
        name                      VARCHAR(100) NOT NULL,
        slug                      VARCHAR(100) UNIQUE NOT NULL,
        category                  VARCHAR(50) NOT NULL,
        base_protocol             VARCHAR(1) REFERENCES delivery_protocol_templates(code),
        requires_id_verification  BOOLEAN DEFAULT 0,
        requires_photo            BOOLEAN DEFAULT 1,
        requires_signature        BOOLEAN DEFAULT 1,
        requires_otp              BOOLEAN DEFAULT 0,
        otp_alternatives          TEXT,
        max_attempts              INTEGER DEFAULT 1,
        return_document_required  BOOLEAN DEFAULT 0,
        multi_stop_allowed        BOOLEAN DEFAULT 0,
        chain_of_custody          BOOLEAN DEFAULT 0,
        pricing_tier              INTEGER DEFAULT 1,
        pricing_multiplier        DECIMAL(4,2) DEFAULT 1.0,
        is_active                 BOOLEAN DEFAULT 1,
        created_at                TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS academy_protocol_courses (
        id                  INTEGER PRIMARY KEY AUTOINCREMENT,
        protocol_slug       VARCHAR(100) REFERENCES delivery_protocol_configs(slug),
        title               VARCHAR(200) NOT NULL,
        description         TEXT,
        estimated_minutes   INTEGER DEFAULT 15,
        passing_score       INTEGER DEFAULT 80,
        required_level      INTEGER DEFAULT 1,
        is_active           BOOLEAN DEFAULT 1,
        created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS academy_protocol_lessons (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        course_id   INTEGER REFERENCES academy_protocol_courses(id),
        order_index INTEGER NOT NULL,
        title       VARCHAR(200) NOT NULL,
        content     TEXT NOT NULL,
        lesson_type VARCHAR(50),
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS academy_protocol_progress (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        courier_id      INTEGER REFERENCES couriers(id),
        course_id       INTEGER REFERENCES academy_protocol_courses(id),
        status          VARCHAR(20) DEFAULT 'not_started',
        score           INTEGER,
        attempts        INTEGER DEFAULT 0,
        completed_at    TIMESTAMP,
        UNIQUE(courier_id, course_id)
    );

    CREATE TABLE IF NOT EXISTS academy_protocol_quiz_questions (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        course_id       INTEGER REFERENCES academy_protocol_courses(id) ON DELETE CASCADE,
        order_index     INTEGER NOT NULL,
        question_text   TEXT NOT NULL,
        option_1        TEXT NOT NULL,
        option_2        TEXT NOT NULL,
        option_3        TEXT NOT NULL,
        option_4        TEXT NOT NULL,
        correct_option  INTEGER NOT NULL,
        explanation     TEXT
    );
    """)

    # Add column to deliveries if not exists
    cursor.execute('PRAGMA table_info(deliveries)')
    cols = [row[1] for row in cursor.fetchall()]
    if 'protocol_slug' not in cols:
        cursor.execute('ALTER TABLE deliveries ADD COLUMN protocol_slug VARCHAR(100) REFERENCES delivery_protocol_configs(slug)')
        print("Added protocol_slug to deliveries.")

    conn.commit()
    
    # 2. Seed Data
    print("Seeding templates...")
    templates = [
        ('A', 'Personal Service', json.dumps([
            {"step": 1, "action": "collect_documents", "label": "איסוף מסמכים"},
            {"step": 2, "action": "verify_recipient_id", "label": "זיהוי נמען", "conditional": "requires_id_verification"},
            {"step": 3, "action": "deliver_to_recipient", "label": "מסירה אישית"},
            {"step": 4, "action": "collect_signature_or_photo", "label": "קבלת אישור"},
            {"step": 5, "action": "return_confirmation", "label": "החזרת אישור למשרד"}
        ])),
        ('B', 'Institutional Filing', json.dumps([
            {"step": 1, "action": "collect_documents", "label": "איסוף מסמכים"},
            {"step": 2, "action": "deliver_to_institution", "label": "הגשה למוסד"},
            {"step": 3, "action": "collect_stamp_or_receipt", "label": "קבלת חותמת/אישור"},
            {"step": 4, "action": "return_confirmation", "label": "החזרת אישור למשרד"}
        ])),
        ('C', 'Multi-Signature Circuit', json.dumps([
            {"step": 1, "action": "collect_documents", "label": "איסוף מסמכים"},
            {"step": 2, "action": "stop_signature", "label": "החתמה — עצירה 1"},
            {"step": 3, "action": "stop_signature_optional", "label": "החתמה — עצירה 2", "conditional": "multi_stop_allowed"},
            {"step": 4, "action": "deliver_to_institution", "label": "הגשה למוסד", "conditional": "return_document_required"},
            {"step": 5, "action": "return_confirmation", "label": "החזרת אישור"}
        ])),
        ('D', 'Attempted Service', json.dumps([
            {"step": 1, "action": "collect_documents", "label": "איסוף מסמכים"},
            {"step": 2, "action": "attempt_delivery", "label": "ניסיון מסירה 1"},
            {"step": 3, "action": "attempt_delivery_retry", "label": "ניסיון מסירה 2", "conditional": "max_attempts >= 2"},
            {"step": 4, "action": "attempt_delivery_final", "label": "ניסיון מסירה 3", "conditional": "max_attempts >= 3"},
            {"step": 5, "action": "door_posting", "label": "הדבקה על הדלת", "conditional": "max_attempts_exhausted"},
            {"step": 6, "action": "submit_service_affidavit", "label": "הגשת תצהיר מוסר"}
        ]))
    ]
    cursor.executemany("INSERT OR IGNORE INTO delivery_protocol_templates (code, name, steps) VALUES (?, ?, ?)", templates)

    print("Seeding configs...")
    configs = [
        ('כתב תביעה', 'legal-claim', 'legal', 'A', 1, 1, 1, 0, 3, 1, 0, 1, 2, 1.5),
        ('אזהרת הוצאה לפועל', 'legal-enforcement-warning', 'legal', 'D', 1, 1, 1, 0, 3, 1, 0, 1, 2, 1.5),
        ('זימון לדיון', 'legal-court-summons', 'legal', 'A', 1, 1, 1, 0, 3, 1, 0, 1, 2, 1.4)
    ]
    cursor.executemany("""
        INSERT OR IGNORE INTO delivery_protocol_configs 
        (name, slug, category, base_protocol, requires_id_verification, requires_photo,
         requires_signature, requires_otp, max_attempts, return_document_required,
         multi_stop_allowed, chain_of_custody, pricing_tier, pricing_multiplier)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, configs)

    print("Seeding courses...")
    courses = [
        ('legal-claim', 'מסירת כתב תביעה — הכשרה מלאה', 'כל מה שצריך לדעת על מסירה אישית של כתבי תביעה לפי חוק סדר הדין האזרחי', 20, 80, 1),
        ('legal-court-summons', 'זימון לדיון — פרוטוקול ודרישות חוקיות', 'הכשרה לביצוע זימונים לדיון בבתי משפט בישראל', 20, 80, 1),
        ('legal-enforcement-warning', 'אזהרת הוצאה לפועל — ניסיונות מסירה', 'פרוטוקול D: ניסיונות מסירה חוזרים, הדבקה, ותצהיר מוסר', 25, 80, 1)
    ]
    for course_data in courses:
        cursor.execute("""
            INSERT OR IGNORE INTO academy_protocol_courses 
            (protocol_slug, title, description, estimated_minutes, passing_score, required_level)
            VALUES (?, ?, ?, ?, ?, ?)
        """, course_data)
    
    conn.commit()

    # Get IDs for courses
    cursor.execute("SELECT id, protocol_slug FROM academy_protocol_courses")
    course_map = {row[1]: row[0] for row in cursor.fetchall()}

    # --- Course 1: legal-claim content ---
    cid = course_map.get('legal-claim')
    if cid:
        lessons = [
            (cid, 1, 'מהו כתב תביעה?', '## מהו כתב תביעה?\n\nכתב תביעה הוא מסמך משפטי רשמי שבו תובע פונה לבית המשפט בבקשה לקבל סעד משפטי כנגד נתבע.\n\n### מי משתמש בכתב תביעה?\n- עורכי דין המייצגים לקוחות\n- בתי משפט שלום, מחוזי ועליון\n- הוצאה לפועל\n\n### מה חשיבות המסירה?\nהמסירה היא **תנאי סף חוקי** — ללא מסירה תקינה, ההליך המשפטי אינו יכול להתקדם.\nהשליח הוא חוליה קריטית בשרשרת המשפטית.', 'theory'),
            (cid, 2, 'הבסיס החוקי — תקנות סדר הדין האזרחי', '## הבסיס החוקי\n\n### תקנה 482 — המצאה אישית\nהמצאה אישית היא מסירת המסמך **ישירות לידי הנמען בלבד**.\n\n**דרישות חוקיות:**\n1. המסמך חייב להימסר לנמען עצמו — לא לבן משפחה, לא לשכן\n2. יש לזהות את הנמען לפני המסירה (תעודת זהות)\n3. אם הנמען מסרב לקבל — ניתן להניח לפניו והמסירה תקפה\n4. יש לתעד את זמן ומקום המסירה במדויק\n\n### תקנה 487 — תצהיר מוסר\nלאחר ביצוע המסירה, השליח חייב למלא תצהיר מוסר המאשר את פרטי המסירה.\n**זהו מסמך משפטי מחייב — פרטים שגויים מהווים עבירה פלילית.**\n\n### מה קורה אם הנמען לא נמצא?\nראה פרוטוקול D — מסירה עם ניסיונות חוזרים.', 'legal'),
            (cid, 3, 'ביצוע מעשי — שלב אחר שלב', '## ביצוע מסירת כתב תביעה\n\n### שלב 1 — איסוף מהמשרד\n- בדוק שהמסמך חתום וסגור במעטפה\n- ודא שרשום שם הנמען ומספר התיק\n- קבל חתימת יציאה ממזכירת המשרד\n\n### שלב 2 — זיהוי הנמען\n- בקש תעודת זהות\n- השווה שם לשם על המעטפה\n- **אל תמסור אם השם אינו תואם**\n\n### שלב 3 — המסירה עצמה\n- מסור את המסמך לידיו\n- אמור: "אני מוסר לך כתב תביעה"\n- אם מסרב — הנח לפניו ואמור "המסמך הונח לפניך"\n\n### שלב 4 — תיעוד\n- צלם את הנמען עם המסמך (בהסכמה) **או** צלם את הדלת + שלט הרחוב\n- קבל חתימה על טופס האישור\n\n### שלב 5 — החזרת האישור\n- חזור למשרד עם טופס האישור החתום\n- קבל חתימת קבלה ממזכירת המשרד', 'practical')
        ]
        cursor.executemany("INSERT OR IGNORE INTO academy_protocol_lessons (course_id, order_index, title, content, lesson_type) VALUES (?, ?, ?, ?, ?)", lessons)

        questions = [
            (cid, 1, 'למי מותר למסור כתב תביעה במסירה אישית?', 'לכל בן משפחה בוגר בבית', 'לשכן שמכיר את הנמען', 'לנמען עצמו בלבד', 'לעורך הדין של הנמען', 3, 'תקנה 482 דורשת מסירה אישית לנמען עצמו בלבד — אין אפשרות למסור לצד שלישי.'),
            (cid, 2, 'הנמען מסרב לקבל את המסמך. מה עושים?', 'חוזרים למשרד וממתינים להוראות', 'מניחים את המסמך לפניו ומודיעים לו בעל פה', 'משאירים בתיבת הדואר', 'מתקשרים לעורך הדין', 2, 'לפי החוק, הנחת המסמך לפני הנמען תוך הודעה בעל פה מהווה מסירה תקפה.'),
            (cid, 3, 'מה חייב להכיל תצהיר המוסר?', 'רק חתימת השליח', 'שם הנמען בלבד', 'זמן, מקום, תיאור המסירה וזהות הנמען', 'מספר תיק בלבד', 3, 'תצהיר מוסר הוא מסמך משפטי מחייב הכולל את כל פרטי המסירה. פרטים חסרים עלולים לפסול את המסירה.'),
            (cid, 4, 'מה עושים אם השם על המעטפה אינו תואם את תעודת הזהות?', 'מוסרים בכל זאת ומדווחים', 'מבקשים מהנמען לחתום שהוא מאשר', 'לא מוסרים וחוזרים למשרד לבירור', 'מתקשרים לבית המשפט', 3, 'אסור למסור מסמך לאדם שזהותו אינה תואמת את שם הנמען. יש לחזור למשרד.'),
            (cid, 5, 'לאחר מסירה מוצלחת, מה השלב הבא?', 'לשלוח צילום ב-WhatsApp לעורך הדין', 'לחזור למשרד עם טופס אישור חתום', 'לסגור את המשימה באפליקציה בלבד', 'לא נדרש שום פעולה נוספת', 2, 'המסירה אינה שלמה עד שהאישור החתום מוחזר פיזית למשרד המזמין.')
        ]
        cursor.executemany("INSERT OR IGNORE INTO academy_protocol_quiz_questions (course_id, order_index, question_text, option_1, option_2, option_3, option_4, correct_option, explanation) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", questions)

    # --- Course 2: legal-court-summons content ---
    cid = course_map.get('legal-court-summons')
    if cid:
        lessons = [
            (cid, 1, 'זימון לדיון — תיאוריה', '## זימון לדיון\n\nזימון לדיון הוא צו מטעם בית המשפט המורה לאדם להתייצב לדיון במועד שנקבע.\n\n### הבדל מכתב תביעה\nבעוד שכתב תביעה מודיע על פתיחת הליך, זימון לדיון מחייב נוכחות פיזית במועד ספציפי.', 'theory'),
            (cid, 2, 'הבסיס החוקי — חוק בתי המשפט', '## הבסיס החוקי\n\nלפי סעיף 75 לחוק בתי המשפט, אי-נוכחות לאחר זימון תקין עלולה להוביל לביזיון בית המשפט או למתן פסק דין בהעדר.', 'legal'),
            (cid, 3, 'ביצוע מעשי', '## הנחיות למסירה\n\nודא שהנמען מבין את חשיבות התאריך המופיע בזימון. מסירה תקינה מבטיחה שבית המשפט יוכל לקיים את הדיון כסדרו.', 'practical')
        ]
        cursor.executemany("INSERT OR IGNORE INTO academy_protocol_lessons (course_id, order_index, title, content, lesson_type) VALUES (?, ?, ?, ?, ?)", lessons)

        questions = [
            (cid, 1, 'מהו ההבדל המרכזי בין זימון לדיון לכתב תביעה?', 'אין הבדל', 'זימון מחייב התייצבות במועד ספציפי', 'כתב תביעה מחייב התייצבות מיידית', 'זימון נמסר רק בדואר', 2, 'זימון לדיון מורה לאדם להופיע בבית המשפט בתאריך ושעה מסוימים.'),
            (cid, 2, 'מה עלול לקרות אם הנמען לא מופיע לדיון לאחר קבלת זימון תקין?', 'לא קורה כלום', 'הדיון מבוטל אוטומטית', 'ביזיון בית המשפט או מתן פסק דין בהעדר', 'קנס כספי קטן ללא משמעות', 3, 'אי-התייצבות לאחר זימון כדין היא עבירה חמורה שעלולה להוביל לסעדים משפטיים כנגד הנמען.'),
            (cid, 3, 'כמה ניסיונות מסירה נדרשים בדרך כלל לפני פנייה לבית המשפט לביצוע "תחליף המצאה"?', '1', '2', '3', '5', 3, 'לפי הנוהל, נדרשים 3 ניסיונות מסירה במועדים שונים לפני שניתן לקבוע שהנמען מתחמק.'),
            (cid, 4, 'מה חייב לכלול טופס אישור מסירת הזימון?', 'שם השליח בלבד', 'חתימת הנמען ואימות פרטי תעודת זהות', 'צילום של הבית בלבד', 'תאריך בלבד', 2, 'אימות זהות הוא קריטי בזימון לדיון כדי להוכיח שהאדם הנכון קיבל את ההודעה.'),
            (cid, 5, 'האם ניתן למסור זימון לדיון לבן זוג של הנמען?', 'כן, תמיד', 'רק אם בית המשפט אישר זאת במפורש', 'לא, לעולם לא', 'רק אם הם גרים באותו בית', 2, 'ככלל נדרשת מסירה אישית, אלא אם התקבל אישור למסירה בדרך אחרת (תחליף המצאה).', )
        ]
        cursor.executemany("INSERT OR IGNORE INTO academy_protocol_quiz_questions (course_id, order_index, question_text, option_1, option_2, option_3, option_4, correct_option, explanation) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", questions)

    # --- Course 3: legal-enforcement-warning content ---
    cid = course_map.get('legal-enforcement-warning')
    if cid:
        lessons = [
            (cid, 1, 'אזהרת הוצאה לפועל — מבוא', '## אזהרת הוצאה לפועל\n\nזהו המסמך הפותח את הליכי הגבייה המבצעיים כנגד חייב.\n\n### רגישות משפטית\nזהו הפרוטוקול הרגיש ביותר. טעות במסירה עלולה להוביל לביטול כל הליכי העיקול.', 'theory'),
            (cid, 2, 'הבסיס החוקי — חוק ההוצאה לפועל', '## חוק ההוצאה לפועל\n\nלפי סעיפים 7-10 לחוק, חייב חייב לקבל אזהרה לפני שננקטים נגדו הליכים.', 'legal'),
            (cid, 3, 'פרוטוקול הדבקה (פרוטוקול D)', '## הנחיות להדבקה\n\nלאחר 3 ניסיונות כושלים בשעות שונות, ניתן להדביק את האזהרה על דלת הבית, בתנאי שיש תיעוד ויזואלי ברור.', 'practical')
        ]
        cursor.executemany("INSERT OR IGNORE INTO academy_protocol_lessons (course_id, order_index, title, content, lesson_type) VALUES (?, ?, ?, ?, ?)", lessons)

        questions = [
            (cid, 1, 'כמה ניסיונות מסירה חוקיים נדרשים עבור אזהרת הוצאה לפועל לפני ביצוע הדבקה?', '1', '2', '3', '4', 3, 'חוק ההוצאה לפועל דורש 3 ניסיונות מסירה שלמים במועדים שונים.'),
            (cid, 2, 'מה הפעולה הנדרשת לאחר שבוצעו 3 ניסיונות מסירה כושלים?', 'להחזיר את התיק', 'להתקשר לחייב', 'הדבקה על דלת המגורים', 'להשאיר אצל שכן', 3, 'פרוטוקול D מאפשר הדבקה לאחר מיצוי 3 ניסיונות תקינים.'),
            (cid, 3, 'מה חייב לכלול תצהיר המוסר לאחר ביצוע הדבקה?', 'רק את שעת ההדבקה', 'תיאור מפורט של 3 הניסיונות הקודמים וצילום הדלת', 'רק את הכתובת', 'שום דבר מיוחד', 2, 'תצהיר הדבקה אינו תקף ללא הוכחת ניסיונות קודמים ותיאור הנסיבות.'),
            (cid, 4, 'האם ניתן לדלג על ניסיון מסירה אם ברור שהחייב מתחמק?', 'כן', 'לא, החוק מחייב 3 ניסיונות מתועדים', 'רק באישור המעסיק', 'רק אם יש שומר בבניין', 2, 'החוק אינו מאפשר קיצורי דרך — חובה לתעד 3 ניסיונות פיזיים.'),
            (cid, 5, 'מה המשמעות המשפטית של "הדבקה על הדלת"?', 'המסירה לא תקפה', 'החייב נחשב כמי שקיבל את האזהרה כדין', 'החייב חייב לחתום מאוחר יותר', 'זה רק שלב ביניים חסר משמעות', 2, 'הדבקה תקינה (לפי כל הכללים) מהווה המצאה כדין ומאפשרת המשך הליכים.')
        ]
        cursor.executemany("INSERT OR IGNORE INTO academy_protocol_quiz_questions (course_id, order_index, question_text, option_1, option_2, option_3, option_4, correct_option, explanation) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", questions)

    conn.commit()
    conn.close()
    print("Seeding complete!")
    cursor.executemany("""
        INSERT OR IGNORE INTO academy_protocol_courses 
        (protocol_slug, title, description, estimated_minutes, passing_score, required_level)
        VALUES (?, ?, ?, ?, ?, ?)
    """, courses)

    conn.commit()
    conn.close()
    print("Seeding complete!")

if __name__ == "__main__":
    run_migrations()
