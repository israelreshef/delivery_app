"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User, Building2, Truck } from "lucide-react";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Testimonials } from "@/components/landing/Testimonials";
import { Footer } from "@/components/landing/Footer";

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col" dir="rtl">
            {/* Transparent Header Overlay */}
            <header className="fixed top-0 left-0 right-0 z-50 p-6 flex justify-between items-center max-w-7xl mx-auto w-full backdrop-blur-sm">
                <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-500/30">T</div>
                    <span className="text-2xl font-bold tracking-tighter text-white">TZIR</span>
                </div>
                <div className="space-x-4 space-x-reverse">
                    <Link href="/login/customer">
                        <Button variant="ghost" className="text-slate-200 hover:text-white hover:bg-white/10">התחברות</Button>
                    </Link>
                    <Link href="/register">
                        <Button className="font-semibold bg-white text-blue-600 hover:bg-blue-50">הרשמה ללקוחות</Button>
                    </Link>
                </div>
            </header>

            <main className="flex-1">
                <Hero />

                {/* Login Selection Section - Keeping it accessible */}
                <section className="relative z-20 -mt-24 pb-20 px-4">
                    <div className="container mx-auto">
                        <div className="grid md:grid-cols-3 gap-6 w-full max-w-5xl mx-auto">
                            {/* Customer Card */}
                            <Link href="/login/customer" className="group">
                                <div className="h-full bg-white p-8 rounded-2xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col items-center text-center space-y-4 border border-slate-100">
                                    <div className="p-4 bg-blue-50 rounded-2xl group-hover:bg-blue-100 transition-colors">
                                        <User className="w-8 h-8 text-blue-600" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900">אני לקוח</h3>
                                    <p className="text-gray-500 text-sm">הזמן משלוח, עקוב אחרי חבילות ונהל את ההיסטוריה שלך.</p>
                                    <Button variant="outline" className="w-full mt-auto group-hover:bg-blue-600 group-hover:text-white transition-colors border-blue-200 text-blue-700">
                                        כניסת לקוחות <ArrowLeft className="mr-2 h-4 w-4" />
                                    </Button>
                                </div>
                            </Link>

                            {/* Business/Courier Card */}
                            <Link href="/login/courier" className="group">
                                <div className="h-full bg-white p-8 rounded-2xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col items-center text-center space-y-4 border border-slate-100">
                                    <div className="p-4 bg-orange-50 rounded-2xl group-hover:bg-orange-100 transition-colors">
                                        <Truck className="w-8 h-8 text-orange-600" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900">אני שליח</h3>
                                    <p className="text-gray-500 text-sm">קבל משימות, עדכן סטטוסים ונהל את העבודה שלך בשטח.</p>
                                    <Button variant="outline" className="w-full mt-auto group-hover:bg-orange-600 group-hover:text-white transition-colors border-orange-200 text-orange-700">
                                        כניסת שליחים <ArrowLeft className="mr-2 h-4 w-4" />
                                    </Button>
                                </div>
                            </Link>

                            {/* Admin Card */}
                            <Link href="/login/admin" className="group">
                                <div className="h-full bg-white p-8 rounded-2xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col items-center text-center space-y-4 border border-slate-100">
                                    <div className="p-4 bg-gray-50 rounded-2xl group-hover:bg-gray-100 transition-colors">
                                        <Building2 className="w-8 h-8 text-gray-600" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900">מנהל מערכת</h3>
                                    <p className="text-gray-500 text-sm">גישה ללוח הבקרה הראשי לניהול הפלטפורמה.</p>
                                    <Button variant="outline" className="w-full mt-auto group-hover:bg-gray-800 group-hover:text-white transition-colors border-gray-200 text-gray-700">
                                        כניסת ניהול <ArrowLeft className="mr-2 h-4 w-4" />
                                    </Button>
                                </div>
                            </Link>
                        </div>
                    </div>
                </section>

                <Features />
                <HowItWorks />
                <Testimonials />
            </main>

            <Footer />
        </div>
    );
}
