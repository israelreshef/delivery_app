import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";

export const metadata = {
    title: "תנאי שימוש | Tzir",
    description: "תנאי השימוש הרשמיים של מערכת ציר.",
};

export default function TermsPage() {
    return (
        <main className="min-h-screen bg-slate-50 flex flex-col">
            <Header />

            <div className="flex-grow pt-32 pb-24">
                <div className="container mx-auto px-4 max-w-4xl">
                    <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-slate-100">
                        <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-6">תנאי שימוש</h1>
                        <p className="text-slate-500 mb-12">עודכן לאחרונה: 6 במרץ 2026</p>

                        <div className="prose prose-slate prose-lg max-w-none rtl">
                            <h2 className="text-2xl font-bold text-slate-800 mb-4 mt-8">1. מבוא</h2>
                            <p className="mb-6 text-slate-600">
                                ברוכים הבאים ל-Tzir (ציר). תקנון זה מהווה הסכם משפטי מחייב בינך לבין מפעילת האתר והאפליקציה בכל הנוגע לשימוש בשירותי החברה. אנא קרא/י תנאים אלו בקפידה.
                            </p>

                            <h2 className="text-2xl font-bold text-slate-800 mb-4 mt-8">2. הרשמה וחשבון משתמש</h2>
                            <p className="mb-6 text-slate-600">
                                השימוש במערכת שלנו דורש יצירת חשבון מורשה. עליך לספק פרטים מדויקים ומלאים. המשתמש אחראי לשמור על סודיות סיסמתו ולוודא שלא יעשה בחשבונו שימוש על ידי גורם בלתי מורשה.
                            </p>

                            <h2 className="text-2xl font-bold text-slate-800 mb-4 mt-8">3. שירותי משלוחים ותמחור</h2>
                            <p className="mb-6 text-slate-600">
                                אנו מספקים פלטפורמה טכנולוגית לניהול מערכי שליחויות. עלויות המשלוח, זמן ההגעה ואפשרויות הניתוב כפופים לשינויים בהתאם לעומסים, זמינות שליחים ואלגוריתם הניתוב שלנו (Smart Routing). המחיר הסופי נקבע בהתאם למרחק נסיעה אמיתי ולא מרחק אווירי (אלא אם התבצעה שגיאה בממשק צד שלישי, במקרה זה נשתמש בהערכה הקרובה ביותר).
                            </p>

                            <h2 className="text-2xl font-bold text-slate-800 mb-4 mt-8">4. הגבלת אחריות</h2>
                            <p className="mb-6 text-slate-600">
                                החברה לא תהיה אחראית לכל נזק עקיף, תוצאתי או איבוד הכנסות שייגרם עקב שימוש, חוסר יכולת להשתמש או עיכוב בשירותי המערכת.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <Footer />
        </main>
    );
}
