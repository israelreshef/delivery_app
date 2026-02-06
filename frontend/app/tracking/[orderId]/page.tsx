"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Copy, Phone, User, Package, MapPin, Clock, CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { api } from "@/lib/api";

// Dynamically import Map to avoid SSR issues
const TrackingMap = dynamic(() => import("@/components/tracking/TrackingMap"), {
    ssr: false,
    loading: () => <div className="h-full w-full bg-slate-100 animate-pulse rounded-xl flex items-center justify-center">טוען מפה...</div>
});

interface OrderDetails {
    id: number;
    order_number: string;
    status: 'pending' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';
    customer: { name: string; phone: string };
    pickup: { address: string; contact: string; phone: string; coords: { lat: number; lon: number } };
    delivery: { address: string; contact: string; phone: string; coords: { lat: number; lon: number } };
    package: { size: string; description: string };
    courier?: { name: string; phone: string; location?: { lat: number; lon: number } };
    status_history: { status: string; timestamp: string; notes?: string }[];
    created_at: string;
    notes?: string;
    price: number;
}

const statusMap = {
    'pending': { label: 'מחפש שליח', step: 1, color: 'bg-yellow-500' },
    'assigned': { label: 'שליח בדרך', step: 2, color: 'bg-blue-500' },
    'picked_up': { label: 'באיסוף', step: 3, color: 'bg-purple-500' },
    'in_transit': { label: 'בנסיעה', step: 4, color: 'bg-indigo-500' },
    'delivered': { label: 'נמסר', step: 5, color: 'bg-green-500' },
    'cancelled': { label: 'בוטל', step: 0, color: 'bg-red-500' }
};

const steps = [
    { key: 'pending', label: 'הזמנה נקלטה' },
    { key: 'assigned', label: 'שליח שויך' },
    { key: 'picked_up', label: 'נאסף' },
    { key: 'delivered', label: 'נמסר ליעד' }
];

