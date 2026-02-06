"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Truck, ArrowRight, Loader2 } from "lucide-react";
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

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

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
                    <div className="mx-auto bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                        <Truck className="w-8 h-8 text-blue-600" />
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
                                <Input id="password" name="password" type="password" required onChange={handleChange} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone">טלפון נייד</Label>
                                <Input id="phone" name="phone" placeholder="050-0000000" required onChange={handleChange} />
                            </div>
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

                        <Button type="submit" className="w-full h-12 text-lg" disabled={loading}>
                            {loading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                            הירשם כשליח
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
