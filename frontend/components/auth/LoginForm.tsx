"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Lock, Mail, Truck, User, ArrowRight, ArrowLeft, Eye, EyeOff } from "lucide-react";
import Link from 'next/link';

interface LoginFormProps {
    role: 'customer' | 'courier' | 'admin';
}

export function LoginForm({ role }: LoginFormProps) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const { login } = useAuth();
    const router = useRouter();

    const roleData = {
        customer: {
            title: "אזור אישי לקוחות",
            description: "נהל את המשלוחים שלך בקלות",
            icon: User,
            gradient: "from-brand to-brand-dark",
            bg: "bg-brand/10",
            text: "text-brand"
        },
        courier: {
            title: "אזור אישי שליחים",
            description: "להרוויח יותר, בזמן שלך",
            icon: Truck,
            gradient: "from-orange-500 to-red-500",
            bg: "bg-orange-50",
            text: "text-orange-600"
        },
        admin: {
            title: "פורטל ניהול",
            description: "גישה מוגבלת למורשים בלבד",
            icon: Lock,
            gradient: "from-gray-700 to-gray-900",
            bg: "bg-gray-50",
            text: "text-gray-700"
        }
    }[role];

    const Icon = roleData.icon;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const res = await api.post("/auth/login", {
                email,
                password,
                role
            });

            const { token, user } = res.data;

            if (!user) throw new Error("Invalid server response");

            const userData: any = {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.user_type,
                name: user.full_name || user.username
            };

            login(token, userData);
            toast.success(`ברוך הבא, ${user.full_name || 'משתמש'}!`);

        } catch (error: any) {
            console.error("Login failed:", error);
            const msg = error.response?.data?.message ||
                error.response?.data?.error ||
                "שגיאה בהתחברות. אנא בדוק את החיבור לאינטרנט או נסה שוב מאוחר יותר.";
            toast.error(msg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100">
            {/* Header Section */}
            <div className={`p-8 bg-gradient-to-br ${roleData.gradient} text-white text-center relative overflow-hidden`}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-8 -mb-8 blur-xl"></div>

                <div className="relative z-10 flex flex-col items-center">
                    <div className="bg-white/20 p-4 rounded-2xl mb-4 backdrop-blur-sm shadow-inner">
                        <Icon className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">{roleData.title}</h1>
                    <p className="text-white/80 font-medium">{roleData.description}</p>
                </div>
            </div>

            <div className="p-8 space-y-6">
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-slate-600 font-medium">אימייל / טלפון נייד</Label>
                        <div className="relative group">
                            <Mail className="absolute right-3 top-3.5 h-5 w-5 text-slate-400 group-focus-within:text-brand transition-colors" />
                            <Input
                                id="email"
                                type="text"
                                placeholder="name@example.com"
                                className="pr-10 h-12 bg-slate-50 border-slate-200 focus:bg-white transition-all"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <Label htmlFor="password" className="text-slate-600 font-medium">סיסמה</Label>
                            <Link href="/forgot-password" className="text-xs text-brand hover:underline">שכחתי סיסמה</Link>
                        </div>
                        <div className="relative group">
                            <Lock className="absolute right-3 top-3.5 h-5 w-5 text-slate-400 group-focus-within:text-brand transition-colors" />
                            <Input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                className="pr-10 pl-10 h-12 bg-slate-50 border-slate-200 focus:bg-white transition-all"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            <button
                                type="button"
                                tabIndex={-1}
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute left-3 top-3.5 text-slate-400 hover:text-slate-600 transition-colors"
                                aria-label={showPassword ? "הסתר סיסמה" : "הצג סיסמה"}
                            >
                                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="remember"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="w-4 h-4 rounded border-slate-300 text-brand focus:ring-brand cursor-pointer"
                        />
                        <label htmlFor="remember" className="text-sm text-slate-500 cursor-pointer select-none">זכור אותי</label>
                    </div>

                    <Button
                        type="submit"
                        className={`w-full h-12 text-lg font-bold shadow-lg shadow-brand hover:shadow-brand-lg transition-all bg-gradient-to-r ${roleData.gradient}`}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                מתחבר...
                            </>
                        ) : (
                            <span className="flex items-center gap-2">
                                כניסה למערכת
                                <ArrowLeft className="w-5 h-5" />
                            </span>
                        )}
                    </Button>
                </form>

                {role === 'customer' && (
                    <div className="text-center pt-2">
                        <p className="text-slate-500 text-sm">
                            עדיין לא הצטרפת?{' '}
                            <Link href="/register" className="font-bold text-brand hover:text-brand hover:underline transition-colors">
                                צור חשבון חדש בחינם
                            </Link>
                        </p>
                    </div>
                )}

                {role === 'courier' && (
                    <div className="text-center pt-2">
                        <p className="text-slate-500 text-sm">
                            רוצה להצטרף לצי?{' '}
                            <Link href="/register/courier" className="font-bold text-orange-600 hover:text-orange-700 hover:underline transition-colors">
                                הגש מועמדות עכשיו
                            </Link>
                        </p>
                    </div>
                )}
            </div>

            <div className="bg-slate-50 p-4 text-center border-t border-slate-100">
                <Link href="/" className="text-sm text-slate-400 hover:text-slate-600 flex items-center justify-center gap-1 transition-colors">
                    <ArrowRight className="w-4 h-4" /> חזרה לדף הבית
                </Link>
            </div>
        </div>
    );
}
