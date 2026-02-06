import { Star } from "lucide-react";

const testimonials = [
    {
        name: "דני כהן",
        role: "בעלי פיצרייה",
        content: "מאז שעברנו ל-TZIR זמן המשלוח הממוצע שלנו ירד ב-40%. הלקוחות מרוצים הרבה יותר וגם אנחנו.",
        rating: 5
    },
    {
        name: "שרה לוי",
        role: "לקוחה פרטית",
        content: "האפליקציה פשוט נוחה. אני רואה בדיוק איפה השליח נמצא בכל רגע, וזה נותן המון שקט נפשי.",
        rating: 5
    },
    {
        name: "רון אברהמי",
        role: "מנהל לוגיסטיקה",
        content: "פתרון מושלם לעסקים קטנים ובינוניים שלא רוצים להחזיק צי שליחים משלהם. מומלץ בחום!",
        rating: 4
    }
];

export function Testimonials() {
    return (
        <section className="py-24 bg-slate-50 border-t border-slate-200">
            <div className="container px-4 md:px-6 mx-auto">
                <h2 className="text-3xl font-bold text-center tracking-tight text-slate-900 mb-16 sm:text-4xl">
                    מה אומרים עלינו?
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {testimonials.map((item, i) => (
                        <div key={i} className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300">
                            <div className="flex gap-1 text-yellow-500 mb-4">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} className={`w-4 h-4 ${i < item.rating ? "fill-current" : "text-slate-200"}`} />
                                ))}
                            </div>
                            <p className="text-slate-700 italic mb-6 text-lg">"{item.content}"</p>
                            <div>
                                <div className="font-bold text-slate-900">{item.name}</div>
                                <div className="text-slate-500 text-sm">{item.role}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
