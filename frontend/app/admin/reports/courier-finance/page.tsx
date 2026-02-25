"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import {
    BarChart3,
    Download,
    FileText,
    ShieldCheck,
    TrendingUp,
    Wallet,
    AlertCircle,
    Info,
    Settings
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";

export default function CourierFinancials() {
    const [month, setMonth] = useState("2");
    const [year, setYear] = useState("2026");
    const [isLoading, setIsLoading] = useState(false);
    const [vatData, setVatData] = useState<any>(null);
    const [annualData, setAnnualData] = useState<any>(null);

    const fetchReports = async () => {
        setIsLoading(true);
        try {
            // For now, these endpoints use the 'courier' role, so in admin we'd need a multi-courier filter
            // Mocking for the dashboard demo as the backend expects a 'current_user' as courier
            const [vatRes, annualRes] = await Promise.all([
                api.get(`/earnings_reports/vat-summary?month=${month}&year=${year}`),
                api.get(`/earnings_reports/annual-summary?year=${year}`)
            ]);

            setVatData(vatRes.data);
            setAnnualData(annualRes.data);
            toast.success("דוחות הופקו בהצלחה");
        } catch (error) {
            console.error(error);
            // Mock data for UI demonstration since we are in dev and permissions might differ
            setVatData({
                period: `${month}/${year}`,
                revenue: { gross: 14500, net: 12393, vat: 2106 },
                expenses: { gross: 3200, net: 2735, vat: 465 },
                due_to_vat: 1641
            });
            setAnnualData({
                year: 2026,
                total_revenue: 154000,
                social_security_estimate: 11200,
                monthly_avg: 12833,
                tax_bracket_hint: 'מדרגת מס 14%'
            });
            toast.info("מוצגים נתוני סימולציה (בדיקה)");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-8 space-y-8 bg-slate-50 min-h-screen" dir="rtl">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">מרכז פיננסי לשליח</h1>
                    <p className="text-slate-500">ניהול דוחות מס, מע"מ וביטוח לאומי באופן עצמאי</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" className="gap-2">
                        <Download className="w-4 h-4" />
                        ייצוא לרואה חשבון
                    </Button>
                    <Button className="bg-brand hover:bg-brand-dark gap-2">
                        <ShieldCheck className="w-4 h-4" />
                        אישור הגשה לרשויות
                    </Button>
                </div>
            </div>

            <Card className="border-none shadow-sm">
                <CardHeader className="bg-white rounded-t-xl border-b">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-brand" />
                        פרמטרים להפקה
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6 bg-white rounded-b-xl">
                    <div className="space-y-2">
                        <Label>חודש דוח</Label>
                        <Select value={month} onValueChange={setMonth}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {Array.from({ length: 12 }, (_, i) => (
                                    <SelectItem key={i + 1} value={(i + 1).toString()}>{i + 1}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>שנת מס</Label>
                        <Select value={year} onValueChange={setYear}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="2024">2024</SelectItem>
                                <SelectItem value="2025">2025</SelectItem>
                                <SelectItem value="2026">2026</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-end">
                        <Button onClick={fetchReports} disabled={isLoading} className="w-full bg-slate-900">
                            עדכן דוחות וחישובים
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* VAT Card */}
                <Card className="md:col-span-2 overflow-hidden border-none shadow-md">
                    <CardHeader className="bg-brand text-white">
                        <div className="flex justify-between items-center">
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="w-5 h-5" />
                                ריכוז מע"מ תקופתי
                            </CardTitle>
                            <Badge className="bg-white/20 hover:bg-white/30 text-white border-none">חודשי</Badge>
                        </div>
                        <CardDescription className="text-white/80">חישוב עסקאות מול תשומות (הוצאות מוכרות)</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0 bg-white">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="text-right">קטגוריה</TableHead>
                                    <TableHead className="text-right">ברוטו (כולל מע"מ)</TableHead>
                                    <TableHead className="text-right">נטו</TableHead>
                                    <TableHead className="text-right">רכיב המע"מ (17%)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow>
                                    <TableCell className="font-bold">הכנסות (משלוחים)</TableCell>
                                    <TableCell>₪ {vatData?.revenue.gross.toLocaleString()}</TableCell>
                                    <TableCell>₪ {vatData?.revenue.net.toLocaleString()}</TableCell>
                                    <TableCell className="text-blue-600 font-bold">₪ {vatData?.revenue.vat.toLocaleString()}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-bold">הוצאות (דלק, רכב, ציוד)</TableCell>
                                    <TableCell>₪ {vatData?.expenses.gross.toLocaleString()}</TableCell>
                                    <TableCell>₪ {vatData?.expenses.net.toLocaleString()}</TableCell>
                                    <TableCell className="text-red-600 font-bold">₪ {vatData?.expenses.vat.toLocaleString()}</TableCell>
                                </TableRow>
                                <TableRow className="bg-slate-50">
                                    <TableCell colSpan={3} className="font-extrabold text-lg">יתרה לתשלום/החזר מע"מ</TableCell>
                                    <TableCell className="text-xl font-black text-brand">₪ {vatData?.due_to_vat.toLocaleString()}</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                        <div className="p-4 bg-yellow-50 flex gap-3 border-t">
                            <Info className="w-5 h-5 text-yellow-600 shrink-0" />
                            <p className="text-xs text-yellow-800">
                                שים לב: החישוב מבוסס על חשבוניות מס שהופקו במערכת והוצאות שהועלו.
                                מועד דיווח מע"מ קרוב: 15 לחודש {parseInt(month) + 1}.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Social Security & Income Tax */}
                <div className="space-y-8">
                    <Card className="border-none shadow-md">
                        <CardHeader className="bg-slate-800 text-white">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <ShieldCheck className="w-5 h-5 text-green-400" />
                                ביטוח לאומי ומס
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6 bg-white">
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span>הפרשה משוערת לביטוח לאומי</span>
                                    <span className="font-bold">₪ {annualData?.social_security_estimate.toLocaleString()}</span>
                                </div>
                                <Progress value={35} className="h-2" />
                            </div>

                            <div className="space-y-4 pt-4 border-t">
                                <div className="flex justify-between items-center bg-blue-50 p-3 rounded-lg">
                                    <div className="text-sm font-medium text-blue-900">מדרגת מס נוכחית</div>
                                    <Badge className="bg-blue-600">{annualData?.tax_bracket_hint}</Badge>
                                </div>

                                <div className="flex justify-between items-center bg-indigo-50 p-3 rounded-lg">
                                    <div className="text-sm font-medium text-indigo-900">ממוצע הכנסה חודשי</div>
                                    <div className="font-bold">₪ {annualData?.monthly_avg.toLocaleString()}</div>
                                </div>
                            </div>

                            <div className="pt-4 flex gap-2">
                                <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
                                <p className="text-[10px] text-slate-500 italic">
                                    הערכים הינם הערכה בלבד לפי חוקי המס לשנת {year}. מומלץ לוודא מול פקיד השומה.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-md bg-brand text-white">
                        <CardContent className="p-6 flex items-center gap-4">
                            <div className="p-3 bg-white/20 rounded-full">
                                <Wallet className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs text-white/70">צפי הכנסה שנתי (ברוטו)</p>
                                <p className="text-2xl font-black">₪ {annualData?.total_revenue.toLocaleString()}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Quick Actions / Integration */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer bg-white">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 rounded-lg"><FileText className="w-4 h-4 text-slate-600" /></div>
                        <span className="text-sm font-bold">הפק טופס פתיחת תיק</span>
                    </div>
                </Card>
                <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer bg-white">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 rounded-lg"><BarChart3 className="w-4 h-4 text-slate-600" /></div>
                        <span className="text-sm font-bold">ניתוח כדאיות (מסלול מול רווח)</span>
                    </div>
                </Card>
                <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer border-brand/50 bg-brand/5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-brand/10 rounded-lg"><ShieldCheck className="w-4 h-4 text-brand" /></div>
                        <span className="text-sm font-bold text-brand">דיווח מע"מ דגיטלי (ממשק רשות המסים)</span>
                    </div>
                </Card>
                <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer bg-white">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 rounded-lg"><Settings className="w-4 h-4 text-slate-600" /></div>
                        <span className="text-sm font-bold">ניהול מורשי חתימה</span>
                    </div>
                </Card>
            </div>
        </div>
    );
}
