"use client";

import { useEffect, useState } from "react";
import CustomerLayout from "@/components/customer/CustomerLayout";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, PlusCircle, MapPin, Clock, Truck, CheckCircle, XCircle, ChevronLeft, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
    pending: { label: "ממתין", color: "bg-ice text-brand-dark border-brand-light", icon: Clock },
    assigned: { label: "שליח בדרך", color: "bg-blue-100 text-blue-800 border-blue-200", icon: Truck },
    picked_up: { label: "נאסף", color: "bg-indigo-100 text-indigo-800 border-indigo-200", icon: Package },
    in_transit: { label: "בדרך ליעד", color: "bg-purple-100 text-purple-800 border-purple-200", icon: Truck },
    delivered: { label: "נמסר", color: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle },
    cancelled: { label: "בוטל", color: "bg-red-100 text-red-800 border-red-200", icon: XCircle },
    failed: { label: "נכשל", color: "bg-red-100 text-red-800 border-red-200", icon: XCircle },
};

export default function CustomerOrdersPage() {
    const router = useRouter();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            const res = await api.get("/orders");
            const data = Array.isArray(res.data) ? res.data : res.data.data || res.data.orders || [];
            setOrders(data);
        } catch (error) {
            console.error("Failed to fetch orders", error);
        } finally {
            setLoading(false);
        }
    };

    const filtered = orders.filter((o) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
            o.order_number?.toLowerCase().includes(q) ||
            o.pickup_address?.toLowerCase().includes(q) ||
            o.delivery_address?.toLowerCase().includes(q) ||
            o.sender_name?.toLowerCase().includes(q) ||
            o.recipient_name?.toLowerCase().includes(q)
        );
    });

    const formatDate = (d: string) => {
        try {
            return new Date(d).toLocaleDateString("he-IL", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
        } catch { return d; }
    };

    return (
        <CustomerLayout>
            <div className="max-w-4xl mx-auto space-y-6" dir="rtl">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">ההזמנות שלי</h1>
                        <p className="text-slate-500 mt-1">עקוב אחרי כל המשלוחים שלך</p>
                    </div>
                    <Button
                        onClick={() => router.push("/customer/orders/new")}
                        className="bg-brand hover:bg-brand-dark text-navy-950 font-bold shadow-lg shadow-brand/25 gap-2"
                    >
                        <PlusCircle className="w-4 h-4" />
                        הזמנה חדשה
                    </Button>
                </div>

                {/* Search */}
                {orders.length > 0 && (
                    <div className="relative">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="חפש לפי מספר הזמנה, כתובת..."
                            className="pr-10 h-11 bg-white border-slate-200"
                        />
                    </div>
                )}

                {/* Loading State */}
                {loading && (
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <Skeleton key={i} className="h-28 rounded-xl" />
                        ))}
                    </div>
                )}

                {/* Empty State */}
                {!loading && orders.length === 0 && (
                    <Card className="border-dashed border-2 border-slate-200 bg-slate-50/50">
                        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="w-16 h-16 rounded-full bg-brand/10 flex items-center justify-center mb-4">
                                <Package className="w-8 h-8 text-brand" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">עדיין אין הזמנות</h3>
                            <p className="text-slate-500 mb-6 max-w-sm">
                                צור את ההזמנה הראשונה שלך ונמצא שליח במהירות
                            </p>
                            <Button
                                onClick={() => router.push("/customer/orders/new")}
                                className="bg-brand hover:bg-brand-dark text-navy-950 font-bold gap-2"
                            >
                                <PlusCircle className="w-4 h-4" />
                                צור הזמנה חדשה
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* No Results */}
                {!loading && orders.length > 0 && filtered.length === 0 && (
                    <div className="text-center py-12 text-slate-500">
                        <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p>לא נמצאו הזמנות עבור &quot;{search}&quot;</p>
                    </div>
                )}

                {/* Orders List */}
                <div className="space-y-3">
                    {filtered.map((order) => {
                        const status = statusConfig[order.status] || statusConfig.pending;
                        const StatusIcon = status.icon;

                        return (
                            <Card
                                key={order.id}
                                className="border-slate-100 hover:border-brand/30 hover:shadow-lg hover:shadow-brand/5 transition-all duration-200 cursor-pointer group"
                                onClick={() => router.push(`/customer/orders/${order.id}`)}
                            >
                                <CardContent className="p-5">
                                    <div className="flex items-start justify-between gap-4">
                                        {/* Left info */}
                                        <div className="flex-1 min-w-0 space-y-2">
                                            <div className="flex items-center gap-3 flex-wrap">
                                                <span className="font-mono font-bold text-slate-900 text-sm">
                                                    #{order.order_number}
                                                </span>
                                                <Badge variant="outline" className={cn("text-xs font-medium border gap-1", status.color)}>
                                                    <StatusIcon className="w-3 h-3" />
                                                    {status.label}
                                                </Badge>
                                            </div>

                                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-sm text-slate-600">
                                                <span className="flex items-center gap-1.5 truncate">
                                                    <MapPin className="w-3.5 h-3.5 text-brand shrink-0" />
                                                    {order.pickup_address || order.sender_address || "—"}
                                                </span>
                                                <span className="hidden sm:inline text-slate-300">→</span>
                                                <span className="flex items-center gap-1.5 truncate">
                                                    <MapPin className="w-3.5 h-3.5 text-green-500 shrink-0" />
                                                    {order.delivery_address || order.recipient_address || "—"}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-4 text-xs text-slate-400">
                                                <span>{formatDate(order.created_at)}</span>
                                                {order.price && <span className="font-bold text-slate-600">₪{order.price}</span>}
                                            </div>
                                        </div>

                                        {/* Arrow */}
                                        <div className="flex items-center self-center">
                                            <ChevronLeft className="w-5 h-5 text-slate-300 group-hover:text-brand transition-colors" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>
        </CustomerLayout>
    );
}
