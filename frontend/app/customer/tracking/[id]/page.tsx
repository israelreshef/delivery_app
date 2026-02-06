"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { Header } from "@/components/dashboard/header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Phone, Truck, CheckCircle, Clock, Package, User } from "lucide-react";
import { api } from "@/lib/api";
import ChatComponent from "@/components/ChatComponent";
import io from 'socket.io-client';

// Mock Map Component (In real app, use Google Maps / Leaflet)
const MapView = ({ courierParams, pickup, delivery }: any) => {
    return (
        <div className="bg-slate-200 w-full h-full rounded-lg relative overflow-hidden flex items-center justify-center">
            {/* Background Grid */}
            <div className="absolute inset-0 opacity-10"
                style={{ backgroundImage: 'radial-gradient(#444 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
            </div>

            {/* Courier Marker */}
            {courierParams && (
                <div className="absolute transition-all duration-1000 ease-linear flex flex-col items-center z-20"
                    style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                    <div className="bg-blue-600 p-2 rounded-full shadow-lg ring-4 ring-blue-600/20">
                        <Truck className="h-6 w-6 text-white" />
                    </div>
                    <div className="bg-white px-2 py-1 rounded shadow text-xs font-bold mt-1">
                        השליח כאן
                    </div>
                </div>
            )}

            {/* Path visualization would go here */}
            <div className="text-slate-500 font-medium">מפת מעקב בזמן אמת</div>
        </div>
    );
};

export default function TrackingPage() {
    const params = useParams();
    const [order, setOrder] = useState<any>(null);
    const [courierLocation, setCourierLocation] = useState<any>(null);
    const [eta, setEta] = useState<string>("15 דקות");
    const socketRef = useRef<any>(null);
    const [showChat, setShowChat] = useState(false);

    useEffect(() => {
        fetchOrder();

        // Socket Connection
        socketRef.current = io('http://localhost:5000');
        socketRef.current.emit('join', { role: 'customer', id: 'guest' }); // In real app use user ID

        // Listen for specific delivery updates
        socketRef.current.emit('join', { role: 'tracking', room: `delivery_${params.id}` });

        socketRef.current.on('courier_location_update', (data: any) => {
            console.log("Got location update", data);
            setCourierLocation(data);
            // Here you would recalculate ETA based on new location
        });

        socketRef.current.on('order_status_update', (data: any) => {
            fetchOrder(); // Refresh full order details on status change
        });

        return () => {
            socketRef.current.disconnect();
        };
    }, []);

    const fetchOrder = async () => {
        try {
            const res = await api.get(`/orders/${params.id}`);
            setOrder(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    if (!order) return <div className="min-h-screen flex items-center justify-center">טוען נתונים...</div>;

    const steps = [
        { id: 'pending', label: 'התקבל', icon: Clock },
        { id: 'assigned', label: 'שובץ', icon: CheckCircle },
        { id: 'picked_up', label: 'נאסף', icon: Package },
        { id: 'in_transit', label: 'בדרך', icon: Truck },
        { id: 'delivered', label: 'נמסר', icon: MapPin },
    ];

    const currentStepIndex = steps.findIndex(s => s.id === order.status);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col" dir="rtl">
            <Header />

            <main className="flex-1 p-4 md:p-8 max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Right Column - Status & Details */}
                <div className="lg:col-span-1 space-y-6">
                    <Card>
                        <CardContent className="p-6">
                            <h1 className="text-2xl font-bold mb-2">משלוח #{order.order_number}</h1>
                            <p className="text-muted-foreground mb-6">צפוי להגיע: {new Date(order.created_at).toLocaleTimeString()} (משוער)</p>

                            {/* Timeline */}
                            <div className="space-y-6 relative">
                                <div className="absolute right-[15px] top-2 bottom-2 w-0.5 bg-slate-100" />
                                {steps.map((step, i) => {
                                    const isCompleted = i <= currentStepIndex;
                                    const isCurrent = i === currentStepIndex;
                                    const Icon = step.icon;

                                    return (
                                        <div key={step.id} className="relative flex gap-4 items-center">
                                            <div className={`z-10 w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors
                                                ${isCompleted ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-slate-200 text-slate-300'}
                                                ${isCurrent ? 'ring-4 ring-green-100' : ''}
                                            `}>
                                                <Icon className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className={`font-medium ${isCompleted ? 'text-slate-900' : 'text-slate-400'}`}>
                                                    {step.label}
                                                </p>
                                                {isCurrent && <p className="text-xs text-green-600 font-medium animate-pulse">בטיפול כעת...</p>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Courier Info */}
                    {order.courier && (
                        <Card>
                            <CardContent className="p-6">
                                <h3 className="font-bold mb-4">השליח שלך</h3>
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="h-12 w-12 bg-slate-200 rounded-full flex items-center justify-center">
                                        <User className="h-6 w-6 text-slate-500" />
                                    </div>
                                    <div>
                                        <p className="font-bold">{order.courier.name}</p>
                                        <p className="text-sm text-slate-500">רכב: {order.courier.vehicle}</p>
                                    </div>
                                    <div className="mr-auto">
                                        <Button size="icon" variant="outline" className="rounded-full">
                                            <Phone className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                                <Button className="w-full" onClick={() => setShowChat(!showChat)}>
                                    {showChat ? 'סגור צ\'אט' : 'צ\'אט עם השליח'}
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Left Column - Map & Chat */}
                <div className="lg:col-span-2 flex flex-col gap-6 h-[600px] lg:h-auto">
                    {showChat ? (
                        <ChatComponent
                            roomId={`order_${order.id}`}
                            userType="customer"
                            otherName="השליח"
                        />
                    ) : (
                        <Card className="flex-1 overflow-hidden flex flex-col">
                            <div className="flex-1 relative">
                                <MapView
                                    courierParams={courierLocation}
                                    pickup={order.pickup}
                                    delivery={order.delivery}
                                />

                                {/* Overlay Stats */}
                                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur p-4 rounded-xl shadow-lg border space-y-1">
                                    <p className="text-xs text-muted-foreground">מרחק ליעד</p>
                                    <p className="text-xl font-bold font-mono">2.4 ק"מ</p>
                                </div>
                                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur p-4 rounded-xl shadow-lg border space-y-1">
                                    <p className="text-xs text-muted-foreground">זמן משוער</p>
                                    <p className="text-xl font-bold font-mono text-blue-600">{eta}</p>
                                </div>
                            </div>
                        </Card>
                    )}
                </div>

            </main>
        </div>
    );
}

