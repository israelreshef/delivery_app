"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, ArrowRight, Loader2, Eye, EyeOff, ShieldCheck, ShieldAlert, Shield } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

export default function CustomerRegisterPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        username: "",
        password: "",
        confirmPassword: "",
        full_name: "",
        email: "",
        phone: "",
        company_name: ""
    });
    const [error, setError] = useState("");
    const [agreeTerms, setAgreeTerms] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

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

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        if (name === 'phone') {
            setFormData({ ...formData, phone: formatPhone(value) });
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        if (formData.password !== formData.confirmPassword) {
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
                username: formData.username,
                password: formData.password,
                full_name: formData.full_name,
                email: formData.email,
                phone: formData.phone,
                company_name: formData.company_name,
                user_type: 'customer'
            });

            toast.success("נרשמת בהצלחה! מעביר להתחברות...");
            setTimeout(() => router.push('/login'), 2000);
        } catch (err: any) {
            console.error(err);
            const msg = err.response?.data?.error || "שגיאה בהרשמה. אנא נסה שנית.";
            setError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" dir="rtl">
            <Card className="max-w-lg w-full">
                <CardHeader className="text-center space-y-2">
                    <div className="mx-auto bg-brand/20 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                        <Building2 className="w-8 h-8 text-brand" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-slate-900">הרשמת לקוח עסקי</CardTitle>
                    <CardDescription>
                        פתחו חשבון והתחילו לשלוח
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">

                        <div className="space-y-2">
                            <Label htmlFor="company_name">שם החברה / עסק</Label>
                            <Input id="company_name" name="company_name" placeholder="החברה שלי בע''מ" required onChange={handleChange} />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="username">שם משתמש</Label>
                                <Input id="username" name="username" placeholder="company_user" required onChange={handleChange} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="full_name">איש קשר</Label>
                                <Input id="full_name" name="full_name" placeholder="ישראל ישראלי" required onChange={handleChange} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">אימייל עסקי</Label>
                            <Input id="email" name="email" type="email" placeholder="info@company.com" required onChange={handleChange} />
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
                                <Input id="confirmPassword" name="confirmPassword" type={showPassword ? "text" : "password"} required onChange={handleChange} />
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
                            <Input id="phone" name="phone" placeholder="050-0000-000" value={formData.phone} required onChange={handleChange} />
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

                        <Button type="submit" className="w-full h-12 text-lg bg-brand hover:bg-brand-dark font-bold shadow-lg shadow-primary/30" disabled={loading}>
                            {loading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                            צור חשבון עסקי
                        </Button>

                        <div className="text-center pt-4">
                            <Link href="/register" className="text-sm text-muted-foreground hover:text-brand flex items-center justify-center gap-1">
                                <ArrowRight className="w-4 h-4" /> חזרה לבחירה
                            </Link>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div >
    );
}
