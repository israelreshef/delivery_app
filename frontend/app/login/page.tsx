"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

export default function LoginPage() {
    const router = useRouter();
    const { login } = useAuth();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        username: "",
        password: ""
    });

    const [showOTP, setShowOTP] = useState(false);
    const [mfaToken, setMfaToken] = useState("");
    const [otpCode, setOtpCode] = useState("");

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleOTPSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await api.post('/auth/2fa/login-verify', {
                mfa_token: mfaToken,
                code: otpCode
            });

            completeLogin(res.data);
        } catch (err: any) {
            toast.error(err.response?.data?.error || "קוד אימות לא תקין");
        } finally {
            setLoading(false);
        }
    };

    const completeLogin = (data: any) => {
        const userData = {
            ...data.user,
            role: data.user.user_type
        };
        login(data.access_token, userData);
        toast.success("התחברת בהצלחה!");
        router.push('/');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await api.post('/auth/login', formData);
            console.log("DEBUG LOGIN RESPONSE:", res.data);

            if (res.data.requires_2fa) {
                setShowOTP(true);
                setMfaToken(res.data.mfa_token);
                toast.info("נא להזין קוד אימות מאפליקציית Authenticator");
                return;
            }

            if (!res.data.user) {
                throw new Error("No user data received from server");
            }

            completeLogin({
                access_token: res.data.token,
                user: res.data.user
            });

        } catch (err: any) {
            console.error("Login Error Debug:", err);
            toast.error(err.response?.data?.error || "שגיאה בהתחברות");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" dir="rtl">
            <Card className="max-w-md w-full">
                <CardHeader className="text-center space-y-2">
                    <div className="mx-auto bg-slate-900 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                        <Lock className="w-8 h-8 text-white" />
                    </div>
                    <CardTitle className="text-2xl font-bold">
                        {showOTP ? "אימות דו-שלבי" : "התחברות למערכת"}
                    </CardTitle>
                    <CardDescription>
                        {showOTP ? "הזן את הקוד מאפליקציית Authenticator" : "הזן פרטי משתמש לכניסה"}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {!showOTP ? (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="username">שם משתמש</Label>
                                <Input id="username" name="username" placeholder="user123" required onChange={handleChange} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password">סיסמה</Label>
                                <Input id="password" name="password" type="password" required onChange={handleChange} />
                            </div>

                            <Button type="submit" className="w-full h-12 text-lg" disabled={loading}>
                                {loading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                                התחבר
                            </Button>

                            <div className="text-center pt-4 space-y-2">
                                <div className="text-sm text-muted-foreground">
                                    אין לך חשבון? <Link href="/register" className="text-blue-600 font-medium hover:underline">הירשם כאן</Link>
                                </div>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={handleOTPSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="otp">קוד אימות (6 ספרות)</Label>
                                <Input
                                    id="otp"
                                    placeholder="000000"
                                    maxLength={6}
                                    className="text-center text-2xl tracking-[1em]"
                                    required
                                    value={otpCode}
                                    onChange={(e) => setOtpCode(e.target.value)}
                                />
                            </div>

                            <Button type="submit" className="w-full h-12 text-lg" disabled={loading}>
                                {loading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                                אמת קוד
                            </Button>

                            <Button type="button" variant="ghost" className="w-full" onClick={() => setShowOTP(false)}>
                                חזרה להתחברות
                            </Button>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
