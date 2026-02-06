"use client";

import { useEffect, useState } from "react";
import CustomerLayout from "@/components/customer/CustomerLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Package, Truck, CheckCircle2, AlertCircle, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface Order {
    id: number;
    order_number: string;
    status: string;
    pickup_address: string;
    delivery_address: string;
    total: number;
    created_at: string;
}

const statusMap: Record<string, { label: string; color: string }> = {
    pending: { label: "ממתין לשליח", color: "bg-yellow-100 text-yellow-800" },
    assigned: { label: "שליח בדרך", color: "bg-blue-100 text-blue-800" },
    picked_up: { label: "נאסף", color: "bg-purple-100 text-purple-800" },
    in_transit: { label: "במשלוח", color: "bg-indigo-100 text-indigo-800" },
    delivered: { label: "נמסר", color: "bg-green-100 text-green-800" },
    cancelled: { label: "בוטל", color: "bg-red-100 text-red-800" },
};

export default function CustomerDashboard() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        active: 0,
        completed: 0,
        totalSpent: 0
    });

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const res = await api.get('/orders');
                const data: Order[] = res.data;
                setOrders(data);

                // Calculate stats based on fetched data
                const active = data.filter(o => ['pending', 'assigned', 'picked_up', 'in_transit'].includes(o.status)).length;
                const completed = data.filter(o => o.status === 'delivered').length;
                const totalSpent = data.reduce((acc, curr) => acc + (curr.total || 0), 0);

                setStats({ active, completed, totalSpent });
            } catch (error) {
                console.error("Failed to fetch orders", error);
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
    }, []);

    if (loading) {
        return (
            <CustomerLayout>
                <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
            </CustomerLayout>
        );
    }

    return (
        <CustomerLayout>
            <div className="space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">דשבורד</h1>
                        <p className="text-slate-500">סקירת פעילות והזמנות אחרונות</p>
                    </div>
                    <Link href="/customer/orders/new">
                        <Button className="h-12 px-6 bg-blue-600 hover:bg-blue-700 text-lg shadow-lg shadow-blue-200">
                            <PlusCircle className="ml-2 h-5 w-5" /> הזמנה חדשה
                        </Button>
                    </Link>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="border-none shadow-md bg-white">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-slate-500">משלוחים פעילים</CardTitle>
                            <Truck className="h-4 w-4 text-blue-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-slate-900">{stats.active}</div>
                        </CardContent>
                    </Card>
                    <Card className="border-none shadow-md bg-white">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-slate-500">נמסרו החודש</CardTitle>
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-slate-900">{stats.completed}</div>
                        </CardContent>
                    </Card>
                    <Card className="border-none shadow-md bg-white">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-slate-500">סה"כ חיובים</CardTitle>
                            <Package className="h-4 w-4 text-purple-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-slate-900">₪{stats.totalSpent.toFixed(2)}</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Recent Orders List */}
                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-slate-900">הזמנות אחרונות</h2>

                    {orders.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Package className="w-8 h-8 text-slate-400" />
                            </div>
                            <h3 className="text-lg font-medium text-slate-900">אין עדיין הזמנות</h3>
                            <p className="text-slate-500 max-w-sm mx-auto mb-6">נראה שעדיין לא ביצעת משלוחים. זה הזמן להתחיל!</p>
                            <Link href="/customer/orders/new">
                                <Button variant="outline">צור הזמנה ראשונה</Button>
                            </Link>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-right">
                                    <thead className="bg-slate-50 text-slate-500 font-medium border-b">
                                        <tr>
                                            <th className="px-6 py-4">מס' הזמנה</th>
                                            <th className="px-6 py-4">סטטוס</th>
                                            <th className="px-6 py-4">איסוף</th>
                                            <th className="px-6 py-4">מסירה</th>
                                            <th className="px-6 py-4">מחיר</th>
                                            <th className="px-6 py-4">תאריך</th>
                                            <th className="px-6 py-4"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {orders.map((order) => {
                                            const status = statusMap[order.status] || { label: order.status, color: "bg-slate-100" };
                                            return (
                                                <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-6 py-4 font-mono text-slate-600">{order.order_number.split('-')[2]}...</td>
                                                    <td className="px-6 py-4">
                                                        <Badge variant="secondary" className={`${status.color} border-none font-normal`}>
                                                            {status.label}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-6 py-4 max-w-[200px] truncate" title={order.pickup_address}>
                                                        {order.pickup_address}
                                                    </td>
                                                    <td className="px-6 py-4 max-w-[200px] truncate" title={order.delivery_address}>
                                                        {order.delivery_address}
                                                    </td>
                                                    <td className="px-6 py-4 font-bold text-slate-900">₪{order.total}</td>
                                                    <td className="px-6 py-4 text-slate-500">
                                                        {order.created_at ? format(new Date(order.created_at), 'dd/MM/yy HH:mm') : '-'}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <Link href={`/customer/orders/${order.id}`}>
                                                            <Button variant="ghost" size="sm" className="hover:bg-blue-50 hover:text-blue-600">
                                                                <ArrowLeft className="w-4 h-4 ml-1" /> פרטים
                                                            </Button>
                                                        </Link>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </CustomerLayout>
    );
}
