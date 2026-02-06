"use client";

import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { Search, Plus, MapPin, Package, Clock, Truck } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Delivery = {
    id: number;
    order_number: string;
    status: string;
    priority: string;
    created_at: string;
    customer: {
        full_name: string;
    };
    courier?: {
        full_name: string;
    };
    pickup_point: {
        address: { city: string; street: string; building_number: string };
        contact_name: string;
    };
    delivery_point: {
        address: { city: string; street: string; building_number: string };
        recipient_name: string;
    };
    notes?: string;
};

export default function OrdersPage() {
    const [deliveries, setDeliveries] = useState<Delivery[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDeliveries();
    }, []);

    const fetchDeliveries = async () => {
        try {
            const res = await api.get('/orders');
            setDeliveries(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const statusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-yellow-500';
            case 'assigned': return 'bg-blue-500';
            case 'picked_up': return 'bg-purple-500';
            case 'in_transit': return 'bg-indigo-500';
            case 'delivered': return 'bg-green-500';
            case 'cancelled': return 'bg-red-500';
            default: return 'bg-gray-500';
        }
    };

    const statusLabel = (status: string) => {
        switch (status) {
            case 'pending': return 'ממתין לשיבוץ';
            case 'assigned': return 'שובץ לשליח';
            case 'picked_up': return 'נאסף (אצל השליח)';
            case 'in_transit': return 'בדרך ליעד';
            case 'delivered': return 'נמסר בהצלחה';
            case 'cancelled': return 'בוטל';
            default: return status;
        }
    };

    return (
        <div className="flex h-screen bg-background text-right" dir="rtl">
            <Sidebar />
            <div className="flex flex-1 flex-col overflow-hidden">
                <Header />
                <main className="flex-1 overflow-y-auto p-6">

                    <div className="flex items-center justify-between mb-6">
                        <h1 className="text-3xl font-bold">ניהול משלוחים</h1>
                        <Link href="/orders/new">
                            <Button className="gap-2">
                                <Plus className="h-4 w-4" />
                                הזמנה חדשה (A-B)
                            </Button>
                        </Link>
                    </div>

                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>כל ההזמנות</CardTitle>
                                <div className="relative w-64">
                                    <Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input placeholder="חפש לפי מספר הזמנה..." className="pr-8" />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="text-right">מס' הזמנה</TableHead>
                                        <TableHead className="text-right">לקוח מזמין</TableHead>
                                        <TableHead className="text-right">איסוף (A)</TableHead>
                                        <TableHead className="text-right">מסירה (B)</TableHead>
                                        <TableHead className="text-right">שליח מבצע</TableHead>
                                        <TableHead className="text-right">סטטוס</TableHead>
                                        <TableHead className="text-right">זמן יצירה</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {deliveries.map((d) => (
                                        <TableRow key={d.id}>
                                            <TableCell className="font-mono text-sm">
                                                <Link href={`/orders/${d.id}`} className="text-blue-600 hover:underline">
                                                    {d.order_number}
                                                </Link>
                                            </TableCell>
                                            <TableCell className="font-medium">{d.customer?.full_name || 'מזמין לא ידוע'}</TableCell>
                                            <TableCell>
                                                <div className="text-sm">
                                                    <div className="font-semibold">{d.pickup_point?.address?.city || '-'}</div>
                                                    <div className="text-muted-foreground text-xs">{d.pickup_point?.address?.street} {d.pickup_point?.address?.building_number}</div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm">
                                                    <div className="font-semibold">{d.delivery_point?.address?.city || '-'}</div>
                                                    <div className="text-muted-foreground text-xs">{d.delivery_point?.address?.street} {d.delivery_point?.address?.building_number}</div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {d.courier ? (
                                                    <div className="flex items-center gap-1 text-sm">
                                                        <Truck className="h-3 w-3" />
                                                        {d.courier.full_name}
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground text-xs">- לא שובץ -</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={`${statusColor(d.status)} hover:${statusColor(d.status)}`}>
                                                    {statusLabel(d.status)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-xs" dir="ltr">
                                                {new Date(d.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {deliveries.length === 0 && !loading && (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                                אין הזמנות כרגע
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </main>
            </div>
        </div>
    );
}
