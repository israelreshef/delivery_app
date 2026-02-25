"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Package, Search, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function TrackingSearchPage() {
    const [trackingId, setTrackingId] = useState("");
    const router = useRouter();

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (trackingId.trim()) {
            router.push(`/tracking/${trackingId.trim()}`);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4" dir="rtl">
            <div className="w-full max-w-md space-y-8 text-center">
                {/* Icon */}
                <div className="mx-auto w-20 h-20 bg-brand/15 rounded-full flex items-center justify-center">
                    <Package className="w-10 h-10 text-brand" />
                </div>

                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900">מעקב משלוח</h1>
                    <p className="text-slate-500 mt-2">הזן מספר הזמנה כדי לעקוב אחרי המשלוח שלך</p>
                </div>

                <form onSubmit={handleSearch} className="space-y-4">
                    <div className="relative">
                        <Search className="absolute right-4 top-4 h-5 w-5 text-slate-400" />
                        <Input
                            type="text"
                            placeholder="לדוגמה: ORD-2026-001"
                            value={trackingId}
                            onChange={(e) => setTrackingId(e.target.value)}
                            className="pr-12 h-14 text-lg bg-white border-slate-200 rounded-xl text-center font-mono shadow-sm"
                            required
                        />
                    </div>

                    <Button
                        type="submit"
                        className="w-full h-14 text-lg font-bold bg-brand hover:bg-brand-dark shadow-lg rounded-xl"
                    >
                        <Search className="w-5 h-5 ml-2" />
                        עקוב אחרי המשלוח
                    </Button>
                </form>

                <div className="pt-4">
                    <Link href="/" className="text-sm text-slate-400 hover:text-slate-600 flex items-center justify-center gap-1 transition-colors">
                        <ArrowLeft className="w-4 h-4" /> חזרה לדף הבית
                    </Link>
                </div>
            </div>
        </div>
    );
}
