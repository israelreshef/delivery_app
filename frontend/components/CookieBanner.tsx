"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Cookie } from "lucide-react";
import { api } from "@/lib/api";

export function CookieBanner() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Check local storage on mount
        const hasConsented = localStorage.getItem("tzir_privacy_consent");
        if (!hasConsented) {
            // Small delay so it animates in elegantly
            const timer = setTimeout(() => setIsVisible(true), 1500);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleAccept = async () => {
        localStorage.setItem("tzir_privacy_consent", "true");
        setIsVisible(false);

        try {
            // Attempt to sync with backend if user is logged in
            // Fallbacks gracefully if there's no active session
            await api.post('/privacy/consent');
        } catch (e) {
            // Silent catch - we only care they consented locally at least
            console.log("Consent recorded locally. Not logged in to sync server-side.");
        }
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-8 md:w-[450px] bg-slate-900 border border-slate-700 shadow-2xl rounded-2xl p-5 z-[100] animate-in fade-in slide-in-from-bottom-5 duration-500" dir="rtl">
            <div className="flex items-start justify-between gap-4">
                <div className="bg-brand/20 p-2 rounded-full shrink-0">
                    <Cookie className="h-6 w-6 text-brand" />
                </div>

                <div className="flex-1">
                    <h3 className="text-white font-semibold text-base mb-1">הסכמה לתנאי שימוש ופרטיות</h3>
                    <p className="text-slate-400 text-sm leading-relaxed mb-4">
                        אנחנו משתמשים בעוגיות (Cookies) על מנת להבטיח לך חווית שימוש מיטבית
                        ולשמור נתונים מסוימים עבור אזור ניהול המערכת. המשך הגלישה מהווה הסכמה
                        ל<a href="#" className="text-brand hover:underline">תנאי השימוש ומדיניות הפרטיות</a> שלנו.
                    </p>

                    <div className="flex gap-3">
                        <Button
                            className="bg-brand hover:bg-brand-dark text-white rounded-xl text-sm px-6"
                            onClick={handleAccept}
                        >
                            הבנתי, אני מאשר
                        </Button>
                    </div>
                </div>

                <button
                    onClick={() => setIsVisible(false)}
                    className="text-slate-500 hover:text-white transition-colors p-1"
                    title="סגור"
                    aria-label="סגור חלונית הסכמה"
                >
                    <X className="h-5 w-5" />
                </button>
            </div>
        </div>
    );
}
