import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Code, Zap, Shield } from "lucide-react";
import Link from "next/link";

export const metadata = {
    title: "API שירותי משלוחים | Tzir",
    description: "התממשקות מהירה למערכת ציר עבור עסקים וחנויות איקומרס.",
};

export default function ApiPage() {
    return (
        <main className="min-h-screen bg-slate-50 flex flex-col">
            <Header />

            <div className="flex-grow pt-32 pb-24">
                <div className="container mx-auto px-4 max-w-5xl">

                    <div className="text-center mb-16">
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 mb-6 tracking-tight">
                            Tzir <span className="text-brand">API</span>
                        </h1>
                        <p className="text-xl text-slate-600 max-w-2xl mx-auto">
                            חברו את החנות המקוונת שלכם או את מערכת ניהול ההזמנות ישירות למערך השליחים המתקדם של ציר.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 mb-16">
                        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-all">
                            <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center mb-6 text-brand">
                                <Zap className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3">אינטגרציה מהירה</h3>
                            <p className="text-slate-600">
                                הקמת הזמנה, קבלת הצעת מחיר, פנייה לשליח ומעקב בזמן אמת, הכל בשניות ספורות דרך REST API מתקדם.
                            </p>
                        </div>

                        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-all">
                            <div className="w-12 h-12 bg-navy-100 rounded-2xl flex items-center justify-center mb-6 text-navy-800">
                                <Code className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3">תיעוד מקיף</h3>
                            <p className="text-slate-600">
                                קוד מקור לדוגמה, ספריות (SDK) מוכנות ל-Node.js ו-Python, ותיעוד Swagger פתוח לכולם.
                            </p>
                        </div>

                        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-all">
                            <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center mb-6 text-green-600">
                                <Shield className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3">אבטחה מקסימלית</h3>
                            <p className="text-slate-600">
                                הזדהות מאובטחת באמצעות מפתחות API תואמי OAuth2, תמיכה ב-Webhooks מאובטחים לחיווי סטטוסים.
                            </p>
                        </div>
                    </div>

                    <div className="bg-navy-950 rounded-3xl p-8 md:p-12 text-center text-white">
                        <h2 className="text-3xl font-bold mb-4">מוכנים להתחיל לחבר?</h2>
                        <p className="text-slate-300 mb-8 max-w-xl mx-auto">
                            כלי המפתחים נמצא בהכנה אחרונה וישוחרר בקרוב. צרו איתנו קשר עכשיו לקבלת גישת בטא (Early Access) למערכת ה-API.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Button asChild size="lg" className="bg-brand hover:bg-brand/90 text-navy-950 font-bold px-8">
                                <Link href="/contact">
                                    בואו נדבר
                                    <ArrowLeft className="w-5 h-5 mr-2" />
                                </Link>
                            </Button>
                        </div>
                    </div>

                </div>
            </div>

            <Footer />
        </main>
    );
}
