"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Zap, Clock, Truck, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function PricingPage() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white" dir="rtl">
            {/* Hero Section */}
            <div className="bg-gradient-to-l from-blue-600 to-blue-800 text-white py-20">
                <div className="max-w-6xl mx-auto px-6 text-center">
                    <h1 className="text-5xl font-bold mb-4">מחירון שקוף ומשתלם</h1>
                    <p className="text-xl text-blue-100 mb-8">
                        3 מודלים של עבודה המותאמים לכל צורך
                    </p>
                    <p className="text-lg text-blue-200">
                        מינימום משלוח: <span className="font-bold text-2xl">₪50</span>
                    </p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-16">
                {/* Service Models Overview */}
                <div className="grid md:grid-cols-3 gap-6 mb-16">
                    <Card className="border-2 hover:border-blue-500 transition-all">
                        <CardHeader>
                            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                                <Clock className="w-6 h-6 text-green-600" />
                            </div>
                            <CardTitle>משלוחים מהיום להיום</CardTitle>
                            <CardDescription>המודל הכלכלי ביותר</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-slate-600">
                                מתאים למשלוחים שאינם דחופים. זמן אספקה: עד 24 שעות.
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-2 hover:border-purple-500 transition-all">
                        <CardHeader>
                            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                                <Truck className="w-6 h-6 text-purple-600" />
                            </div>
                            <CardTitle>משלוחי אספקה</CardTitle>
                            <CardDescription>מתאים לשליחת דואר בין סניפים</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-slate-600">
                                שירות קבוע שבועי לחברות עם מספר סניפים. תמחור לפי תדירות.
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-2 border-orange-500 hover:border-orange-600 transition-all bg-gradient-to-br from-orange-50 to-white">
                        <CardHeader>
                            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                                <Zap className="w-6 h-6 text-orange-600" />
                            </div>
                            <CardTitle className="flex items-center gap-2">
                                משלוחי אקספרס
                                <Badge variant="destructive">מהיר</Badge>
                            </CardTitle>
                            <CardDescription>ביצוע תוך 3 שעות</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-slate-600">
                                למשלוחים דחופים. אספקה מובטחת תוך 3 שעות מרגע ההזמנה.
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Pricing Tables */}
                <div className="space-y-12">
                    {/* Same Day Delivery */}
                    <div>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                <Clock className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <h2 className="text-3xl font-bold">משלוחים מהיום להיום</h2>
                                <p className="text-slate-600">תמחור בסיסי - המחיר הטוב ביותר</p>
                            </div>
                        </div>

                        <Card>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-slate-50">
                                            <tr>
                                                <th className="text-right p-4 font-semibold">טווח מרחק משלוח</th>
                                                <th className="text-right p-4 font-semibold">מחיר</th>
                                                <th className="text-right p-4 font-semibold">זמן אספקה</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            <tr className="hover:bg-slate-50">
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="outline">0-15 ק"מ</Badge>
                                                        <span className="text-sm text-slate-600">עד 15 קילומטר</span>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <span className="text-2xl font-bold text-green-600">₪55</span>
                                                </td>
                                                <td className="p-4 text-slate-600">עד 24 שעות</td>
                                            </tr>
                                            <tr className="hover:bg-slate-50">
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="outline">15-25 ק"מ</Badge>
                                                        <span className="text-sm text-slate-600">15-25 קילומטר</span>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <span className="text-2xl font-bold text-green-600">₪85</span>
                                                </td>
                                                <td className="p-4 text-slate-600">עד 24 שעות</td>
                                            </tr>
                                            <tr className="hover:bg-slate-50">
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="outline">25-35 ק"מ</Badge>
                                                        <span className="text-sm text-slate-600">25-35 קילומטר</span>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <span className="text-2xl font-bold text-green-600">₪115</span>
                                                </td>
                                                <td className="p-4 text-slate-600">עד 24 שעות</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Supply Deliveries */}
                    <div>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                <Truck className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                                <h2 className="text-3xl font-bold">משלוחי אספקה</h2>
                                <p className="text-slate-600">מתאים לשליחת דואר בין סניפי החברה</p>
                            </div>
                        </div>

                        <Card>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-slate-50">
                                            <tr>
                                                <th className="text-right p-4 font-semibold">מספר ימי אספקה שבועיים</th>
                                                <th className="text-right p-4 font-semibold">מחיר חודשי</th>
                                                <th className="text-right p-4 font-semibold">חיסכון</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            <tr className="hover:bg-slate-50">
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="outline">1 יום</Badge>
                                                        <span className="text-sm text-slate-600">אספקה פעם בשבוע</span>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <span className="text-2xl font-bold text-purple-600">₪200</span>
                                                    <span className="text-sm text-slate-500 mr-2">/חודש</span>
                                                </td>
                                                <td className="p-4 text-green-600 font-medium">חסכון של 20%</td>
                                            </tr>
                                            <tr className="hover:bg-slate-50">
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="outline">2 ימים</Badge>
                                                        <span className="text-sm text-slate-600">אספקה פעמיים בשבוע</span>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <span className="text-2xl font-bold text-purple-600">₪400</span>
                                                    <span className="text-sm text-slate-500 mr-2">/חודש</span>
                                                </td>
                                                <td className="p-4 text-green-600 font-medium">חסכון של 30%</td>
                                            </tr>
                                            <tr className="hover:bg-slate-50">
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="outline">3 ימים</Badge>
                                                        <span className="text-sm text-slate-600">אספקה 3 פעמים בשבוע</span>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <span className="text-2xl font-bold text-purple-600">₪600</span>
                                                    <span className="text-sm text-slate-500 mr-2">/חודש</span>
                                                </td>
                                                <td className="p-4 text-green-600 font-medium">חסכון של 35%</td>
                                            </tr>
                                            <tr className="hover:bg-slate-50">
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="outline">4 ימים</Badge>
                                                        <span className="text-sm text-slate-600">אספקה 4 פעמים בשבוע</span>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <span className="text-2xl font-bold text-purple-600">₪800</span>
                                                    <span className="text-sm text-slate-500 mr-2">/חודש</span>
                                                </td>
                                                <td className="p-4 text-green-600 font-medium">חסכון של 40%</td>
                                            </tr>
                                            <tr className="hover:bg-slate-50 bg-purple-50">
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2">
                                                        <Badge className="bg-purple-600">5 ימים</Badge>
                                                        <span className="text-sm font-medium">אספקה יומית</span>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <span className="text-2xl font-bold text-purple-600">₪1,000</span>
                                                    <span className="text-sm text-slate-500 mr-2">/חודש</span>
                                                </td>
                                                <td className="p-4 text-green-600 font-bold">חסכון של 45%</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Express Delivery */}
                    <div>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                                <Zap className="w-5 h-5 text-orange-600" />
                            </div>
                            <div>
                                <h2 className="text-3xl font-bold">משלוחי אקספרס</h2>
                                <p className="text-slate-600">ביצוע תוך 3 שעות - למשלוחים דחופים</p>
                            </div>
                        </div>

                        <Card className="border-2 border-orange-200">
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-orange-50">
                                            <tr>
                                                <th className="text-right p-4 font-semibold">טווח מרחק משלוח</th>
                                                <th className="text-right p-4 font-semibold">מחיר</th>
                                                <th className="text-right p-4 font-semibold">זמן אספקה</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            <tr className="hover:bg-orange-50">
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="outline" className="border-orange-300">0-15 ק"מ</Badge>
                                                        <span className="text-sm text-slate-600">עד 15 קילומטר</span>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <span className="text-2xl font-bold text-orange-600">₪82.5</span>
                                                    <span className="text-xs text-slate-500 mr-2">(+50%)</span>
                                                </td>
                                                <td className="p-4">
                                                    <Badge variant="destructive">תוך 3 שעות</Badge>
                                                </td>
                                            </tr>
                                            <tr className="hover:bg-orange-50">
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="outline" className="border-orange-300">15-25 ק"מ</Badge>
                                                        <span className="text-sm text-slate-600">15-25 קילומטר</span>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <span className="text-2xl font-bold text-orange-600">₪127.5</span>
                                                    <span className="text-xs text-slate-500 mr-2">(+50%)</span>
                                                </td>
                                                <td className="p-4">
                                                    <Badge variant="destructive">תוך 3 שעות</Badge>
                                                </td>
                                            </tr>
                                            <tr className="hover:bg-orange-50">
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="outline" className="border-orange-300">25-35 ק"מ</Badge>
                                                        <span className="text-sm text-slate-600">25-35 קילומטר</span>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <span className="text-2xl font-bold text-orange-600">₪172.5</span>
                                                    <span className="text-xs text-slate-500 mr-2">(+50%)</span>
                                                </td>
                                                <td className="p-4">
                                                    <Badge variant="destructive">תוך 3 שעות</Badge>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Additional Info */}
                <div className="mt-16 grid md:grid-cols-2 gap-6">
                    <Card className="bg-blue-50 border-blue-200">
                        <CardHeader>
                            <CardTitle>תנאים כלליים</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div className="flex items-start gap-2">
                                <Check className="w-5 h-5 text-blue-600 mt-0.5" />
                                <p className="text-sm">מינימום משלוח: ₪50 לכל סוגי המשלוחים</p>
                            </div>
                            <div className="flex items-start gap-2">
                                <Check className="w-5 h-5 text-blue-600 mt-0.5" />
                                <p className="text-sm">חישוב מרחק לפי קו אווירי בין נקודות</p>
                            </div>
                            <div className="flex items-start gap-2">
                                <Check className="w-5 h-5 text-blue-600 mt-0.5" />
                                <p className="text-sm">מחירים כולל מע"מ</p>
                            </div>
                            <div className="flex items-start gap-2">
                                <Check className="w-5 h-5 text-blue-600 mt-0.5" />
                                <p className="text-sm">ביטוח חבילה זמין בתוספת תשלום</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-green-50 border-green-200">
                        <CardHeader>
                            <CardTitle>הנחות לעסקים</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div className="flex items-start gap-2">
                                <Check className="w-5 h-5 text-green-600 mt-0.5" />
                                <p className="text-sm">הנחה של 10% מעל 50 משלוחים בחודש</p>
                            </div>
                            <div className="flex items-start gap-2">
                                <Check className="w-5 h-5 text-green-600 mt-0.5" />
                                <p className="text-sm">הנחה של 15% מעל 100 משלוחים בחודש</p>
                            </div>
                            <div className="flex items-start gap-2">
                                <Check className="w-5 h-5 text-green-600 mt-0.5" />
                                <p className="text-sm">תמחור מיוחד לחברות עם חוזה שנתי</p>
                            </div>
                            <div className="flex items-start gap-2">
                                <Check className="w-5 h-5 text-green-600 mt-0.5" />
                                <p className="text-sm">ייעוץ לוגיסטי ללא עלות</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* CTA */}
                <div className="mt-16 text-center">
                    <Card className="bg-gradient-to-l from-blue-600 to-blue-800 text-white border-0">
                        <CardContent className="py-12">
                            <h3 className="text-3xl font-bold mb-4">מוכנים להתחיל?</h3>
                            <p className="text-blue-100 mb-8 text-lg">
                                הצטרפו לאלפי עסקים שכבר חוסכים זמן וכסף עם TZIR
                            </p>
                            <div className="flex gap-4 justify-center">
                                <Link href="/orders/new">
                                    <Button size="lg" variant="secondary" className="gap-2">
                                        הזמן משלוח עכשיו
                                        <ArrowRight className="w-5 h-5" />
                                    </Button>
                                </Link>
                                <Link href="/contact">
                                    <Button size="lg" variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20">
                                        צור קשר לייעוץ
                                    </Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
