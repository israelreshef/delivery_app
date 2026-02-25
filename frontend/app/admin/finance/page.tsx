"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    DollarSign,
    FileText,
    TrendingUp,
    TrendingDown,
    Calendar,
    Download,
    Users,
    Briefcase,
    ShieldCheck,
    Receipt
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import LoadingSpinner from "@/components/ui/loading-spinner";

export default function AdminFinancePage() {
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [loading, setLoading] = useState(true);
    const [financeData, setFinanceData] = useState<any>(null);

    const fetchFinanceData = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/reports/financial-overview?month=${month}&year=${year}`);
            setFinanceData(res.data);
        } catch (error) {
            toast.error("שגיאה בטעינת נתונים פיננסיים");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFinanceData();
    }, [month, year]);

    const handleDownload = async (endpoint: string, filename: string) => {
        try {
            const res = await api.get(`/reports/${endpoint}?month=${month}&year=${year}`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            toast.success("הדו\"ח הופק בהצלחה");
        } catch (error) {
            toast.error("שגיאה בהורדת הדו\"ח");
        }
    };

    if (loading && !financeData) return <div className="flex h-screen items-center justify-center"><LoadingSpinner size="lg" text="טוען נתונים פיננסיים..." /></div>;

    const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6'];

    return (
        <div className="p-8 space-y-8 bg-slate-50 min-h-screen" dir="rtl">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">מרכז פיננסי - ציר לוגיסטיקה</h1>
                    <p className="text-slate-500">ניהול הכנסות, הוצאות, קבלנים ודיווחים רגולטוריים</p>
                </div>
                <div className="flex gap-4">
                    <div className="flex items-center gap-2 bg-white p-2 rounded-lg shadow-sm border">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <select
                            value={month}
                            onChange={(e) => setMonth(parseInt(e.target.value))}
                            className="text-sm font-medium focus:outline-none"
                            title="בחר חודש"
                        >
                            {Array.from({ length: 12 }, (_, i) => (
                                <option key={i + 1} value={i + 1}>{format(new Date(2024, i, 1), 'MMMM')}</option>
                            ))}
                        </select>
                        <select
                            value={year}
                            onChange={(e) => setYear(parseInt(e.target.value))}
                            className="text-sm font-medium focus:outline-none"
                            title="בחר שנה"
                        >
                            {[2024, 2025, 2026].map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </header>

            {/* Top Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="border-none shadow-md overflow-hidden bg-white">
                    <CardHeader className="pb-2 border-b border-slate-100 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-medium text-slate-500">סה"כ הכנסות (ברוטו)</CardTitle>
                        <TrendingUp className="w-4 h-4 text-green-500" />
                    </CardHeader>
                    <CardContent className="pt-4">
                        <div className="text-2xl font-bold text-slate-900">₪{financeData?.revenue.gross.toLocaleString()}</div>
                        <p className="text-xs text-slate-400 mt-1">נטו: ₪{financeData?.revenue.net.toLocaleString()}</p>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-md overflow-hidden bg-white">
                    <CardHeader className="pb-2 border-b border-slate-100 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-medium text-slate-500">סה"כ הוצאות (ברוטו)</CardTitle>
                        <TrendingDown className="w-4 h-4 text-red-500" />
                    </CardHeader>
                    <CardContent className="pt-4">
                        <div className="text-2xl font-bold text-slate-900">₪{financeData?.expenses.gross.toLocaleString()}</div>
                        <p className="text-xs text-slate-400 mt-1">כולל ניכוי מס: ₪{financeData?.expenses.withholding.toLocaleString()}</p>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-md overflow-hidden bg-white">
                    <CardHeader className="pb-2 border-b border-slate-100 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-medium text-slate-500">רווח תפעולי</CardTitle>
                        <DollarSign className="w-4 h-4 text-blue-500" />
                    </CardHeader>
                    <CardContent className="pt-4">
                        <div className={`text-2xl font-bold ${financeData?.profit_loss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ₪{financeData?.profit_loss.toLocaleString()}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">לפני מס חברות</p>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-md overflow-hidden bg-white">
                    <CardHeader className="pb-2 border-b border-slate-100 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-medium text-slate-500">מע"מ לתשלום/החזר</CardTitle>
                        <ShieldCheck className="w-4 h-4 text-orange-500" />
                    </CardHeader>
                    <CardContent className="pt-4">
                        <div className="text-2xl font-bold text-slate-900">
                            ₪{(financeData?.revenue.vat - financeData?.expenses.vat).toLocaleString()}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">צפי לדיווח {month}/{year}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Reports Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Visualizations Column */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="border-none shadow-md">
                        <CardHeader>
                            <CardTitle>התפלגות כספית</CardTitle>
                            <CardDescription>השוואה בין הכנסות להוצאות ותזרימי המזומנים</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={[
                                    { name: 'הכנסות', amount: financeData?.revenue.net, fill: '#10b981' },
                                    { name: 'הוצאות', amount: financeData?.expenses.net, fill: '#ef4444' },
                                    { name: 'רווח נקי', amount: financeData?.profit_loss, fill: '#3b82f6' }
                                ]}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                    <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => `₪${v / 1000}k`} />
                                    <Tooltip cursor={{ fill: '#f1f5f9' }} />
                                    <Bar dataKey="amount" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-md">
                        <CardHeader>
                            <CardTitle>הוצאות לפי קבוצות (קבלנים vs ספקים)</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[250px] flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={[
                                            { name: 'קבלני משנה (שליחים)', value: financeData?.expenses.net * 0.7 }, // Mock split
                                            { name: 'תפעול ומשרד', value: financeData?.expenses.net * 0.3 }
                                        ]}
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        <Cell fill="#6366f1" />
                                        <Cell fill="#94a3b8" />
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="flex flex-col gap-2 ml-8">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-[#6366f1] rounded-full"></div>
                                    <span className="text-sm font-medium">קבלנים (70%)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-[#94a3b8] rounded-full"></div>
                                    <span className="text-sm font-medium">ספקים (30%)</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Report Generation Column */}
                <div className="space-y-6">
                    <Card className="border-none shadow-lg border-t-4 border-brand">
                        <CardHeader>
                            <CardTitle className="text-lg">דיווחים רגולטוריים</CardTitle>
                            <CardDescription>הפקת קבצים לרשות המסים וביטוח לאומי</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="p-4 bg-slate-50 rounded-lg space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-slate-600" />
                                        <span className="font-semibold text-sm">דיווח מע"מ PCN 874</span>
                                    </div>
                                    <Button size="sm" variant="ghost" className="text-brand h-8 px-2" onClick={() => handleDownload('vat-pcn874', `PCN874_${year}_${month}.csv`)}>
                                        <Download className="w-4 h-4" />
                                    </Button>
                                </div>
                                <p className="text-[10px] text-slate-400">קובץ תקני לשידור מקוון למע"מ (עסקאות ותשומות).</p>
                            </div>

                            <div className="p-4 bg-slate-50 rounded-lg space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Users className="w-4 h-4 text-slate-600" />
                                        <span className="font-semibold text-sm">דו"ח 856 (קבלני משנה)</span>
                                    </div>
                                    <Button size="sm" variant="ghost" className="text-brand h-8 px-2" onClick={() => handleDownload('contractors-856', `Report856_${year}.csv`)}>
                                        <Download className="w-4 h-4" />
                                    </Button>
                                </div>
                                <p className="text-[10px] text-slate-400">ריכוז תשלומים וניכוי מס במקור לשליחים עצמאיים.</p>
                            </div>

                            <div className="p-4 bg-slate-50 rounded-lg space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Briefcase className="w-4 h-4 text-slate-600" />
                                        <span className="font-semibold text-sm">מאזן בוחן (Trial Balance)</span>
                                    </div>
                                    <Button size="sm" variant="ghost" className="text-brand h-8 px-2" onClick={() => handleDownload('regulatory', `TrialBalance_${year}_${month}.xlsx`)}>
                                        <Download className="w-4 h-4" />
                                    </Button>
                                </div>
                                <p className="text-[10px] text-slate-400">דאטה גולמית להגשת דו"ח שנתי (6111) ע"י רו"ח.</p>
                            </div>

                            <div className="p-4 bg-slate-50 rounded-lg space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Receipt className="w-4 h-4 text-slate-600" />
                                        <span className="font-semibold text-sm">סיכום 102 (שכירים)</span>
                                    </div>
                                    <Button size="sm" variant="ghost" className="text-slate-400 h-8 px-2 cursor-not-allowed">
                                        <Download className="w-4 h-4" />
                                    </Button>
                                </div>
                                <p className="text-[10px] text-slate-400">דיווח ביטוח לאומי לעובדי מנהלה (בקרוב).</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-md bg-blue-600 text-white">
                        <CardHeader>
                            <CardTitle className="text-white">ניכוי מס במקור</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span>צפי ניכוי החודש:</span>
                                    <span className="font-bold">₪{financeData?.expenses.withholding.toLocaleString()}</span>
                                </div>
                                <div className="w-full bg-blue-700 h-2 rounded-full overflow-hidden">
                                    <div className="bg-white h-full" style={{ width: '45%' }}></div>
                                </div>
                                <p className="text-[10px] opacity-80 mt-2">הסכום שנצבר להעברה למס הכנסה ב-15 לחודש.</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
