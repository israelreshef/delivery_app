"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, Lock, CheckCircle, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface MockPaymentFormProps {
    amount: number;
    orderId: number;
    onSuccess: (transactionId: string) => void;
    onCancel: () => void;
}

export default function MockPaymentForm({ amount, orderId, onSuccess, onCancel }: MockPaymentFormProps) {
    const [cardNumber, setCardNumber] = useState("4580 0000 0000 1234");
    const [expiry, setExpiry] = useState("12/28");
    const [cvv, setCvv] = useState("123");
    const [cardHolder, setCardHolder] = useState("Israel Israeli");
    const [processing, setProcessing] = useState(false);
    const [completed, setCompleted] = useState(false);
    const [transactionId, setTransactionId] = useState("");

    const formatCardNumber = (value: string) => {
        const nums = value.replace(/\D/g, "").slice(0, 16);
        return nums.replace(/(.{4})/g, "$1 ").trim();
    };

    const formatExpiry = (value: string) => {
        const nums = value.replace(/\D/g, "").slice(0, 4);
        if (nums.length >= 3) return nums.slice(0, 2) + "/" + nums.slice(2);
        return nums;
    };

    const handleSubmit = async () => {
        setProcessing(true);
        try {
            // Simulate small delay for realism
            await new Promise(r => setTimeout(r, 1500));

            const res = await api.post("/payments/process-mock", {
                amount,
                order_id: orderId,
                card_number: cardNumber.replace(/\s/g, ""),
                card_expiry: expiry,
                card_cvv: cvv,
                card_holder: cardHolder,
                currency: "ILS"
            });

            if (res.data?.success) {
                setCompleted(true);
                setTransactionId(res.data.transaction_id);
                toast.success("התשלום אושר בהצלחה!");
                setTimeout(() => onSuccess(res.data.transaction_id), 2000);
            } else {
                toast.error("התשלום נכשל");
            }
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.error || "שגיאה בעיבוד התשלום");
        } finally {
            setProcessing(false);
        }
    };

    if (completed) {
        return (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center animate-in zoom-in duration-300">
                    <CheckCircle className="w-12 h-12 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-green-800">התשלום אושר!</h3>
                <p className="text-sm text-green-600">מספר עסקה: {transactionId}</p>
                <p className="text-sm text-muted-foreground">מעביר לדף ההזמנות...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6" dir="rtl">
            {/* Mock Notice */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 flex items-center gap-2">
                <Lock className="w-4 h-4 shrink-0" />
                <span>דימוי סליקה — כרטיס דמה מוזן מראש לצורך בדיקה</span>
            </div>

            {/* Card Visual */}
            <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-10 translate-x-10" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-10 -translate-x-10" />
                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-8">
                        <CreditCard className="w-10 h-10 opacity-80" />
                        <span className="text-xs opacity-60">DEMO CARD</span>
                    </div>
                    <div className="font-mono text-xl tracking-widest mb-6">
                        {cardNumber || "•••• •••• •••• ••••"}
                    </div>
                    <div className="flex justify-between items-end">
                        <div>
                            <div className="text-[10px] opacity-50 mb-1">CARD HOLDER</div>
                            <div className="text-sm font-medium">{cardHolder || "YOUR NAME"}</div>
                        </div>
                        <div>
                            <div className="text-[10px] opacity-50 mb-1">EXPIRES</div>
                            <div className="text-sm font-medium">{expiry || "MM/YY"}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
                <div>
                    <Label>מספר כרטיס</Label>
                    <Input
                        value={cardNumber}
                        onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                        placeholder="4580 0000 0000 1234"
                        className="font-mono text-lg tracking-wider"
                        maxLength={19}
                    />
                </div>
                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <Label>תוקף</Label>
                        <Input
                            value={expiry}
                            onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                            placeholder="12/28"
                            className="font-mono"
                            maxLength={5}
                        />
                    </div>
                    <div>
                        <Label>CVV</Label>
                        <Input
                            value={cvv}
                            onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 3))}
                            placeholder="123"
                            type="password"
                            className="font-mono"
                            maxLength={3}
                        />
                    </div>
                    <div>
                        <Label>שם בעל הכרטיס</Label>
                        <Input
                            value={cardHolder}
                            onChange={(e) => setCardHolder(e.target.value)}
                            placeholder="ישראל ישראלי"
                        />
                    </div>
                </div>
            </div>

            {/* Amount Summary */}
            <div className="bg-slate-50 rounded-xl p-4 border">
                <div className="flex justify-between items-center">
                    <span className="font-medium text-slate-600">סה"כ לחיוב</span>
                    <span className="text-2xl font-black text-slate-900">₪{amount.toFixed(2)}</span>
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
                <Button
                    onClick={handleSubmit}
                    disabled={processing}
                    className="flex-1 h-12 text-lg bg-green-600 hover:bg-green-700"
                >
                    {processing ? (
                        <>
                            <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                            מעבד תשלום...
                        </>
                    ) : (
                        <>
                            <Lock className="w-5 h-5 ml-2" />
                            שלם ₪{amount.toFixed(2)}
                        </>
                    )}
                </Button>
                <Button variant="outline" onClick={onCancel} disabled={processing} className="h-12">
                    ביטול
                </Button>
            </div>
        </div>
    );
}
