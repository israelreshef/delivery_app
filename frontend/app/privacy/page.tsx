import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";

export const metadata = {
    title: "מדיניות פרטיות | Tzir",
    description: "מדיניות הפרטיות לגבי כיצד אנו אוספים ושומרים מידע במערכת ציר.",
};

export default function PrivacyPage() {
    return (
        <main className="min-h-screen bg-slate-50 flex flex-col">
            <Header />

            <div className="flex-grow pt-32 pb-24">
                <div className="container mx-auto px-4 max-w-4xl">
                    <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-slate-100">
                        <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-6">מדיניות פרטיות</h1>
                        <p className="text-slate-500 mb-12">עודכן לאחרונה: 6 במרץ 2026</p>

                        <div className="prose prose-slate prose-lg max-w-none rtl">
                            <h2 className="text-2xl font-bold text-slate-800 mb-4 mt-8">איסוף ושימוש במידע מיקום</h2>
                            <p className="mb-6 text-slate-600">
                                כדי לספק שירותי משלוחים מהירים ויעילים, האפליקציה של <strong>Tzir (ציר)</strong> אוספת נתוני מיקום בזמן אמת של השליחים. מידע זה (כולל מיקום ברקע - Background Location) משמש אך ורק כדי לאפשר הקצאה אופטימלית של משלוחים הקרובים אליך ולשקף ללקוחות הקצה את סטטוס ההגעה של ההזמנה שלהם.
                                מידע המיקום לא יימכר לאף גורם צד-שלישי.
                            </p>

                            <h2 className="text-2xl font-bold text-slate-800 mb-4 mt-8">איזה מידע אנחנו שומרים?</h2>
                            <p className="mb-6 text-slate-600">
                                בנוסף למיקום, המערכת שומרת פרטי התקשרות בסיסיים של לקוחות קצה ושליחים (שם, טלפון, כתובות משלוח) לצורך תפעול תקין של המערכת. העסקאות הפיננסיות מנוהלות במערכת סליקה מאובטחת וחיצונית (SmartBee), ופרטי האשראי שלכם לעולם אינם נשמרים בשרתי ציר.
                            </p>

                            <h2 className="text-2xl font-bold text-slate-800 mb-4 mt-8">שמירה על אבטחת מידע</h2>
                            <p className="mb-6 text-slate-600">
                                אנו נוקטים באמצעים טכנולוגיים מהשורה הראשונה כדי להגן על המידע האישי שלכם, תוך שימוש בפרוטוקולי הצפנה (HTTPS) ותהליכי אותנטיקציה קפדניים (JWT). עם זאת, חשוב לזכור שאין מערכת המאובטחת באופן מוחלט מפני חדירות סייבר.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <Footer />
        </main>
    );
}
