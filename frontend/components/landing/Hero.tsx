import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Truck } from "lucide-react";

export function Hero() {
    return (
        <section className="relative overflow-hidden bg-slate-900 pt-16 pb-32 md:pt-32 md:pb-48">
            {/* Background blobs */}
            <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 w-64 h-64 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
            <div className="absolute top-0 left-0 -translate-y-12 -translate-x-12 w-64 h-64 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>

            <div className="container px-4 md:px-6 mx-auto relative z-10">
                <div className="flex flex-col items-center text-center space-y-8">
                    <div className="inline-flex items-center rounded-full border border-slate-700 bg-slate-800/50 px-3 py-1 text-sm text-slate-300 backdrop-blur-xl">
                        <span className="flex h-2 w-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
                        מערכת המשלוחים המתקדמת בישראל
                    </div>

                    <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-6xl md:text-7xl lg:text-8xl max-w-4xl leading-[1.1]">
                        משלוחים חכמים <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                            בלחיצת כפתור
                        </span>
                    </h1>

                    <p className="max-w-[42rem] leading-normal text-slate-400 sm:text-xl sm:leading-8">
                        הפלטפורמה שמחברת בין עסקים לשליחים בזמן אמת.
                        ניהול צי, מעקב LIVE, ותשלום אוטומטי - הכל במקום אחד.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                        <Link href="/register">
                            <Button size="lg" className="w-full sm:w-auto text-lg px-8 py-6 bg-blue-600 hover:bg-blue-700 shadow-[0_0_30px_-10px_rgba(37,99,235,0.5)]">
                                התחל עכשיו בחינם
                                <ArrowLeft className="mr-2 h-5 w-5" />
                            </Button>
                        </Link>
                        <Link href="#how-it-works">
                            <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg px-8 py-6 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white">
                                איך זה עובד?
                            </Button>
                        </Link>
                    </div>

                    <div className="pt-8 flex items-center justify-center gap-8 text-slate-500 text-sm">
                        <div className="flex items-center gap-2">
                            <Truck className="w-4 h-4" />
                            <span>פריסה ארצית</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            <span>מעקב בזמן אמת</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            <span>ביטוח מלא</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
