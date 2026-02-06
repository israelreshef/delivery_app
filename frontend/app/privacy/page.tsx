import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'מדיניות פרטיות | TZIR',
    description: 'מדיניות הפרטיות ותנאי השימוש של מערכת השליחויות TZIR',
};

export default function PrivacyPage() {
    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl" dir="rtl">
            <h1 className="text-3xl font-bold mb-6 text-primary">מדיניות פרטיות ותנאי שימוש</h1>
            <p className="text-muted-foreground mb-8">עודכן לאחרונה: פברואר 2026</p>

            <div className="prose prose-blue max-w-none dark:prose-invert">
                <section className="mb-8">
                    <h2 className="text-xl font-bold mb-4">1. כְּלָלִי</h2>
                    <p>
                        ברוכים הבאים לאפליקציית TZIR ("האפליקציה"). השימוש באפליקציה ושירותיה מעיד על הסכמתך לתנאים אלה ולמדיניות הפרטיות שלנו.
                        המערכת מיועדת לחיבור בין עסקים, לקוחות ושליחים לצורך ביצוע משלוחים.
                    </p>
                </section>

                <section className="mb-8">
                    <h2 className="text-xl font-bold mb-4">2. איסוף מידע (Data Collection)</h2>
                    <p>אנו אוספים את סוגי המידע הבאים:</p>
                    <ul className="list-disc pr-6 space-y-2">
                        <li><strong>מידע אישי:</strong> שם, מספר טלפון, כתובת דוא"ל, וכתובות למשלוח.</li>
                        <li><strong>מידע פיננסי:</strong> היסטוריית תשלומים וחשבוניות (פרטי אשראי אינם נשמרים בשרתינו אלא אצל ספק הסליקה המאובטח).</li>
                        <li><strong>מידע טכני:</strong> סוג המכשיר, כתובת IP, וזמינות רשת.</li>
                    </ul>
                </section>

                <section className="mb-8">
                    <h2 className="text-xl font-bold mb-4">3. נתוני מיקום (Location Data)</h2>
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
                        <p className="font-semibold mb-2">עבור שליחים:</p>
                        <p>
                            האפליקציה אוספת נתוני מיקום <strong>גם כשהאפליקציה סגורה או אינה בשימוש</strong>, כדי לאפשר:
                        </p>
                        <ul className="list-disc pr-6 mt-2">
                            <li>הקצאת משלוחים יעילה על בסיס קרבה גיאוגרפית.</li>
                            <li>מעקב בזמן אמת עבור הלקוח הממתין למשלוח.</li>
                            <li>אימות מסירה (Proof of Delivery) במיקום המדויק.</li>
                        </ul>
                    </div>
                </section>

                <section className="mb-8">
                    <h2 className="text-xl font-bold mb-4">4. זכויותיך (GDPR & חוק הגנת הפרטיות)</h2>
                    <p>בהתאם לחוק הגנת הפרטיות, התשמ"א-1981 ותקנות ה-GDPR (במידה ורלוונטי), הנך זכאי/ת:</p>
                    <ul className="list-disc pr-6 space-y-2">
                        <li>לעיין במידע השמור עליך במאגרינו.</li>
                        <li>לבקש לתקן מידע שגוי או לא מעודכן.</li>
                        <li>לבקש למחוק את חשבונך ("הזכות להישכח"), בכפוף לחובות שמירת לוגים משפטיים.</li>
                    </ul>
                </section>

                <section className="mb-8">
                    <h2 className="text-xl font-bold mb-4">5. אבטחת מידע</h2>
                    <p>
                        אנו נוקטים באמצעי אבטחה מחמירים להגנה על המידע, לרבות הצפנה (Encryption) ופרוטוקולי אבטחה מתקדמים.
                        עם זאת, אין באפשרותנו להבטיח חסינות מוחלטת מפני גישה לא מורשית.
                    </p>
                </section>

                <section className="mb-8">
                    <h2 className="text-xl font-bold mb-4">6. יצירת קשר</h2>
                    <p>לכל שאלה או בקשה בנושא פרטיות, ניתן לפנות לקצין הגנת הפרטיות שלנו בכתובת: privacy@tzir.com</p>
                </section>
            </div>
        </div>
    );
}
