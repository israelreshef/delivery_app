"use client";

import { useAuth } from "@/context/AuthContext";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, MapPin, Package, Bell, CreditCard, Save } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

export default function CustomerProfilePage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [profile, setProfile] = useState({
        full_name: "",
        email: "",
        phone: "",
        company_name: "",
        business_id: "",
        default_address: "",
        billing_address: ""
    });

    const [addresses, setAddresses] = useState<any[]>([]);
    const [orders, setOrders] = useState<any[]>([]);

    useEffect(() => {
        fetchProfile();
        fetchAddresses();
        fetchOrders();
    }, []);

    const fetchProfile = async () => {
        try {
            const res = await api.get('/profile');
            setProfile(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchAddresses = async () => {
        try {
            const res = await api.get('/addresses');
            setAddresses(res.data);
        } catch (error) {
            // Addresses failing is not critical critical
        }
    }

    const fetchOrders = async () => {
        try {
            const res = await api.get('/orders');
            const data = res.data;
            setOrders(Array.isArray(data) ? data : data.orders || []);
        } catch (error) {
            console.error(error);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            await api.put('/profile', profile);
            toast.success("הפרופיל עודכן בהצלחה!");
        } catch (error) {
            toast.error("תקלה בתקשורת עם השרת");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-8" dir="rtl">
            <div className="max-w-6xl mx-auto space-y-6">
                <header>
                    <h1 className="text-3xl font-bold text-slate-900">הפרופיל שלי</h1>
                    <p className="text-slate-600">נהל את הפרטים האישיים והעדפות החשבון שלך</p>
                </header>

                <Tabs defaultValue="personal" className="space-y-4">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="personal" className="gap-2">
                            <User className="w-4 h-4" />
                            פרטים אישיים
                        </TabsTrigger>
                        <TabsTrigger value="addresses" className="gap-2">
                            <MapPin className="w-4 h-4" />
                            כתובות
                        </TabsTrigger>
                        <TabsTrigger value="orders" className="gap-2">
                            <Package className="w-4 h-4" />
                            היסטוריה
                        </TabsTrigger>
                        <TabsTrigger value="settings" className="gap-2">
                            <Bell className="w-4 h-4" />
                            הגדרות
                        </TabsTrigger>
                    </TabsList>

                    {/* Personal Details Tab */}
                    <TabsContent value="personal">
                        <Card>
                            <CardHeader>
                                <CardTitle>פרטים אישיים</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label>שם מלא</Label>
                                        <Input
                                            value={profile.full_name}
                                            onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                                            placeholder="ישראל ישראלי"
                                        />
                                    </div>
                                    <div>
                                        <Label>אימייל</Label>
                                        <Input
                                            type="email"
                                            value={profile.email}
                                            onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                                            placeholder="israel@example.com"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label>טלפון</Label>
                                        <Input
                                            value={profile.phone}
                                            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                                            placeholder="050-1234567"
                                        />
                                    </div>
                                    <div>
                                        <Label>שם חברה (אופציונלי)</Label>
                                        <Input
                                            value={profile.company_name}
                                            onChange={(e) => setProfile({ ...profile, company_name: e.target.value })}
                                            placeholder="חברת ABC בע״מ"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <Label>ח.פ / ע.מ (אופציונלי)</Label>
                                    <Input
                                        value={profile.business_id}
                                        onChange={(e) => setProfile({ ...profile, business_id: e.target.value })}
                                        placeholder="123456789"
                                    />
                                </div>
                                <Button onClick={handleSave} disabled={loading} className="gap-2">
                                    <Save className="w-4 h-4" />
                                    {loading ? "שומר..." : "שמור שינויים"}
                                </Button>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Addresses Tab */}
                    <TabsContent value="addresses">
                        <Card>
                            <CardHeader>
                                <CardTitle>כתובות שמורות</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {addresses.length === 0 ? (
                                    <div className="text-center py-10 text-slate-500">
                                        אין כתובות שמורות
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {addresses.map((addr, index) => (
                                            <div key={index} className="p-4 border rounded-lg">
                                                <p className="font-medium">{addr.label || `כתובת ${index + 1}`}</p>
                                                <p className="text-sm text-slate-600">{addr.full_address}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <Button variant="outline" className="mt-4">הוסף כתובת חדשה</Button>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Orders History Tab */}
                    <TabsContent value="orders">
                        <Card>
                            <CardHeader>
                                <CardTitle>היסטוריית הזמנות</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {orders.length === 0 ? (
                                    <div className="text-center py-10 text-slate-500">
                                        אין הזמנות קודמות
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {orders.slice(0, 10).map((order) => (
                                            <div key={order.id} className="p-4 border rounded-lg flex justify-between items-center">
                                                <div>
                                                    <p className="font-medium">הזמנה #{order.order_number}</p>
                                                    <p className="text-sm text-slate-600">{order.package_description}</p>
                                                </div>
                                                <span className={`px-3 py-1 rounded-full text-xs ${order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                                                    order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                        'bg-blue-100 text-blue-800'
                                                    }`}>
                                                    {order.status}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Settings Tab */}
                    <TabsContent value="settings">
                        <Card>
                            <CardHeader>
                                <CardTitle>הגדרות והעדפות</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between p-4 border rounded-lg">
                                    <div>
                                        <p className="font-medium">התראות SMS</p>
                                        <p className="text-sm text-slate-600">קבל עדכונים על משלוחים בהודעות SMS</p>
                                    </div>
                                    <input type="checkbox" className="w-5 h-5" defaultChecked />
                                </div>
                                <div className="flex items-center justify-between p-4 border rounded-lg">
                                    <div>
                                        <p className="font-medium">התראות אימייל</p>
                                        <p className="text-sm text-slate-600">קבל עדכונים באימייל</p>
                                    </div>
                                    <input type="checkbox" className="w-5 h-5" defaultChecked />
                                </div>
                                <div className="flex items-center justify-between p-4 border rounded-lg">
                                    <div>
                                        <p className="font-medium">שמור כתובות</p>
                                        <p className="text-sm text-slate-600">שמור אוטומטית כתובות חדשות</p>
                                    </div>
                                    <input type="checkbox" className="w-5 h-5" defaultChecked />
                                </div>
                                <Button variant="destructive" className="mt-4">מחק חשבון</Button>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
