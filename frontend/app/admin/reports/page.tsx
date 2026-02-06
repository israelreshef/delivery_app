"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileDown, Calendar as CalendarIcon, TrendingUp, Package, Users } from "lucide-react";
import { toast } from "sonner";
import { format, subDays } from "date-fns";

export default function ReportsPage() {
    // Default: Last 30 days
    const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

    const [loading, setLoading] = useState(false);
    const [summary, setSummary] = useState<any>(null);

    const fetchReport = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/reports/revenue?start_date=${startDate}&end_date=${endDate}`);
            setSummary(res.data);
        } catch (error) {
            toast.error("שגיאה בטעינת דוח");
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (type: 'orders' | 'revenue') => {
        try {
            const res = await api.get(`/reports/export?type=${type}&start_date=${startDate}&end_date=${endDate}`, {
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = `report_${type}_${startDate}_${endDate}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            toast.success("דוח הורד בהצלחה");
        } catch (error) {
            toast.error("תקלה בתקשורת");
        }
    };

    return (
        <div className="p-8 space-y-8 bg-slate-50 min-h-screen" dir="rtl">
            <header>
                <h1 className="text-3xl font-bold text-slate-900">דוחות ונתונים</h1>
                <p className="text-slate-500">הפקת דוחות כספיים ותפעוליים וייצוא לאקסל</p>
            </header>

            <Card className="border-none shadow-md">
                <CardHeader>
                    <CardTitle>סינון טווח תאריכים</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="grid gap-2">
                            <Label>תאריך התחלה</Label>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>תאריך סיום</Label>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                        <Button onClick={fetchReport} disabled={loading} className="gap-2">
                            <CalendarIcon className="w-4 h-4" />
                            הפק דוח
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {summary && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="bg-blue-50 border-blue-100">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg font-medium text-blue-900 flex items-center gap-2">
                                <TrendingUp className="w-5 h-5" />
                                סה"כ הכנסות
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-blue-700">₪{summary.total_revenue?.toLocaleString()}</div>
                            <p className="text-sm text-blue-600 mt-1">לתקופה הנבחרת</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-green-50 border-green-100">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg font-medium text-green-900 flex items-center gap-2">
                                <Package className="w-5 h-5" />
                                נתוני יצוא
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col gap-2">
                                <Button variant="outline" className="w-full justify-start gap-2 bg-white/50 hover:bg-white" onClick={() => handleDownload('orders')}>
                                    <FileDown className="w-4 h-4" />
                                    ייצוא רשימת הזמנות (CSV)
                                </Button>
                                <Button variant="outline" className="w-full justify-start gap-2 bg-white/50 hover:bg-white" onClick={() => handleDownload('revenue')}>
                                    <FileDown className="w-4 h-4" />
                                    ייצוא דוח הכנסות (CSV)
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-purple-50 border-purple-100">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg font-medium text-purple-900 flex items-center gap-2">
                                <Users className="w-5 h-5" />
                                נתוני שימוש (בקרוב)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-purple-700">דוחות ביצועי שליחים וזמני אספקה יהיו זמינים בקרוב.</p>
                        </CardContent>
                    </Card>
                </div>
            )}

            <div className="mt-8">
                <h2 className="text-xl font-bold mb-4">דוחות חוקיים ורגולציה</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">דוח מע"מ</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Button variant="outline" className="w-full" onClick={() => handleDownload('revenue')}>הורד למחשב</Button>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">ריכוז חשבוניות</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Button variant="outline" className="w-full" onClick={() => handleDownload('revenue')}>הורד למחשב</Button>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">101 שליחים</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Button variant="outline" className="w-full" disabled>בקרוב</Button>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">ביטוחים ורישיונות</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Button variant="outline" className="w-full" disabled>בקרוב</Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
