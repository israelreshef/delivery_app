"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";

export function Header() {
    const pathname = usePathname();
    const isTransparent = pathname === "/";

    return (
        <header className={`fixed top-0 left-0 right-0 z-50 p-6 flex justify-between items-center max-w-7xl mx-auto w-full backdrop-blur-sm ${isTransparent ? '' : 'bg-white/80 shadow-sm'}`}>
            <div className="flex items-center gap-2">
                <Link href="/" className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-500/30">T</div>
                    <span className={`text-2xl font-bold tracking-tighter ${isTransparent ? 'text-white' : 'text-slate-900'}`}>TZIR</span>
                </Link>
            </div>

            <nav className="hidden md:flex items-center gap-6">
                <Link href="/features" className={`text-sm font-medium hover:text-blue-500 transition-colors ${isTransparent ? 'text-slate-200' : 'text-slate-600'}`}>
                    פיצ'רים
                </Link>
                <Link href="/pricing" className={`text-sm font-medium hover:text-blue-500 transition-colors ${isTransparent ? 'text-slate-200' : 'text-slate-600'}`}>
                    מחירון
                </Link>
                <Link href="/blog" className={`text-sm font-medium hover:text-blue-500 transition-colors ${isTransparent ? 'text-slate-200' : 'text-slate-600'}`}>
                    בלוג
                </Link>
                <Link href="/contact" className={`text-sm font-medium hover:text-blue-500 transition-colors ${isTransparent ? 'text-slate-200' : 'text-slate-600'}`}>
                    צור קשר
                </Link>
            </nav>

            <div className="space-x-4 space-x-reverse flex items-center">
                <Link href="/login/customer">
                    <Button variant="ghost" className={`${isTransparent ? 'text-slate-200 hover:text-white hover:bg-white/10' : 'text-slate-600 hover:bg-slate-100'}`}>
                        התחברות
                    </Button>
                </Link>
                <Link href="/register">
                    <Button className={`font-semibold ${isTransparent ? 'bg-white text-blue-600 hover:bg-blue-50' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                        הרשמה
                    </Button>
                </Link>
            </div>
        </header>
    );
}
