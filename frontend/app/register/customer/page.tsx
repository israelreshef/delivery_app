"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

export default function CustomerRegisterPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        username: "",
        password: "",
        confirmPassword: "", // Added field
        full_name: "",
        email: "",
        phone: "",
        company_name: ""
    });
    const [error, setError] = useState("");

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
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
                    <div className="mx-auto bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                        <Building2 className="w-8 h-8 text-blue-600" />
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
                                <Input id="password" name="password" type="password" required onChange={handleChange} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">אימות סיסמה</Label>
                                <Input id="confirmPassword" name="confirmPassword" type="password" required onChange={handleChange} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="phone">טלפון נייד</Label>
                            <Input id="phone" name="phone" placeholder="050-0000000" required onChange={handleChange} />
                        </div>

                        <Button type="submit" className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700 font-bold shadow-lg shadow-blue-200" disabled={loading}>
                            {loading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                            צור חשבון עסקי
                        </Button>

                        <div className="text-center pt-4">
                            <Link href="/register" className="text-sm text-muted-foreground hover:text-primary flex items-center justify-center gap-1">
                                <ArrowRight className="w-4 h-4" /> חזרה לבחירה
                            </Link>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
