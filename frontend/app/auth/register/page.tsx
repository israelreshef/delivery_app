"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, Loader2, Truck, User, Building2, Phone, Mail, Lock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

export default function RegisterPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    // Form State
    const [formData, setFormData] = useState({
        username: "",
        full_name: "",
        email: "",
        phone: "",
        password: "",
        confirmPassword: "",
        company_name: "",
        user_type: "customer" // Default to customer
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const validateForm = () => {
        if (formData.password !== formData.confirmPassword) {
            setError("הסיסמאות אינן תואמות");
            return false;
        }
        if (formData.password.length < 6) {
            setError("הסיסמה חייבת להכיל לפחות 6 תווים");
            return false;
        }
        if (!formData.phone.startsWith("05") || formData.phone.length < 10) {
            setError("מספר טלפון לא תקין");
            return false;
        }
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!validateForm()) return;

        setIsLoading(true);

        try {
            const res = await fetch("http://localhost:5000/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username: formData.username,
                    email: formData.email,
                    phone: formData.phone,
                    password: formData.password,
                    full_name: formData.full_name,
                    company_name: formData.company_name,
                    user_type: "customer"
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "שגיאה בהרשמה");
            }

            toast.success("ההרשמה בוצע בהצלחה! כעת ניתן להתחבר.");

            // Redirect to login after short delay
            setTimeout(() => {
                router.push("/auth/login");
            }, 1500);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4" dir="rtl">
            <Card className="w-full max-w-md shadow-xl border-t-4 border-t-blue-600">
                <CardHeader className="text-center space-y-2">
                    <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-2">
                        <User className="w-6 h-6 text-blue-600" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-slate-900">יצירת חשבון חדש</CardTitle>
                    <CardDescription>
                        הצטרף לאפליקציית המשלוחים המובילה
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="full_name">שם מלא</Label>
                                <div className="relative">
                                    <User className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
                                    <Input
                                        id="full_name"
                                        name="full_name"
                                        placeholder="ישראל ישראלי"
                                        className="pr-9"
                                        required
                                        value={formData.full_name}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="username">שם משתמש</Label>
                                <div className="relative">
                                    <User className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
                                    <Input
                                        id="username"
                                        name="username"
                                        placeholder="user123"
                                        className="pr-9"
                                        required
                                        value={formData.username}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">אימייל</Label>
                            <div className="relative">
                                <Mail className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    placeholder="your@email.com"
                                    className="pr-9"
                                    required
                                    value={formData.email}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="phone">טלפון נייד</Label>
                            <div className="relative">
                                <Phone className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
                                <Input
                                    id="phone"
                                    name="phone"
                                    type="tel"
                                    placeholder="050-0000000"
                                    className="pr-9"
                                    required
                                    value={formData.phone}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="password">סיסמה</Label>
                                <div className="relative">
                                    <Lock className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
                                    <Input
                                        id="password"
                                        name="password"
                                        type="password"
                                        placeholder="******"
                                        className="pr-9"
                                        required
                                        value={formData.password}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">אימות סיסמה</Label>
                                <div className="relative">
                                    <Lock className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
                                    <Input
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        type="password"
                                        placeholder="******"
                                        className="pr-9"
                                        required
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="company_name">שם חברה / עסק (אופציונלי)</Label>
                            <div className="relative">
                                <Building2 className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
                                <Input
                                    id="company_name"
                                    name="company_name"
                                    placeholder="החברה שלי בע''מ"
                                    className="pr-9"
                                    value={formData.company_name}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        <Button type="submit" className="w-full h-12 text-lg font-bold bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
                            {isLoading ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> יוצר חשבון...</>
                            ) : (
                                "הרשם עכשיו"
                            )}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="justify-center flex-col space-y-2 bg-slate-50/50 p-6">
                    <div className="text-sm text-slate-600">
                        כבר יש לך חשבון?{" "}
                        <Link href="/auth/login" className="text-blue-600 font-bold hover:underline">
                            התחבר כאן
                        </Link>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}
