"use client";

import { useAuth } from "@/context/AuthContext";
import { API_URL } from "@/lib/auth";
import { api } from "@/lib/api";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    MapPin, Navigation, CheckCircle, XCircle, Clock, DollarSign,
    Star, TrendingUp, Package, AlertCircle, Phone,
    MessageSquare, Camera, FileText, List
} from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import dynamic from 'next/dynamic';
const CourierMap = dynamic(() => import("@/components/courier/CourierMap"), { ssr: false });
import CourierTaskList from "@/components/courier/CourierTaskList";
import SwipeButton from "@/components/ui/swipe-button";
import { useSocket } from "@/context/SocketContext";
import BiometricScanner from "@/components/courier/BiometricScanner";

export default function CourierDashboard() {
    const { user } = useAuth();
    const { socket, isConnected } = useSocket();
    const [availableOrders, setAvailableOrders] = useState<any[]>([]);
    const [activeOrder, setActiveOrder] = useState<any>(null);
    const [stats, setStats] = useState({
        today_deliveries: 0,
        today_earnings: 0,
        avg_rating: 5.0,
        completion_rate: 100
    });
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [reportIssue, setReportIssue] = useState("");
    const [courierLoc, setCourierLoc] = useState<{ lat: number, lng: number } | undefined>(undefined);
    const [viewMode, setViewMode] = useState<'map' | 'list'>('map');

    // POD & Biometric State
    const [isPODOpen, setIsPODOpen] = useState(false);
    const [isBioScannerOpen, setIsBioScannerOpen] = useState(false);
    const [podImage, setPodImage] = useState<string | null>(null);

    // Initial Data Fetch
    useEffect(() => {
        fetchAvailableOrders();
        fetchActiveOrder();
        fetchStats();
    }, []);

    // Socket.IO Event Listeners
    useEffect(() => {
        if (!socket) return;

        // Listen for new order offers
        socket.on('new_order_offer', (data) => {
            toast.info("הצעת משלוח חדשה!");
            // Add mock lat/lng if missing
            const enriched = {
                ...data.order,
                pickup_location: { lat: 32.0800 + (Math.random() * 0.01), lng: 34.7800 + (Math.random() * 0.01), address: data.order.pickup_address },
                delivery_location: { lat: 32.0850 + (Math.random() * 0.01), lng: 34.7850 + (Math.random() * 0.01), address: data.order.delivery_address }
            };
            setAvailableOrders(prev => [...prev, enriched]);
        });

        // Listen for status updates
        socket.on('delivery_status_update', (data) => {
            if (activeOrder && data.delivery_id === activeOrder.id) {
                toast.success(`סטטוס עודכן: ${data.status}`);
                setActiveOrder((prev: any) => ({ ...prev, status: data.status }));
            }
        });

        return () => {
            socket.off('new_order_offer');
            socket.off('delivery_status_update');
        };
    }, [socket, activeOrder]);

    // Real-time Location Tracking
    useEffect(() => {
        if (!navigator.geolocation) return;

        const watchId = navigator.geolocation.watchPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                setCourierLoc({ lat: latitude, lng: longitude });

                // Emit location update via Socket
                if (isConnected && socket) {
                    socket.emit('courier_location_update', {
                        courier_id: user?.id,
                        lat: latitude,
                        lng: longitude
                    });
                }
            },
            (err) => console.error(err),
            { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
        );

        return () => navigator.geolocation.clearWatch(watchId);
    }, [socket, isConnected, user?.id]);

    const fetchAvailableOrders = async () => {
        try {
            const res = await api.get('/couriers/available-orders');
            if (res.status === 200) {
                const data = res.data;
                // Add mock lat/lng if missing for map demo
                const enriched = data.map((o: any) => ({
                    ...o,
                    pickup_location: { lat: 32.0800 + (Math.random() * 0.01), lng: 34.7800 + (Math.random() * 0.01), address: o.pickup_address },
                    delivery_location: { lat: 32.0850 + (Math.random() * 0.01), lng: 34.7850 + (Math.random() * 0.01), address: o.delivery_address }
                }));
                setAvailableOrders(enriched);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const fetchActiveOrder = async () => {
        try {
            const res = await api.get('/couriers/active-order');
            const data = res.data;
            if (data && data.order_number) {
                // Add mock locations if missing
                const enriched = {
                    ...data,
                    pickup_location: { lat: 32.0820, lng: 34.7820, address: data.pickup_address },
                    delivery_location: { lat: 32.0870, lng: 34.7870, address: data.delivery_address }
                };
                setActiveOrder(enriched);
            } else {
                setActiveOrder(null);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const fetchStats = async () => {
        try {
            const res = await api.get('/couriers/stats');
            setStats(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    const handleAcceptOrder = async (orderId: number) => {
        try {
            await api.post(`/couriers/orders/${orderId}/accept`);
            toast.success("ההצעה התקבלה בהצלחה!");
            fetchActiveOrder();
            setAvailableOrders(prev => prev.filter(o => o.id !== orderId));
            setSelectedOrder(null);
        } catch (error) {
            toast.error("תקלה בתקשורת או בהצעה");
        }
    };

    const handleRejectOrder = async (orderId: number) => {
        try {
            await api.post(`/couriers/orders/${orderId}/reject`);
            toast.success("ההצעה נדחתה");
            setAvailableOrders(prev => prev.filter(o => o.id !== orderId));
            setSelectedOrder(null);
        } catch (error) {
            toast.error("תקלה בתקשורת");
        }
    };

    const handleUpdateStatus = async (status: string, podData: string | null = null) => {
        if (!activeOrder) return;
        try {
            const body: any = { status };
            if (podData) body.pod_image = podData;

            await api.post(`/couriers/orders/${activeOrder.id}/status`, body);

            toast.success("הסטטוס עודכן!");
            fetchActiveOrder();
            setIsPODOpen(false);
            setPodImage(null);
        } catch (error) {
            toast.error("שגיאה בעדכון סטטוס");
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                setPodImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const openWaze = (address: string) => {
        const wazeUrl = `https://waze.com/ul?q=${encodeURIComponent(address)}`;
        window.open(wazeUrl, '_blank');
    };

    return (
        <div className="space-y-4">
            <Tabs defaultValue={activeOrder ? "active" : "map"} className="space-y-4">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="map">מפה</TabsTrigger>
                    <TabsTrigger value="active">
                        פעיל
                        {activeOrder && <span className="mr-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />}
                    </TabsTrigger>
                    <TabsTrigger value="reports">דוחות</TabsTrigger>
                    <TabsTrigger value="forms">טפסים</TabsTrigger>
                </TabsList>

                {/* Map/List Tab */}
                <TabsContent value="map" className="space-y-4">
                    <div className="flex justify-end px-2">
                        <div className="bg-slate-100 p-1 rounded-lg inline-flex">
                            <Button
                                variant={viewMode === 'map' ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => setViewMode('map')}
                                className={viewMode === 'map' ? 'shadow-sm text-blue-600 bg-white' : 'text-slate-500'}
                                aria-label="תצוגת מפה"
                            >
                                <MapPin className="w-4 h-4 mr-1" /> מפה
                            </Button>
                            <Button
                                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => setViewMode('list')}
                                className={viewMode === 'list' ? 'shadow-sm text-blue-600 bg-white' : 'text-slate-500'}
                                aria-label="תצוגת רשימה"
                            >
                                <List className="w-4 h-4 mr-1" /> רשימה
                            </Button>
                        </div>
                    </div>

                    {viewMode === 'map' ? (
                        <Card className="overflow-hidden border-0 shadow-md">
                            <div className="relative h-[65vh] md:h-[500px] w-full">
                                <CourierMap
                                    courierLocation={courierLoc}
                                    orders={availableOrders}
                                    height="100%"
                                />

                                {/* Floating Order Cards Overlay */}
                                <div className="absolute bottom-4 left-4 right-4 z-[500] max-h-[40vh] overflow-y-auto space-y-2 pointer-events-auto">
                                    {availableOrders.length > 0 ? (
                                        availableOrders.map((order) => (
                                            <Card key={order.id} className="bg-white/95 backdrop-blur shadow-lg border-blue-100">
                                                <CardContent className="p-4">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div>
                                                            <p className="font-bold text-lg">#{order.order_number}</p>
                                                            <p className="text-sm text-slate-600 truncate">{order.package_description}</p>
                                                        </div>
                                                        <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                                                            ₪{order.estimated_price || 25}
                                                        </Badge>
                                                    </div>
                                                    <div className="space-y-1 mb-3">
                                                        <p className="text-xs text-slate-500 truncate">📍 {order.pickup_address}</p>
                                                        <p className="text-xs text-slate-500 truncate">🏁 {order.delivery_address}</p>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Button onClick={() => handleAcceptOrder(order.id)} className="flex-1 bg-blue-600 h-8 text-xs">קבל</Button>
                                                        <Button onClick={() => handleRejectOrder(order.id)} variant="outline" className="flex-1 h-8 text-xs">דחה</Button>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))
                                    ) : (
                                        <Card className="bg-white/95 backdrop-blur">
                                            <CardContent className="p-4 text-center">
                                                <Clock className="w-6 h-6 mx-auto mb-2 text-slate-400" />
                                                <p className="text-sm font-medium">אין הצעות זמינות</p>
                                                <p className="text-xs text-slate-500">אנחנו מחפשים עבורך...</p>
                                            </CardContent>
                                        </Card>
                                    )}
                                </div>
                            </div>
                        </Card>
                    ) : (
                        <CourierTaskList
                            orders={availableOrders}
                            onAccept={handleAcceptOrder}
                            onReject={handleRejectOrder}
                        />
                    )}
                </TabsContent>

                {/* Active Order Tab */}
                <TabsContent value="active">
                    {activeOrder ? (
                        <div className="space-y-4">
                            <Card className="overflow-hidden">
                                <div className="h-48 w-full">
                                    <CourierMap
                                        courierLocation={courierLoc}
                                        orders={[activeOrder]}
                                        height="100%"
                                    />
                                </div>
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-center">
                                        <CardTitle>הזמנה #{activeOrder.order_number}</CardTitle>
                                        <Badge className={
                                            activeOrder.status === 'delivered' ? 'bg-green-500' : 'bg-blue-500'
                                        }>{activeOrder.status}</Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Actions */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <Button
                                            variant="outline"
                                            onClick={() => openWaze(activeOrder.pickup_address)}
                                            className="w-full text-blue-600 border-blue-200 hover:bg-blue-50"
                                        >
                                            <Navigation className="w-4 h-4 ml-2" /> Waze לאיסוף
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() => openWaze(activeOrder.delivery_address)}
                                            className="w-full text-green-600 border-green-200 hover:bg-green-50"
                                        >
                                            <Navigation className="w-4 h-4 ml-2" /> Waze למסירה
                                        </Button>
                                    </div>

                                    {/* Stop Points */}
                                    <div className="space-y-4 relative">
                                        <div className="absolute top-2 bottom-2 right-[19px] w-0.5 bg-slate-200" />

                                        <div className="relative flex gap-4">
                                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0 z-10 border-4 border-white shadow-sm">
                                                <span className="text-blue-600 font-bold">1</span>
                                            </div>
                                            <div>
                                                <p className="font-medium">איסוף</p>
                                                <p className="text-sm text-slate-600 mb-1">{activeOrder.pickup_address}</p>
                                                <div className="mt-2 w-full max-w-[200px]">
                                                    {activeOrder.status === 'assigned' ? (
                                                        <SwipeButton
                                                            text="החלק לאיסוף >>"
                                                            completedText="נאסף בהצלחה!"
                                                            onComplete={() => handleUpdateStatus('picked_up')}
                                                            color="blue"
                                                            className="h-10 text-sm"
                                                        />
                                                    ) : (
                                                        <Button variant="outline" size="sm" disabled className="w-full h-10">
                                                            נאסף
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="relative flex gap-4">
                                            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0 z-10 border-4 border-white shadow-sm">
                                                <span className="text-green-600 font-bold">2</span>
                                            </div>
                                            <div>
                                                <p className="font-medium">מסירה</p>
                                                <p className="text-sm text-slate-600 mb-1">{activeOrder.delivery_address}</p>
                                                <p className="text-sm font-medium mb-2">{activeOrder.recipient_phone}</p>
                                                <div className="flex gap-2 mt-2 w-full max-w-[200px]">
                                                    <SwipeButton
                                                        text="החלק למסירה >>"
                                                        completedText="מאמת ופותח מצלמה..."
                                                        color="green"
                                                        disabled={activeOrder.status !== 'picked_up' && activeOrder.status !== 'in_transit'}
                                                        onComplete={() => {
                                                            if (activeOrder.biometric_verification_required) {
                                                                setIsBioScannerOpen(true);
                                                            } else {
                                                                setIsPODOpen(true);
                                                            }
                                                        }}
                                                        className="h-10 text-sm"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    ) : (
                        <div className="text-center py-10">
                            <Package className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                            <p className="text-lg text-slate-600">אין הצעה פעילה</p>
                            <Button variant="link" onClick={() => document.getElementById('tab-map')?.click()}>
                                חפש הצעות במפה
                            </Button>
                        </div>
                    )}
                </TabsContent>

                {/* Reports Tab */}
                <TabsContent value="reports">
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <Card>
                            <CardContent className="p-4 text-center">
                                <p className="text-2xl font-bold">{stats.today_deliveries}</p>
                                <p className="text-xs text-slate-500">הצעות שהושלמו</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4 text-center">
                                <p className="text-2xl font-bold text-green-600">₪{stats.today_earnings}</p>
                                <p className="text-xs text-slate-500">הכנסות</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4 text-center">
                                <p className="text-2xl font-bold text-yellow-500">{stats.avg_rating}</p>
                                <p className="text-xs text-slate-500">דירוג</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4 text-center">
                                <p className="text-2xl font-bold text-purple-600">{stats.completion_rate}%</p>
                                <p className="text-xs text-slate-500">הצלחה</p>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Forms Tab */}
                <TabsContent value="forms">
                    <div className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">דיווח על בעיה</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <Textarea
                                    value={reportIssue}
                                    onChange={(e) => setReportIssue(e.target.value)}
                                    placeholder="פרט את הבעיה..."
                                />
                                <Button className="w-full" onClick={() => {
                                    toast.success("נשלח");
                                    setReportIssue("");
                                }}>שלח</Button>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4 space-y-2">
                                <Button variant="outline" className="w-full justify-start gap-2">
                                    <Phone className="w-4 h-4" /> התקשר למוקד
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>

            {/* Biometric Scanner Dialog */}
            <BiometricScanner
                open={isBioScannerOpen}
                onClose={() => setIsBioScannerOpen(false)}
                onVerified={() => {
                    setIsBioScannerOpen(false);
                    // After biometric success, proceed to POD
                    setIsPODOpen(true);
                }}
            />

            {/* POD Dialog */}
            <Dialog open={isPODOpen} onOpenChange={setIsPODOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>הוכחת מסירה (POD)</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 text-center">
                        <p className="text-sm text-slate-600">אנא צלם את החבילה ליד הדלת או החתם את הלקוח.</p>

                        <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 hover:bg-slate-50 transition-colors cursor-pointer relative">
                            <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                onChange={handleFileChange}
                            />
                            {podImage ? (
                                <img src={podImage} alt="POD Preview" className="max-h-48 mx-auto rounded" />
                            ) : (
                                <div className="flex flex-col items-center gap-2">
                                    <Camera className="w-10 h-10 text-slate-400" />
                                    <span className="text-sm font-medium text-slate-500">לחץ לצילום</span>
                                </div>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsPODOpen(false)}>ביטול</Button>
                        <Button onClick={() => handleUpdateStatus('delivered', podImage)} disabled={!podImage}>
                            אשר מסירה
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
