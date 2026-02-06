"use client";

import { useEffect, useState } from "react";
import CustomerLayout from "@/components/customer/CustomerLayout";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, MapPin, Truck, Package, Clock, CheckCircle, Phone, Calendar, ShieldCheck, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import CourierMap from "@/components/courier/CourierMap";
import { toast } from "sonner";
// Import socket for realtime updates
import { io } from "socket.io-client";

interface OrderTrackingPageProps {
    params: {
        id: string;
    };
}

export default function OrderTrackingPage({ params }: OrderTrackingPageProps) {
    const router = useRouter();
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [courierLocation, setCourierLocation] = useState<{ lat: number; lng: number } | undefined>(undefined);

    useEffect(() => {
        fetchOrder();

        // Socket connection for realtime updates
        const socket = io('http://localhost:5000');

        socket.on('connect', () => {
            console.log('Connected to websocket');
            socket.emit('join_order_room', { order_id: params.id });
        });

        socket.on('order_update', (data: any) => {
            if (data.order_id === Number(params.id)) {
                // Refresh order data on status change
                fetchOrder();
                toast.info("סטטוס ההזמנה התעדכן!");
            }
        });

        socket.on('courier_location_update', (data: any) => {
            if (data.order_id === Number(params.id)) {
                setCourierLocation(data.location);
            }
        });

        return () => {
            socket.disconnect();
        };
    }, [params.id]);

    const fetchOrder = async () => {
        try {
            const res = await api.get(`/orders/${params.id}`);
            setOrder(res.data);

            // If courier is assigned and has a starting location (mock or real), set it
            // In a real app, we might get this from the courier's last known location endpoint
            if (res.data.courier) {
                // Mock location if real one isn't available yet, or fetch from separate endpoint
                // For now relying on socket updates or initial static data if backend provides it
            }
        } catch (error) {
            console.error("Failed to load order", error);
            toast.error("לא ניתן לטעון את פרטי ההזמנה");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <CustomerLayout>
                <div className="space-y-6">
                    <Skeleton className="h-12 w-64" />
                    <div className="grid md:grid-cols-3 gap-6">
                        <Skeleton className="h-[400px] md:col-span-2 rounded-xl" />
                        <Skeleton className="h-[400px] rounded-xl" />
                    </div>
                </div>
            </CustomerLayout>
        );
    }

    if (!order) {
        return (
            <CustomerLayout>
                <div className="text-center py-20">
                    <h2 className="text-2xl font-bold text-slate-800">הזמנה לא נמצאה</h2>
                    <Button onClick={() => router.push('/customer/dashboard')} className="mt-4">
                        חזור לדשבורד
                    </Button>
                </div>
            </CustomerLayout>
        );
    }

    const statusMap: Record<string, { label: string; color: string; icon: any; step: number }> = {
        'pending': { label: 'התקבל במערכת', color: 'bg-yellow-500', icon: Clock, step: 1 },
        'assigned': { label: 'שליח בדרך לאיסוף', color: 'bg-blue-500', icon: Truck, step: 2 },
        'picked_up': { label: 'נאסף - בדרך ליעד', color: 'bg-indigo-500', icon: Package, step: 3 },
        'delivered': { label: 'נמסר בהצלחה', color: 'bg-green-500', icon: CheckCircle, step: 4 },
        'cancelled': { label: 'בוטל', color: 'bg-red-500', icon: CheckCircle, step: 0 },
    };

    const currentStatus = statusMap[order.status] || statusMap['pending'];

    // Prepare map data
    // Assuming backend returns addresses. Geocoding might be needed if lat/lng missing.
    // For this demo, we assume the backend might mock or provide lat/lng, 
    // OR we just show the map centered on Tel Aviv if data missing, 
    // but better to pass the address string to the map component if it supported geocoding.
    // Since CourierMap takes Location objects with lat/lng, we will mock them for now if missing 
    // to ensure the visual works. In production, geocoding API is used.

    // Mock Coordinates generation based on string length hash or random for demo consistency if missing
    const getMockCoords = (str: string, offset: number) => ({
        lat: 32.0853 + (offset * 0.01),
        lng: 34.7818 + (offset * 0.01),
        address: str
    });

    const pickupLoc = order.pickup?.location || getMockCoords(order.pickup.address, 1);
    const deliveryLoc = order.delivery?.location || getMockCoords(order.delivery.address, -1);

    // Map needs 'orders' array format
    const mapOrders = [{
        id: order.id,
        order_number: order.order_number,
        pickup_location: pickupLoc,
        delivery_location: deliveryLoc,
        status: order.status
    }];

    return (
        <CustomerLayout>
            <div className="space-y-6 max-w-6xl mx-auto pb-12">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Button variant="ghost" size="sm" onClick={() => router.push('/customer/dashboard')} className="text-slate-400 hover:text-slate-600 -mr-2">
                                <ArrowRight className="w-4 h-4 ml-1" /> חזרה
                            </Button>
                        </div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                            הזמנה #{order.order_number}
                            <Badge className={`${currentStatus.color} hover:${currentStatus.color} text-white border-0 px-3 py-1 text-base`}>
                                <currentStatus.icon className="w-4 h-4 ml-2" />
                                {currentStatus.label}
                            </Badge>
                        </h1>
                        <p className="text-slate-500 flex items-center gap-2 mt-2">
                            <Calendar className="w-4 h-4" />
                            נוצר ב- {new Date(order.created_at).toLocaleString('he-IL')}
                        </p>
                    </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-6 h-full">

                    {/* Main Content (Map & Details) */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Map Card */}
                        <Card className="overflow-hidden border-0 shadow-lg shadow-slate-200/50">
                            <div className="bg-slate-100 relative h-[400px] w-full z-0">
                                <CourierMap
                                    height="400px"
                                    orders={mapOrders}
                                    courierLocation={courierLocation}
                                />
                                {order.status === 'assigned' && !courierLocation && (
                                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1.5 rounded-full text-xs font-medium shadow-sm z-[400]">
                                        ממתין למיקום שליח...
                                    </div>
                                )}
                            </div>
                        </Card>

                        {/* Order Details Grid */}
                        <div className="grid md:grid-cols-2 gap-4">
                            <Card className="border-slate-100 shadow-sm">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-blue-500" />
                                        איסוף
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="font-semibold text-slate-800">{order.pickup.address}</p>
                                    <p className="text-sm text-slate-500 mt-1">{order.pickup.contact} • {order.pickup.phone}</p>
                                    {order.pickup.notes && (
                                        <div className="mt-2 bg-slate-50 p-2 rounded text-xs text-slate-600">
                                            הערות: {order.pickup.notes}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <Card className="border-slate-100 shadow-sm">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-green-500" />
                                        מסירה
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="font-semibold text-slate-800">{order.delivery.address}</p>
                                    <p className="text-sm text-slate-500 mt-1">{order.delivery.recipient} • {order.delivery.phone}</p>
                                    {order.delivery.notes && (
                                        <div className="mt-2 bg-slate-50 p-2 rounded text-xs text-slate-600">
                                            הערות: {order.delivery.notes}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Sidebar Status & Info */}
                    <div className="space-y-6">

                        {/* Timeline */}
                        <Card className="border-0 shadow-lg shadow-slate-200/50">
                            <CardHeader>
                                <CardTitle>סטטוס משלוח</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-0 relative">
                                    {/* Vertical Line */}
                                    <div className="absolute top-2 bottom-2 right-[15px] w-0.5 bg-slate-100 z-0"></div>

                                    {[
                                        { label: 'הזמנה התקבלה', step: 1, icon: Clock },
                                        { label: 'שליח שובץ', step: 2, icon: Truck },
                                        { label: 'נאסף מהשולח', step: 3, icon: Package },
                                        { label: 'נמסר ליעד', step: 4, icon: CheckCircle },
                                    ].map((s) => {
                                        const isCompleted = currentStatus.step >= s.step;
                                        const isCurrent = currentStatus.step === s.step;

                                        return (
                                            <div key={s.step} className="relative z-10 flex items-center gap-4 py-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors duration-300
                                                    ${isCompleted || isCurrent ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-300'}
                                                `}>
                                                    <s.icon className="w-4 h-4" />
                                                </div>
                                                <span className={`font-medium ${isCompleted || isCurrent ? 'text-slate-900' : 'text-slate-400'}`}>
                                                    {s.label}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Courier Info */}
                        {order.courier ? (
                            <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-0 shadow-lg shadow-blue-500/20">
                                <CardHeader>
                                    <CardTitle className="text-white flex items-center gap-2">
                                        <Truck className="w-5 h-5" />
                                        השליח שלך
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-xl font-bold">
                                            {order.courier.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-bold text-lg">{order.courier.name}</p>
                                            <p className="text-blue-100 text-sm">כרגע במשלוח</p>
                                        </div>
                                    </div>
                                    <Button variant="secondary" className="w-full gap-2 text-blue-700 hover:text-blue-800" asChild>
                                        <a href={`tel:${order.courier.phone}`}>
                                            <Phone className="w-4 h-4" />
                                            התקשר לשליח
                                        </a>
                                    </Button>
                                </CardContent>
                            </Card>
                        ) : (
                            <Card className="bg-slate-50 border-dashed border-2 border-slate-200">
                                <CardContent className="p-6 text-center text-slate-500">
                                    <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin opacity-50" />
                                    <p>מחפש שליח...</p>
                                </CardContent>
                            </Card>
                        )}

                        {/* Payment Info */}
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base">סיכום תשלום</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span>דמי משלוח ({order.package?.size})</span>
                                    <span>₪{order.price}</span>
                                </div>
                                {order.insurance_required && (
                                    <div className="flex justify-between text-sm text-green-600">
                                        <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> ביטוח</span>
                                        <span>כלול</span>
                                    </div>
                                )}
                                <div className="border-t pt-2 mt-2 flex justify-between font-bold text-lg">
                                    <span>סה"כ</span>
                                    <span>₪{order.price}</span>
                                </div>
                            </CardContent>
                        </Card>

                    </div>
                </div>
            </div>
        </CustomerLayout>
    );
}
