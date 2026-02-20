"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User, Phone, Mail, MapPin, Shield, LogOut, ChevronLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { auth } from "@/lib/auth";

export default function ProfilePage() {
    const router = useRouter();
    // const { logout } = useAuth(); // Removed missing hook
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch User Profile
        const currentUser = auth.getUser();
        if (currentUser) {
            setUser(currentUser);
        } else {
            // router.push('/login/customer'); // Optional redirect
        }
        setLoading(false);
    }, []);

    const handleLogout = () => {
        auth.clearSession();
        router.push('/login/customer');
    };

    if (loading) return null;

    return (
        <div className="min-h-screen bg-slate-50 pb-20 text-slate-900" dir="rtl">
            {/* Header */}
            <div className="bg-blue-600 text-white pb-12 pt-8 px-6 rounded-b-[2.5rem] shadow-lg">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-2xl font-bold">הפרופיל שלי</h1>
                    <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={() => router.push('/dashboard/customer')}>
                        <span className="sr-only">Back</span>
                        <ChevronLeft className="w-6 h-6 rotate-180" />
                    </Button>
                </div>

                <div className="flex items-center gap-4">
                    <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center text-3xl font-bold backdrop-blur-sm border-2 border-white/30">
                        {user?.username?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div>
                        <h2 className="text-xl font-bold">{user?.username || 'אורח'}</h2>
                        <p className="text-blue-100 text-sm">{user?.email || 'guest@example.com'}</p>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 -mt-6 space-y-6">

                {/* Personal Info Card */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <User className="w-5 h-5 text-blue-500" />
                        פרטים אישיים
                    </h3>
                    <div className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">שם מלא</Label>
                            <Input id="name" defaultValue={user?.username} readOnly className="bg-slate-50 border-slate-200" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="phone">טלפון</Label>
                            <Input id="phone" defaultValue={user?.phone || '050-0000000'} readOnly className="bg-slate-50 border-slate-200" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="email">אימייל</Label>
                            <Input id="email" defaultValue={user?.email} readOnly className="bg-slate-50 border-slate-200" />
                        </div>
                    </div>
                </div>

                {/* Saved Addresses (Placeholder) */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-lg flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-green-500" />
                            כתובות שמורות
                        </h3>
                        <Button size="sm" variant="ghost" className="text-blue-600 hover:bg-blue-50">
                            <Plus className="w-4 h-4 ml-1" />
                            הוסף
                        </Button>
                    </div>

                    <div className="space-y-3">
                        <div className="p-3 border rounded-lg flex items-center justify-between hover:bg-slate-50 cursor-pointer group">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                    <MapPin className="w-4 h-4" />
                                </div>
                                <div>
                                    <div className="font-semibold text-sm">הבית</div>
                                    <div className="text-xs text-slate-500">דיזנגוף 100, תל אביב</div>
                                </div>
                            </div>
                            <ChevronLeft className="w-4 h-4 text-slate-300 group-hover:text-slate-600" />
                        </div>
                        <div className="p-3 border rounded-lg flex items-center justify-between hover:bg-slate-50 cursor-pointer group">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                    <MapPin className="w-4 h-4" />
                                </div>
                                <div>
                                    <div className="font-semibold text-sm">המשרד</div>
                                    <div className="text-xs text-slate-500">בורסה, רמת גן</div>
                                </div>
                            </div>
                            <ChevronLeft className="w-4 h-4 text-slate-300 group-hover:text-slate-600" />
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                    <Button variant="outline" className="w-full justify-start h-12 text-slate-700 hover:text-blue-600 hover:border-blue-200">
                        <Shield className="w-5 h-5 ml-3" />
                        שינוי סיסמה
                    </Button>
                    <Button
                        variant="destructive"
                        className="w-full justify-start h-12 bg-red-50 text-red-600 hover:bg-red-100 border border-red-100"
                        onClick={handleLogout}
                    >
                        <LogOut className="w-5 h-5 ml-3" />
                        התנתקות
                    </Button>
                </div>
            </div>
        </div>
    );
}
