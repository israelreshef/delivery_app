"use client";

import Link from "next/link";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ForgotPasswordPage() {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col" dir="rtl">
            <div className="bg-navy-950">
                <Header />
            </div>

            <main className="flex-1 flex flex-col items-center justify-center p-4">
                <div className="bg-white p-8 md:p-10 rounded-2xl shadow-xl border border-slate-100 max-w-md w-full text-center">
                    <h1 className="text-2xl font-bold text-navy-950 mb-2">איפוס סיסמה</h1>
                    <p className="text-slate-500 mb-8 text-sm">
                        הכנס את כתובת הדוא"ל שאיתה נרשמת ונשלח אליך קישור לאיפוס הסיסמה.
                    </p>

                    <form className="space-y-4 text-right" onSubmit={(e) => e.preventDefault()}>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-navy-900">דואר אלקטרוני</label>
                            <Input type="email" placeholder="example@tzir.com" className="h-12" />
                        </div>
                        <Button className="w-full h-12 bg-brand hover:bg-brand-dark text-navy-950 font-bold transition-all shadow-brand hover:shadow-brand-lg">
                            שלח קישור לאיפוס
                        </Button>
                    </form>

                    <div className="mt-6 text-sm">
                        <Link href="/login" className="text-brand hover:underline font-medium">
                            חזרה להתחברות
                        </Link>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
