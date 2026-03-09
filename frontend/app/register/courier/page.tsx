"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Truck, ArrowRight, Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

export default function CourierRegisterPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        username: "",
        password: "",
        full_name: "",
        email: "",
        phone: "",
        vehicle_type: "scooter",
        license_plate: ""
    });

    const [agreeTerms, setAgreeTerms] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [confirmPassword, setConfirmPassword] = useState("");

    // Password strength calculation
    const getPasswordStrength = (pw: string) => {
        if (!pw) return { level: 0, label: '', color: '' };
        let score = 0;
        if (pw.length >= 8) score++;
        if (/[A-Z]/.test(pw)) score++;
        if (/[0-9]/.test(pw)) score++;
        if (/[^A-Za-z0-9]/.test(pw)) score++;
        if (score <= 1) return { level: 1, label: 'חלשה', color: 'bg-red-500' };
        if (score === 2) return { level: 2, label: 'בינונית', color: 'bg-yellow-500' };
        if (score === 3) return { level: 3, label: 'טובה', color: 'bg-blue-500' };
        return { level: 4, label: 'חזקה', color: 'bg-green-500' };
    };
    const pwStrength = getPasswordStrength(formData.password);

    // Phone auto-format: 05X-XXXX-XXX
    const formatPhone = (raw: string) => {
        const digits = raw.replace(/\D/g, '').slice(0, 10);
        if (digits.length <= 3) return digits;
        if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
        return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'phone') {
            setFormData({ ...formData, phone: formatPhone(value) });
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        if (formData.password !== confirmPassword) {
            toast.error("הסיסמאות אינן תואמות");
            setLoading(false);
            return;
        }
        if (!agreeTerms) {
            toast.error("יש לאשר את תנאי השימוש");
            setLoading(false);
            return;
        }

        try {
            await api.post('/auth/register', {
                ...formData,
                user_type: 'courier'
            });

            toast.success("נרשמת בהצלחה! מעביר להתחברות...");
            setTimeout(() => router.push('/login'), 2000);
        } catch (err: any) {
            console.error(err);
            toast.error(err.response?.data?.error || "שגיאה בהרשמה. אנא נסה שנית.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" dir="rtl">
            <Card className="max-w-lg w-full">
                <CardHeader className="text-center space-y-2">
                    <div className="mx-auto bg-brand/20 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                        <Truck className="w-8 h-8 text-brand" />
                    </div>
                    <CardTitle className="text-2xl font-bold">הרשמת שליח חדש</CardTitle>
                    <CardDescription>
                        מלא את הפרטים ונתחיל לעבוד
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="username">שם משתמש</Label>
                                <Input id="username" name="username" placeholder="user123" required onChange={handleChange} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="full_name">שם מלא</Label>
                                <Input id="full_name" name="full_name" placeholder="ישראל ישראלי" required onChange={handleChange} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">אימייל</Label>
                            <Input id="email" name="email" type="email" placeholder="israel@example.com" required onChange={handleChange} />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="password">סיסמה</Label>
                                <div className="relative">
                                    <Input id="password" name="password" type={showPassword ? "text" : "password"} required onChange={handleChange} />
                                    <button type="button" tabIndex={-1} onClick={() => setShowPassword(!showPassword)} className="absolute left-3 top-2.5 text-slate-400 hover:text-slate-600">
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">אימות סיסמה</Label>
                                <Input id="confirmPassword" name="confirmPassword" type={showPassword ? "text" : "password"} required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                            </div>
                        </div>
                        {formData.password && (
                            <div className="space-y-1">
                                <div className="flex gap-1">
                                    {[1, 2, 3, 4].map(i => (
                                        <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= pwStrength.level ? pwStrength.color : 'bg-slate-200'}`} />
                                    ))}
                                </div>
                                <p className="text-xs text-slate-500">חוזק סיסמה: <span className="font-semibold">{pwStrength.label}</span></p>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="phone">טלפון נייד</Label>
                            <Input id="phone" name="phone" placeholder="050-0000000" value={formData.phone} required onChange={handleChange} />
                        </div>

                        <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border">
                            <div className="space-y-2">
                                <Label htmlFor="vehicle_type">סוג רכב</Label>
                                <select
                                    id="vehicle_type"
                                    name="vehicle_type"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    onChange={handleChange}
                                    value={formData.vehicle_type}
                                >
                                    <option value="scooter">קטנוע</option>
                                    <option value="motorcycle">אופנוע כבד</option>
                                    <option value="car">רכב פרטי</option>
                                    <option value="bicycle">אופניים חשמליים</option>
                                    <option value="van">מסחרית</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="license_plate">מספר רישוי</Label>
                                <Input id="license_plate" name="license_plate" placeholder="12-345-67" required onChange={handleChange} />
                            </div>
                        </div>

                        <div className="flex items-start gap-2 pt-1">
                            <input
                                type="checkbox" id="terms" checked={agreeTerms}
                                onChange={(e) => setAgreeTerms(e.target.checked)}
                                className="w-4 h-4 mt-0.5 rounded border-slate-300 text-brand focus:ring-brand cursor-pointer"
                            />
                            <label htmlFor="terms" className="text-sm text-slate-500 cursor-pointer select-none">
                                אני מסכים/ה ל<a href="/terms" target="_blank" className="text-brand hover:underline font-medium">תנאי השימוש</a> ול<a href="/privacy" target="_blank" className="text-brand hover:underline font-medium">מדיניות הפרטיות</a>
                            </label>
                        </div>

                        <Button type="submit" className="w-full h-12 text-lg" disabled={loading}>
                            {loading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                            הירשם כשליח
                        </Button>

                        <div className="text-center pt-4">
                            <Link href="/register" className="text-sm text-muted-foreground hover:text-brand flex items-center justify-center gap-1">
                                <ArrowRight className="w-4 h-4" /> חזרה לבחירה
                            </Link>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
