import { Truck, Smartphone, Shield, Clock, Map, CreditCard } from "lucide-react";

const features = [
    {
        icon: Clock,
        title: "מהירות שיא",
        description: "אלגוריתם חכם מאתר את השליח הקרוב ביותר אליך לביצוע מיידי."
    },
    {
        icon: Map,
        title: "מעקב בזמן אמת",
        description: "צפה במיקום השליח על המפה מרגע האיסוף ועד למסירה ביעד."
    },
    {
        icon: Shield,
        title: "אחריות וביטוח",
        description: "כל המשלוחים מבוטחים באופן מלא. שקט נפשי מהרגע הראשון."
    },
    {
        icon: Smartphone,
        title: "זמינות דיגיטלית",
        description: "הזמנה ומעקב מכל מכשיר - מחשב, טאבלט או נייד."
    },
    {
        icon: Truck,
        title: "צי מגוון",
        description: "קטנועים, רכבים ומשאיות - מותאם לכל גודל חבילה."
    },
    {
        icon: CreditCard,
        title: "תשלום נוח",
        description: "שלם בקליק באמצעות אשראי, Bit או Apple Pay."
    }
];

export function Features() {
    return (
        <section id="features" className="py-24 bg-slate-50">
            <div className="container px-4 md:px-6 mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                        למה לבחור ב-TZIR?
                    </h2>
                    <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
                        מערכת המשלוחים שלנו תוכננה לתת מענה מושלם לעסקים ופרטיים כאחד.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {features.map((feature, index) => (
                        <div key={index} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-6 text-blue-600">
                                <feature.icon className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                            <p className="text-slate-600 leading-relaxed">
                                {feature.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