export default function TrackingPage() {
    const params = useParams();
    // Use type assertion for params.orderId to ensure it's treated as a string or undefined
    const orderId = params?.orderId as string;
    const [order, setOrder] = useState<OrderDetails | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!orderId) return;

        const fetchOrder = async () => {
            try {
                // api client automatically handles token if present in sessionStorage
                // If public, it sends without token, which is likely intended for tracking if allowed
                const res = await api.get(`/orders/${orderId}`);
                // axios throws on error status by default
                setOrder(res.data);
            } catch (error) {
                console.error("Error fetching order:", error);
                toast.error("לא ניתן לטעון פרטי משלוח");
            } finally {
                setLoading(false);
            }
        };

        fetchOrder();

        // Poll for updates every 10 seconds
        const interval = setInterval(fetchOrder, 10000);
        return () => clearInterval(interval);
    }, [orderId]);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success("הועתק ללוח");
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
                <Package className="w-16 h-16 text-slate-300 mb-4" />
                <h1 className="text-2xl font-bold text-slate-800">הזמנה לא נמצאה</h1>
                <p className="text-slate-500 mt-2">יתכן שמספר ההזמנה שגוי או שהמשלוח בוטל.</p>
                <Button className="mt-6" onClick={() => window.location.href = '/'}>חזרה לדף הבית</Button>
            </div>
        );
    }

    const currentStatus = statusMap[order.status] || { label: order.status, step: 0, color: 'bg-slate-500' };

    return (
        <div className="min-h-screen bg-slate-50 pb-20" dir="rtl">
            {/* Header */}
            <div className="bg-white border-b sticky top-0 z-20">
                <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
                    <div>
                        <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            מעקב משלוח
                            <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-mono">
                                {order.order_number}
                            </span>
                        </h1>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => copyToClipboard(window.location.href)}>
                        <Copy className="w-4 h-4 ml-2" />
                        שתף
                    </Button>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

                {/* Status Card */}
                <div className="bg-white rounded-2xl shadow-sm p-6">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <div className="text-sm text-slate-500 mb-1">סטטוס נוכחי</div>
                            <div className={`text-2xl font-bold ${currentStatus.color.replace('bg-', 'text-')}`}>
                                {currentStatus.label}
                            </div>
                            <div className="text-sm text-slate-400 mt-1">
                                {order.status_history[0] && format(new Date(order.status_history[0].timestamp), "HH:mm, dd/MM/yyyy")}
                            </div>
                        </div>
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg ${currentStatus.color}`}>
                            <Package className="w-6 h-6" />
                        </div>
                    </div>

                    {/* Timeline */}
                    <div className="relative">
                        <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-100 -translate-y-1/2 z-0"></div>
                        <div
                            className={`absolute top-1/2 right-0 h-1 transition-all duration-1000 ease-out z-0 ${currentStatus.color}`}
                            style={{ width: `${(currentStatus.step / 5) * 100}%` }}
                        ></div>

                        <div className="relative z-10 flex justify-between">
                            {steps.map((step, index) => {
                                const isCompleted = index < currentStatus.step; // Simplified logic
                                return (
                                    <div key={step.key} className="flex flex-col items-center gap-2">
                                        <div className={`w-4 h-4 rounded-full border-2 ${isCompleted ? `bg-white ${currentStatus.color.replace('bg-', 'border-')}` : 'bg-slate-100 border-slate-300'}`}>
                                            {isCompleted && <div className={`w-full h-full rounded-full ${currentStatus.color} scale-50`}></div>}
                                        </div>
                                        <span className={`text-xs ${isCompleted ? 'font-bold text-slate-800' : 'text-slate-400'}`}>
                                            {step.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Map */}
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden h-[400px] border border-slate-200 relative">
                    <TrackingMap
                        pickup={{
                            lat: order.pickup.coords?.lat || 32.0853,
                            lng: order.pickup.coords?.lon || 34.7818,
                            address: order.pickup.address
                        }}
                        delivery={{
                            lat: order.delivery.coords?.lat || 32.109333,
                            lng: order.delivery.coords?.lon || 34.855499,
                            address: order.delivery.address
                        }}
                        courier={order.courier?.location ? {
                            lat: order.courier.location.lat,
                            lng: order.courier.location.lon
                        } : undefined}
                        status={order.status}
                    />

                    {/* Floating Courier Info (if assigned) */}
                    {order.courier && order.status !== 'pending' && (
                        <div className="absolute bottom-4 right-4 z-[9999] bg-white p-4 rounded-xl shadow-lg border border-slate-100 max-w-[250px]">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                                    <User className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="text-xs text-slate-500">השליח שלך</div>
                                    <div className="font-bold text-slate-800">{order.courier.name}</div>
                                </div>
                            </div>
                            <div className="mt-3 flex gap-2">
                                <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => window.location.href = `tel:${order.courier?.phone}`}>
                                    <Phone className="w-3 h-3 ml-1" />
                                    התקשר
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
                        <h3 className="font-semibold text-slate-700 flex items-center gap-2 mb-4">
                            <MapPin className="w-4 h-4 text-green-500" />
                            פרטי איסוף
                        </h3>
                        <div className="space-y-3">
                            <div>
                                <div className="text-xs text-slate-400">כתובת</div>
                                <div className="text-slate-800">{order.pickup.address}</div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-400">איש קשר</div>
                                <div className="text-slate-800">{order.pickup.contact}</div>
                            </div>
                            {order.pickup.phone && (
                                <div className="inline-flex items-center text-sm text-slate-500 bg-slate-50 px-2 py-1 rounded">
                                    <Phone className="w-3 h-3 ml-2" />
                                    {order.pickup.phone}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
                        <h3 className="font-semibold text-slate-700 flex items-center gap-2 mb-4">
                            <MapPin className="w-4 h-4 text-red-500" />
                            פרטי מסירה
                        </h3>
                        <div className="space-y-3">
                            <div>
                                <div className="text-xs text-slate-400">כתובת</div>
                                <div className="text-slate-800">{order.delivery.address}</div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-400">מקבל</div>
                                <div className="text-slate-800">{order.delivery.contact}</div>
                            </div>
                            {order.delivery.phone && (
                                <div className="inline-flex items-center text-sm text-slate-500 bg-slate-50 px-2 py-1 rounded">
                                    <Phone className="w-3 h-3 ml-2" />
                                    {order.delivery.phone}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Package Info */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
                    <h3 className="font-semibold text-slate-700 flex items-center gap-2 mb-2">
                        <Package className="w-4 h-4 text-blue-500" />
                        פרטי חבילה
                    </h3>
                    <div className="flex gap-4 items-center">
                        <div className="bg-slate-100 px-3 py-1 rounded text-sm text-slate-700">
                            גודל: <strong>{order.package.size === 'envelope' ? 'מעטפה' : order.package.size}</strong>
                        </div>
                        {order.package.description && (
                            <div className="text-sm text-slate-600 border-r border-slate-300 pr-4">
                                "{order.package.description}"
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
