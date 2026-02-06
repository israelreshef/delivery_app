"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Home, ArrowRight, Package, AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";

export default function NotFound() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center p-4">
            <Card className="max-w-2xl w-full p-8 md:p-12 shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
                <div className="text-center space-y-6">
                    {/* Animated Icon */}
                    <div className="relative inline-block">
                        <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
                        <div className="relative bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-full inline-block">
                            <Package className="h-16 w-16 text-white animate-bounce" />
                        </div>
                    </div>

                    {/* Error Code */}
                    <div className="space-y-2">
                        <h1 className="text-8xl md:text-9xl font-black bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 bg-clip-text text-transparent">
                            404
                        </h1>
                        <div className="flex items-center justify-center gap-2 text-slate-600">
                            <AlertTriangle className="h-5 w-5" />
                            <p className="text-lg font-medium">הדף לא נמצא</p>
                        </div>
                    </div>

                    {/* Message */}
                    <div className="space-y-3 max-w-md mx-auto">
                        <p className="text-slate-600 text-lg leading-relaxed">
                            המשלוח שחיפשת נעלם בדרך... 📦
                        </p>
                        <p className="text-slate-500 text-sm">
                            הדף שניסית להגיע אליו אינו קיים או הועבר למיקום אחר.
                        </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                        <Link href="/">
                            <Button
                                size="lg"
                                className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 shadow-lg hover:shadow-xl transition-all duration-300 group"
                            >
                                <Home className="h-5 w-5 ml-2 group-hover:scale-110 transition-transform" />
                                חזרה לדף הבית
                            </Button>
                        </Link>

                        <Link href="/tracking">
                            <Button
                                size="lg"
                                variant="outline"
                                className="w-full sm:w-auto border-2 border-blue-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-300 group"
                            >
                                מעקב אחר משלוח
                                <ArrowRight className="h-5 w-5 mr-2 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </Link>
                    </div>

                    {/* Helpful Links */}
                    <div className="pt-8 border-t border-slate-200">
                        <p className="text-sm text-slate-500 mb-3">אולי תרצה לנסות:</p>
                        <div className="flex flex-wrap gap-2 justify-center">
                            <Link href="/admin/dashboard">
                                <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                    ממשק ניהול
                                </Button>
                            </Link>
                            <Link href="/customer/orders">
                                <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                    ההזמנות שלי
                                </Button>
                            </Link>
                            <Link href="/courier/dashboard">
                                <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                    ממשק שליחים
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
}
