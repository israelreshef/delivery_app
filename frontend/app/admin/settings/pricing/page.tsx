"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { DollarSign, Save } from "lucide-react";
import { toast } from "sonner";

export default function PricingSettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [pricing, setPricing] = useState({
        base_price: 20.0,
        price_per_km: 5.0,
        price_per_kg: 2.0,
        express_fee: 30.0,
        weekend_fee: 15.0,
        night_fee: 25.0,
        city_surcharge: 10.0
    });

    useEffect(() => {
        fetchPricing();
    }, []);

    const fetchPricing = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:5000/api/settings/pricing', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                // Exclude ID from state if present to avoid sending it back
                const { id, ...settings } = data;
                setPricing(settings);
            }
        } catch (error) {
            toast.error("שגיאה בטעינת מחירון");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:5000/api/settings/pricing', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(pricing)
            });

            if (res.ok) {
                toast.success("מחירון עודכן בהצלחה");
            } else {
                toast.error("שגיאה בעדכון מחירון");
            }
        } catch (error) {
            toast.error("תקלה בתקשורת");
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (key: string, value: string) => {
        setPricing(prev => ({ ...prev, [key]: parseFloat(value) || 0 }));
    };

    if (loading) return <div className="p-8 text-center">טוען נתונים...</div>;

    return (
        <div className="p-8 space-y-6 bg-slate-50 min-h-screen" dir="rtl">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">ניהול מחירון</h1>
                    <p className="text-slate-500">הגדרת מחירים בסיסיים ותוספות לתמחור המשלוחים</p>
                </div>
                <Button onClick={handleSave} disabled={saving} className="gap-2">
                    <Save className="w-4 h-4" />
                    {saving ? 'שומר...' : 'שמור שינויים'}
                </Button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-none shadow-md">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <DollarSign className="w-5 h-5 text-green-600" />
                            תמחור בסיס
                        </CardTitle>
                        <CardDescription>מרכיבי העלות הקבועים והמשתנים</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>מחיר בסיס להזמנה (₪)</Label>
                                <Input
                                    type="number" step="0.5"
                                    value={pricing.base_price}
                                    onChange={e => handleChange('base_price', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>מחיר לכל קילומטר (₪)</Label>
                                <Input
                                    type="number" step="0.5"
                                    value={pricing.price_per_km}
                                    onChange={e => handleChange('price_per_km', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>מחיר לכל ק"ג נוסף (₪)</Label>
                                <Input
                                    type="number" step="0.5"
                                    value={pricing.price_per_kg}
                                    onChange={e => handleChange('price_per_kg', e.target.value)}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-md">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <DollarSign className="w-5 h-5 text-purple-600" />
                            תוספות ושדרוגים
                        </CardTitle>
                        <CardDescription>תעריפים מיוחדים למקרים חריגים</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>תוספת משלוח אקספרס (₪)</Label>
                                <Input
                                    type="number" step="1"
                                    value={pricing.express_fee}
                                    onChange={e => handleChange('express_fee', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>תוספת עיר צפופה (₪)</Label>
                                <Input
                                    type="number" step="1"
                                    value={pricing.city_surcharge}
                                    onChange={e => handleChange('city_surcharge', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>תוספת לילה (20:00-06:00) (₪)</Label>
                                <Input
                                    type="number" step="1"
                                    value={pricing.night_fee}
                                    onChange={e => handleChange('night_fee', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>תוספת סוף שבוע (₪)</Label>
                                <Input
                                    type="number" step="1"
                                    value={pricing.weekend_fee}
                                    onChange={e => handleChange('weekend_fee', e.target.value)}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="bg-blue-50 p-4 rounded-md text-blue-800 text-sm">
                * כל המחירים נקובים בשקלים חדשים ואינם כוללים מע"מ.
                <br />
                * עדכון המחירון ייכנס לתוקף באופן מיידי עבור כל הזמנה חדשה שתיפתח.
            </div>
        </div>
    );
}
