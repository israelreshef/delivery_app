import { ArrowLeft } from "lucide-react";

const steps = [
    {
        num: "01",
        title: "הזמן משלוח",
        desc: "הזן כתובות ופרטי חבילה באתר או באפליקציה בתוך פחות דקה."
    },
    {
        num: "02",
        title: "איתור שליח",
        desc: "המערכת מאתרת מיד את השליח הקרוב ביותר ושולחת אליו את המשימה."
    },
    {
        num: "03",
        title: "איסוף ומעקב",
        desc: "השליח אוסף את החבילה. אתה מקבל לינק למעקב בזמן אמת על המפה."
    },
    {
        num: "04",
        title: "מסירה ואישור",
        desc: "החבילה נמסרת ליעד. מקבלים אישור מסירה עם תמונה וחתימה."
    }
];

export function HowItWorks() {
    return (
        <section id="how-it-works" className="py-24 bg-white">
            <div className="container px-4 md:px-6 mx-auto">
                <div className="text-center mb-20">
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                        איך זה עובד?
                    </h2>
                    <p className="mt-4 text-lg text-slate-600">
                        תהליך פשוט, שקוף ומהיר ב-4 שלבים.
                    </p>
                </div>

                <div className="relative grid grid-cols-1 md:grid-cols-4 gap-8">
                    {/* Connector Line (Desktop) */}
                    <div className="hidden md:block absolute top-12 left-0 w-full h-0.5 bg-slate-100 z-0"></div>

                    {steps.map((step, index) => (
                        <div key={index} className="relative z-10 flex flex-col items-center text-center group">
                            <div className="w-24 h-24 bg-white border-4 border-slate-50 flex items-center justify-center rounded-full shadow-lg mb-6 group-hover:border-blue-100 group-hover:scale-110 transition-all duration-300">
                                <span className="text-3xl font-black text-slate-200 group-hover:text-blue-600 transition-colors">
                                    {step.num}
                                </span>
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">{step.title}</h3>
                            <p className="text-slate-500 text-sm max-w-[200px]">
                                {step.desc}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
