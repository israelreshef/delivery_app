"use client";

import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

// React-Leaflet must be dynamically imported with SSR disabled
const RouteBuilderMap = dynamic(
    () => import('./RouteBuilder'),
    {
        ssr: false,
        loading: () => (
            <div className="flex flex-col items-center justify-center h-[600px] w-full bg-slate-100 rounded-xl border border-dashed border-slate-300">
                <Loader2 className="h-12 w-12 text-brand animate-spin mb-4" />
                <p className="text-slate-500 font-medium">טוען מפת מסלולים...</p>
            </div>
        )
    }
);

export default function RouteOptimizationPage() {
    return (
        <div className="p-8 space-y-6 bg-slate-50 min-h-screen" dir="rtl">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">תכנון מסלולים חכם 🗺️</h1>
                    <p className="text-slate-500">תצוגה ויזואלית של הזמנות פתוחות ואופטימיזציית מסלולים לשליחים</p>
                </div>
            </header>

            <Card className="border-none shadow-md overflow-hidden">
                <CardHeader className="bg-white border-b border-slate-100">
                    <CardTitle className="text-xl">מפת אזורי חלוקה</CardTitle>
                    <CardDescription>
                        גרור תחנות, סמן אזורים, ושגר מסלולים אופטימליים ישירות לאפליקציית השליח
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <RouteBuilderMap />
                </CardContent>
            </Card>
        </div>
    );
}
