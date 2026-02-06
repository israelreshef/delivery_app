"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Package, MapPin, ChevronLeft, ArrowRight, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { api } from "@/lib/api";

interface Order {
    id: number;
    order_number: string;
    created_at: string;
    status: string;
    pickup_address: string;
    delivery_address: string;
    total: number;
    items: string;
}

const statusMap: Record<string, { label: string; color: string }> = {
    'pending': { label: 'ממתין לשליח', color: 'bg-yellow-100 text-yellow-800' },
    'assigned': { label: 'שליח בדרך', color: 'bg-blue-100 text-blue-800' },
    'picked_up': { label: 'נאסף', color: 'bg-purple-100 text-purple-800' },
    'in_transit': { label: 'בנסיעה', color: 'bg-indigo-100 text-indigo-800' },
    'delivered': { label: 'נמסר', color: 'bg-green-100 text-green-800' },
    'cancelled': { label: 'בוטל', color: 'bg-red-100 text-red-800' }
};

export default function OrderHistoryPage() {
    const router = useRouter();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const res = await api.get('/orders');
                const data = res.data;
                // Safely handle if data is { orders: [...] } or [...]
                setOrders(Array.isArray(data) ? data : data.orders || []);
            } catch (error) {
                console.error(error);
                toast.error("שגיאה בטעינת היסטוריה");
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
    }, []);

    const filteredOrders = orders.filter(order => {
        const matchesFilter = filter === 'all' ||
            (filter === 'active' && ['pending', 'assigned', 'picked_up', 'in_transit'].includes(order.status)) ||
            (filter === 'completed' && order.status === 'delivered') ||
            (filter === 'cancelled' && order.status === 'cancelled');

        const matchesSearch = order.order_number.toLowerCase().includes(search.toLowerCase()) ||
            order.pickup_address.includes(search) ||
            order.delivery_address.includes(search);

        return matchesFilter && matchesSearch;
    });

    return (
        <div className="min-h-screen bg-slate-50 pb-20" dir="rtl">
            <div className="bg-white border-b sticky top-0 z-10">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center gap-4 mb-4">
                        <Button variant="ghost" size="icon" onClick={() => router.back()}>
                            <ArrowRight className="w-5 h-5" />
                        </Button>
                        <h1 className="text-2xl font-bold text-slate-900">היסטוריית הזמנות</h1>
                    </div>

                    <div className="flex gap-4 flex-col md:flex-row">
                        <div className="relative flex-1">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                            <Input
                                placeholder="חיפוש לפי מספר הזמנה או כתובת..."
                                className="pr-10"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <Select value={filter} onValueChange={setFilter}>
                            <SelectTrigger className="w-full md:w-[180px]">
                                <SelectValue placeholder="סטטוס" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">הכל</SelectItem>
                                <SelectItem value="active">פעיל</SelectItem>
                                <SelectItem value="completed">הושלם</SelectItem>
                                <SelectItem value="cancelled">בוטל</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-6">
                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-32 bg-slate-200 rounded-xl animate-pulse"></div>
                        ))}
                    </div>
                ) : filteredOrders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                        <Package className="w-16 h-16 mb-4 opacity-20" />
                        <p className="text-lg">לא נמצאו הזמנות</p>
                        <Button variant="link" onClick={() => router.push('/orders/new')}>צור הזמנה חדשה</Button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredOrders.map((order) => {
                            const status = statusMap[order.status] || { label: order.status, color: 'bg-gray-100' };

                            return (
                                <div
                                    key={order.id}
                                    onClick={() => router.push(`/tracking/${order.id}`)}
                                    className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <span className="font-bold text-slate-800 text-lg">
                                                    #{order.order_number.split('-')[0]}...
                                                </span>
                                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                                                    {status.label}
                                                </span>
                                            </div>
                                            <div className="text-sm text-slate-500">
                                                {format(new Date(order.created_at), 'dd/MM/yyyy HH:mm')}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-slate-900">₪{order.total}</div>
                                        </div>
                                    </div>

                                    <div className="space-y-3 relative">
                                        {/* Connecting Line */}
                                        <div className="absolute top-2 bottom-2 right-[7px] w-0.5 bg-slate-100"></div>

                                        <div className="flex items-start gap-3 relative z-10">
                                            <div className="w-4 h-4 rounded-full bg-green-100 border-2 border-green-500 mt-1 shrink-0"></div>
                                            <div className="text-sm truncate pr-1 text-slate-600">{order.pickup_address}</div>
                                        </div>
                                        <div className="flex items-start gap-3 relative z-10">
                                            <div className="w-4 h-4 rounded-full bg-red-100 border-2 border-red-500 mt-1 shrink-0"></div>
                                            <div className="text-sm truncate pr-1 text-slate-600">{order.delivery_address}</div>
                                        </div>
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center">
                                        <span className="text-xs text-slate-400">לחץ למעקב ופרטים נוספים</span>
                                        <ChevronLeft className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors" />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
