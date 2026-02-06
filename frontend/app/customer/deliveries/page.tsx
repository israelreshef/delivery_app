"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/dashboard/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, MapPin, Package, Clock, ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import Link from "next/link";

export default function CustomerDeliveriesPage() {
    const [deliveries, setDeliveries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDeliveries();
    }, []);

    const fetchDeliveries = async () => {
        try {
            // כרגע מושך הכל, בהמשך נסנן לפי הלקוח המחובר ב-Backend
            const res = await api.get('/orders');
            setDeliveries(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const statusMap: any = {
        'pending': { label: 'ממתין', color: 'bg-yellow-500' },
        'assigned': { label: 'שובץ לשליח', color: 'bg-blue-500' },
        'picked_up': { label: 'בדרך (נאסף)', color: 'bg-purple-500' },
        'delivered': { label: 'נמסר', color: 'bg-green-500' },
        'cancelled': { label: 'בוטל', color: 'bg-red-500' }
    };

    return (
        <div className="flex h-screen bg-background text-right" dir="rtl">
            <div className="flex flex-1 flex-col overflow-hidden bg-slate-50">
                <Header />
                <main className="flex-1 overflow-y-auto p-6">
                    <div className="max-w-5xl mx-auto space-y-6">

                        <div className="flex items-center justify-between">
                            <h1 className="text-3xl font-bold">המשלוחים שלי</h1>
                            <Button>הזמנה חדשה +</Button>
                        </div>

                        {/* חיפוש וסינון */}
                        <div className="flex gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input className="pr-10" placeholder="חפש לפי מספר הזמנה או שם..." />
                            </div>
                            <Button variant="outline">סינון</Button>
                        </div>

                        {/* רשימת משלוחים */}
                        <div className="grid gap-4">
                            {deliveries.map((order) => {
                                const status = statusMap[order.status] || statusMap['pending'];
                                return (
                                    <Card key={order.id} className="hover:shadow-md transition-shadow cursor-pointer">
                                        <CardContent className="p-6">
                                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">

                                                <div className="flex items-start gap-4">
                                                    <div className="h-12 w-12 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
                                                        <Package className="h-6 w-6 text-slate-600" />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <h3 className="font-bold text-lg">{order.order_number}</h3>
                                                            <Badge className={status.color}>{status.label}</Badge>
                                                        </div>
                                                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                                            <Clock className="h-3 w-3" />
                                                            {new Date(order.created_at).toLocaleDateString('he-IL')} בשעה {new Date(order.created_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex-1 px-4 md:px-12 grid grid-cols-2 gap-8 text-sm w-full md:w-auto">
                                                    <div>
                                                        <p className="text-muted-foreground mb-1">איסוף מ:</p>
                                                        <p className="font-medium">{order.pickup_point?.address?.city || 'תל אביב'}</p>
                                                        <p className="text-slate-500 truncate text-xs">{order.pickup_point?.address?.street || 'לא צוין'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-muted-foreground mb-1">מסירה ל:</p>
                                                        <p className="font-medium">{order.delivery_point?.address?.city || 'רמת גן'}</p>
                                                        <p className="text-slate-500 truncate text-xs">{order.delivery_point?.address?.street || 'לא צוין'}</p>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col items-end gap-2 shrink-0">
                                                    <span className="font-bold text-lg">₪{order.total || order.price || '0.00'}</span>
                                                    <Link href={`/customer/tracking/${order.id}`}>
                                                        <Button variant="outline" size="sm" className="w-full">
                                                            מעקב זמן אמת
                                                        </Button>
                                                    </Link>
                                                </div>

                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>

                    </div>
                </main>
            </div>
        </div>
    );
}
