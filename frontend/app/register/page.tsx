"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Truck, Building2, ArrowLeft, ArrowRight } from "lucide-react";

export default function RegisterPage() {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 relative overflow-hidden" dir="rtl">

            {/* Background Decorations */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-100/50 rounded-full blur-3xl -mr-32 -mt-32 z-0"></div>
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-100/50 rounded-full blur-3xl -ml-32 -mb-32 z-0"></div>

            <div className="max-w-5xl w-full space-y-12 relative z-10">
                <div className="text-center space-y-4">
                    <div className="inline-block px-4 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold mb-2">
                        הצטרפו למהפכה
                    </div>
                    <h1 className="text-4xl font-extrabold tracking-tight lg:text-6xl text-slate-900 leading-tight">
                        הצטרפו לקהילת <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">TZIR</span>
                    </h1>
                    <p className="text-xl text-slate-500 max-w-2xl mx-auto">
                        בחרו את המסלול המתאים לכם והתחילו לעבוד עם מערכת המשלוחים החכמה בישראל
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8 mt-8 px-4">
                    {/* Courier Card */}
                    <Link href="/register/courier" className="group">
                        <div className="h-full bg-white rounded-3xl shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 overflow-hidden border border-slate-100 flex flex-col">
                            <div className="h-2 bg-gradient-to-r from-orange-400 to-red-500"></div>
                            <div className="p-10 flex flex-col items-center text-center space-y-6 flex-1">
                                <div className="h-28 w-28 bg-orange-50 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                                    <Truck className="h-14 w-14 text-orange-500" />
                                </div>
                                <div>
                                    <h2 className="text-3xl font-bold text-slate-900 mb-2">אני שליח/ה</h2>
                                    <p className="text-slate-500 text-lg leading-relaxed">
                                        רוצים להרוויח כסף בזמן שלכם? הצטרפו לצי השליחים שלנו ותיהנו מגמישות מלאה, תשלום הוגן ואפליקציה מתקדמת.
                                    </p>
                                </div>
                                <Button className="w-full mt-auto h-12 text-lg bg-white text-orange-600 border-2 border-orange-100 hover:bg-orange-50 hover:border-orange-200 shadow-none hover:shadow-md transition-all group-hover:bg-orange-600 group-hover:text-white group-hover:border-transparent">
                                    להרשמה כשליח <ArrowLeft className="mr-2 h-5 w-5" />
                                </Button>
                            </div>
                        </div>
                    </Link>

                    {/* Customer Card */}
                    <Link href="/register/customer" className="group">
                        <div className="h-full bg-white rounded-3xl shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 overflow-hidden border border-slate-100 flex flex-col">
                            <div className="h-2 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
                            <div className="p-10 flex flex-col items-center text-center space-y-6 flex-1">
                                <div className="h-28 w-28 bg-blue-50 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                                    <Building2 className="h-14 w-14 text-blue-600" />
                                </div>
                                <div>
                                    <h2 className="text-3xl font-bold text-slate-900 mb-2">אני עסק / לקוח</h2>
                                    <p className="text-slate-500 text-lg leading-relaxed">
                                        צריכים פתרון שילוח מהיר ואמין? נהלו את המשלוחים שלכם בקלות, עקבו בזמן אמת וקבלו שירות VIP.
                                    </p>
                                </div>
                                <Button className="w-full mt-auto h-12 text-lg bg-white text-blue-600 border-2 border-blue-100 hover:bg-blue-50 hover:border-blue-200 shadow-none hover:shadow-md transition-all group-hover:bg-blue-600 group-hover:text-white group-hover:border-transparent">
                                    להרשמה כלקוח עסקי <ArrowLeft className="mr-2 h-5 w-5" />
                                </Button>
                            </div>
                        </div>
                    </Link>
                </div>

                <div className="text-center mt-12 pb-8">
                    <Link href="/login" className="inline-flex items-center text-slate-500 hover:text-blue-600 transition-colors font-medium">
                        כבר רשומים למערכת? התחברו כאן <ArrowLeft className="mr-1 h-4 w-4" />
                    </Link>
                </div>
            </div>

            <div className="absolute top-6 left-6 z-20">
                <Link href="/">
                    <Button variant="ghost" className="text-slate-500 hover:text-slate-900">
                        <ArrowRight className="ml-2 h-4 w-4" /> בחזרה לדף הבית
                    </Button>
                </Link>
            </div>
        </div>
    );
}
