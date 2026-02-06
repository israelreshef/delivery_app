"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, DollarSign, Calculator, Check, CheckCircle2 } from "lucide-react";
import { freelanceApi } from "@/lib/api/freelance";
import { Payout, PayoutCalculation, PayoutStatus } from "@/types/freelance";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function PayoutsPage() {
    const [payouts, setPayouts] = useState<Payout[]>([]);
    const [loading, setLoading] = useState(true);
    const [calculating, setCalculating] = useState(false);
    const [calculation, setCalculation] = useState<PayoutCalculation | null>(null);
    const [openCalcDialog, setOpenCalcDialog] = useState(false);

    // Calc form
    const [courierId, setCourierId] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    const fetchPayouts = async () => {
        setLoading(true);
        try {
            const data = await freelanceApi.getPayouts();
            setPayouts(data);
        } catch (error) {
            toast.error("שגיאה בטעינת תשלומים");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPayouts();
    }, []);

    const handleCalculate = async () => {
        if (!courierId || !startDate || !endDate) {
            toast.error("אנא מלא את כל השדות");
            return;
        }

        setCalculating(true);
        try {
            const result = await freelanceApi.calculatePayout(parseInt(courierId), startDate, endDate);
            setCalculation(result);
        } catch (error) {
            toast.error("שגיאה בחישוב שכר");
        } finally {
            setCalculating(false);
        }
    };

    const handleCreatePayout = async () => {
        if (!calculation) return;

        try {
            await freelanceApi.createPayout({
                courier_id: calculation.courier_id,
                period_start: calculation.period_start,
                period_end: calculation.period_end,
                total_deliveries: calculation.total_deliveries,
                total_amount: calculation.total_amount
            });
            toast.success("דוח תשלום נוצר בהצלחה");
            setOpenCalcDialog(false);
            setCalculation(null);
            fetchPayouts();
        } catch (error) {
            toast.error("שגיאה ביצירת דוח תשלום");
        }
    };

    const handleApprove = async (id: number) => {
        try {
            await freelanceApi.approvePayout(id);
            toast.success("התשלום אושר");
            fetchPayouts();
        } catch (error) {
            toast.error("שגיאה באישור התשלום");
        }
    };

    const getStatusBadge = (status: PayoutStatus) => {
        switch (status) {
            case 'draft': return <Badge variant="outline">טיוטה</Badge>;
            case 'approved': return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">מאושר לתשלום</Badge>;
            case 'paid': return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">שולם</Badge>;
            case 'cancelled': return <Badge variant="destructive">בוטל</Badge>;
            default: return null;
        }
    };

    return (
        <div className="p-8 space-y-6 bg-slate-50 min-h-screen" dir="rtl">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <DollarSign className="h-8 w-8 text-primary" />
                        ניהול כספים ופרילנסרים
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        חישוב שכר, הפקת דוחות תשלום וניהול התחשבנות
                    </p>
                </div>

                <Dialog open={openCalcDialog} onOpenChange={setOpenCalcDialog}>
                    <DialogTrigger asChild>
                        <Button className="gap-2">
                            <Calculator className="w-4 h-4" />
                            חישוב שכר תקופתי
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>חישוב שכר לשליח</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 pt-4">
                            {!calculation ? (
                                <>
                                    <div className="space-y-2">
                                        <Label>מזהה שליח (ID)</Label>
                                        <Input
                                            value={courierId}
                                            onChange={(e) => setCourierId(e.target.value)}
                                            placeholder="לדוגמה: 1"
                                            type="number"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>מתאריך</Label>
                                            <Input
                                                type="date"
                                                value={startDate}
                                                onChange={(e) => setStartDate(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>עד תאריך</Label>
                                            <Input
                                                type="date"
                                                value={endDate}
                                                onChange={(e) => setEndDate(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <Button onClick={handleCalculate} className="w-full" disabled={calculating}>
                                        {calculating ? <Loader2 className="animate-spin" /> : "בצע חישוב"}
                                    </Button>
                                </>
                            ) : (
                                <div className="space-y-4">
                                    <div className="bg-slate-50 p-4 rounded-lg space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">תקופה:</span>
                                            <span className="font-medium">{calculation.period_start} - {calculation.period_end}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">סה"כ משלוחים:</span>
                                            <span className="font-medium">{calculation.total_deliveries}</span>
                                        </div>
                                        <div className="flex justify-between border-t pt-2 mt-2">
                                            <span className="font-bold">סה"כ לתשלום:</span>
                                            <span className="font-bold text-lg text-green-600">₪{calculation.total_amount.toFixed(2)}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="outline" className="w-full" onClick={() => setCalculation(null)}>
                                            ביטול
                                        </Button>
                                        <Button className="w-full" onClick={handleCreatePayout}>
                                            אשר וצור דוח תשלום
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>היסטוריית תשלומים</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>מס' דוח</TableHead>
                                <TableHead>שליח (ID)</TableHead>
                                <TableHead>תקופה</TableHead>
                                <TableHead>משלוחים</TableHead>
                                <TableHead>סכום</TableHead>
                                <TableHead>סטטוס</TableHead>
                                <TableHead>פעולות</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                                    </TableCell>
                                </TableRow>
                            ) : payouts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                        לא נמצאו דוחות תשלום
                                    </TableCell>
                                </TableRow>
                            ) : (
                                payouts.map((payout) => (
                                    <TableRow key={payout.id}>
                                        <TableCell>#{payout.id}</TableCell>
                                        <TableCell className="font-medium">#{payout.courier_id}</TableCell>
                                        <TableCell>{payout.period_start} - {payout.period_end}</TableCell>
                                        <TableCell>{payout.total_deliveries}</TableCell>
                                        <TableCell>₪{payout.total_amount.toFixed(2)}</TableCell>
                                        <TableCell>{getStatusBadge(payout.status)}</TableCell>
                                        <TableCell>
                                            {payout.status === 'draft' && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                                    onClick={() => handleApprove(payout.id)}
                                                >
                                                    <CheckCircle2 className="w-4 h-4 mr-1" />
                                                    אשר לתשלום
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
