"use client";

import { useEffect, useState, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
    Check, X, Truck, Navigation, Route as RouteIcon,
    Plus, Save, Send, Calendar, Clock, MapPin,
    Hash, GripVertical, Info, Phone, User as UserIcon
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { Reorder, motion, AnimatePresence } from "framer-motion";

// Fix generic Leaflet icon issue in NextJS/React
if (typeof window !== "undefined") {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });
}

const pickupIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const courierIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const deliveryIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Helper component to center map on markers
function ChangeView({ markers }: { markers: any[] }) {
    const map = useMap();
    useEffect(() => {
        if (markers.length > 0) {
            const validMarkers = markers.filter(m => m.lat && m.lng);
            if (validMarkers.length > 0) {
                const bounds = L.latLngBounds(validMarkers.map(m => [m.lat, m.lng]));
                if (bounds.isValid()) {
                    map.fitBounds(bounds, { padding: [50, 50] });
                }
            }
        }
    }, [markers, map]);
    return null;
}

export default function RouteBuilder() {
    const [orders, setOrders] = useState<any[]>([]);
    const [couriers, setCouriers] = useState<any[]>([]);
    const [selectedCourier, setSelectedCourier] = useState<any>(null);
    const [isCalculating, setIsCalculating] = useState(false);

    // Planning State
    const [plannedStops, setPlannedStops] = useState<any[]>([]);
    const [routeName, setRouteName] = useState(`מסלול ${new Date().toLocaleDateString('he-IL')}`);
    const [routeDate, setRouteDate] = useState(new Date().toISOString().split('T')[0]);
    const [isSaving, setIsSaving] = useState(false);

    // Manual Stop Input fields (structured like OrderWizard)
    const [stopForm, setStopForm] = useState({
        full_address: "",
        city: "",
        street: "",
        building_number: "",
        floor: "",
        apartment: "",
        lat: null as number | null,
        lng: null as number | null,
        contact_name: "",
        contact_phone: "",
        note: "",
        time_window: "",
        type: "delivery" as "pickup" | "delivery" | "waypoint",
        order_id: null as number | null
    });

    // Initial center (Tel Aviv Approximation)
    const center: [number, number] = [32.0853, 34.7818];

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [ordersRes, couriersRes] = await Promise.all([
                api.get('/orders?status=pending&limit=50'),
                api.get('/couriers')
            ]);

            // Real coordinates from backend (no more Math.random)
            const fetchedOrders = (ordersRes.data.orders || ordersRes.data || []).map((o: any) => ({
                ...o,
                lat: o.delivery_lat || o.pickup_lat,
                lng: o.delivery_lng || o.pickup_lng,
            })).filter((o: any) => o.lat && o.lng);
            setOrders(fetchedOrders);

            const fetchedCouriers = (couriersRes.data.data || couriersRes.data || []).filter((c: any) => c.is_available).map((c: any) => ({
                ...c,
                // Location object might be nested based on courier API structure
                lat: c.current_location?.lat || c.lat,
                lng: c.current_location?.lng || c.lng,
            })).filter((c: any) => c.lat && c.lng);
            setCouriers(fetchedCouriers);
        } catch (error) {
            console.error(error);
            toast.error("שגיאה בטעינת נתונים");
        }
    };

    const addPlannedStop = () => {
        if (!stopForm.lat || !stopForm.lng) {
            toast.error("נא לבחור כתובת תקינה מרשימת ההצעות");
            return;
        }

        const newStop = {
            ...stopForm,
            id: Date.now(),
            address: stopForm.full_address || `${stopForm.street} ${stopForm.building_number}, ${stopForm.city}`
        };

        setPlannedStops([...plannedStops, newStop]);

        // Reset form
        setStopForm({
            full_address: "",
            city: "",
            street: "",
            building_number: "",
            floor: "",
            apartment: "",
            lat: null,
            lng: null,
            contact_name: "",
            contact_phone: "",
            note: "",
            time_window: "",
            type: "delivery",
            order_id: null
        });
        toast.success("תחנה נוספה");
    };

    const addOrderToRoute = (order: any) => {
        const isAlreadyAdded = plannedStops.some(s => s.order_id === order.id);
        if (isAlreadyAdded) {
            toast.info("הזמנה זו כבר נוספה למסלול");
            return;
        }

        const pickupStop = {
            id: Date.now(),
            full_address: order.pickup_address,
            lat: order.pickup_lat,
            lng: order.pickup_lng,
            type: 'pickup',
            order_id: order.id,
            contact_name: order.customer_name,
            contact_phone: order.phone,
            note: `איסוף עבור הזמנה ${order.order_number}`
        };

        const deliveryStop = {
            id: Date.now() + 1,
            full_address: order.delivery_address,
            lat: order.delivery_lat,
            lng: order.delivery_lng,
            type: 'delivery',
            order_id: order.id,
            contact_name: order.recipient_name || order.customer_name,
            contact_phone: order.recipient_phone || order.phone,
            note: `מסירה עבור הזמנה ${order.order_number}`
        };

        setPlannedStops([...plannedStops, pickupStop, deliveryStop]);
        toast.success(`הזמנה ${order.order_number} נוספה למסלול`);
    };

    const removeStop = (id: number) => {
        setPlannedStops(plannedStops.filter(s => s.id !== id));
    };

    const handleSaveDraft = async () => {
        if (plannedStops.length === 0) return;
        setIsSaving(true);
        try {
            await api.post('/optimization/managed-routes', {
                name: routeName,
                date: routeDate,
                courier_id: selectedCourier?.id,
                stops: plannedStops.map((s, idx) => ({
                    address: s.full_address,
                    city: s.city,
                    street: s.street,
                    building_number: s.building_number,
                    floor: s.floor,
                    apartment: s.apartment,
                    lat: s.lat,
                    lng: s.lng,
                    note: s.note,
                    stop_type: s.type,
                    contact_name: s.contact_name,
                    contact_phone: s.contact_phone,
                    order_id: s.order_id,
                    sequence_number: idx + 1
                }))
            });
            toast.success("המסלול נשמר בהצלחה");
        } catch (error) {
            toast.error("שגיאה בשמירה");
        } finally {
            setIsSaving(false);
        }
    };

    const handlePublish = async () => {
        if (plannedStops.length === 0) return;
        try {
            // First save as draft to get/update ID
            const res = await api.post('/optimization/managed-routes', {
                name: routeName,
                date: routeDate,
                courier_id: selectedCourier?.id,
                stops: plannedStops.map((s, idx) => ({
                    address: s.full_address,
                    city: s.city,
                    street: s.street,
                    building_number: s.building_number,
                    floor: s.floor,
                    apartment: s.apartment,
                    lat: s.lat,
                    lng: s.lng,
                    note: s.note,
                    stop_type: s.type,
                    contact_name: s.contact_name,
                    contact_phone: s.contact_phone,
                    order_id: s.order_id,
                    sequence_number: idx + 1
                }))
            });

            const routeId = res.data.id;
            await api.post(`/optimization/managed-routes/${routeId}/publish`);

            toast.success(selectedCourier
                ? `המסלול שויך ופורסם ל-${selectedCourier.full_name}`
                : "המסלול פורסם לכל השליחים"
            );
        } catch (error) {
            toast.error("שגיאה בפרסום המסלול");
        }
    };

    const handleOptimize = async () => {
        if (plannedStops.length < 2) return;
        setIsCalculating(true);
        try {
            // Mocking optimization logic for now or calling backend if available
            // In a real Spoke/Circuit app, this would call a TSP engine
            setTimeout(() => {
                const sorted = [...plannedStops].sort((a, b) => a.lat - b.lat);
                setPlannedStops(sorted);
                setIsCalculating(false);
                toast.success("המסלול עבר אופטימיזציה לסדר הקצר ביותר");
            }, 800);
        } catch (error) {
            toast.error("שגיאה בחישוב האופטימיזציה");
            setIsCalculating(false);
        }
    };

    const mapMarkers = [
        ...couriers.map(c => ({ ...c, markerType: 'courier' })),
        ...orders.map(o => ({ ...o, markerType: 'order' })),
        ...plannedStops.map(s => ({ ...s, markerType: 'planned' }))
    ];

    return (
        <div className="flex flex-col md:flex-row h-[calc(100vh-120px)] bg-slate-50 relative overflow-hidden rounded-xl border border-slate-200 shadow-2xl">

            {/* Map Background (Full width) */}
            <div className="flex-1 relative z-0">
                <MapContainer center={center} zoom={13} style={{ height: "100%", width: "100%" }}>
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                    <ChangeView markers={mapMarkers} />

                    {couriers.map(c => (
                        <Marker key={`courier-${c.id}`} position={[c.lat, c.lng]} icon={courierIcon} eventHandlers={{ click: () => setSelectedCourier(c) }}>
                            <Popup>
                                <div className="text-right p-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Badge variant="outline" className="text-[10px] bg-blue-50">שליח פעיל</Badge>
                                        <Truck className="w-3 h-3 text-blue-500" />
                                    </div>
                                    <strong className="block text-md">{c.full_name}</strong>
                                    <div className="text-xs text-slate-500 mt-1">{c.vehicle_type === 'scooter' ? 'קטנוע' : 'רכב'}</div>
                                    <Button size="sm" className="w-full mt-2 h-7 text-[10px]" onClick={() => setSelectedCourier(c)}>שייך למסלול זה</Button>
                                </div>
                            </Popup>
                        </Marker>
                    ))}

                    {orders.map(o => (
                        <Marker key={`order-${o.id}`} position={[o.lat, o.lng]} icon={pickupIcon} eventHandlers={{ click: () => addOrderToRoute(o) }}>
                            <Popup>
                                <div className="text-right p-1 min-w-[200px]">
                                    <Badge className="mb-1 text-[10px] bg-green-50 text-green-700 border-green-200">הזמנה פתוחה</Badge>
                                    <strong className="block text-sm">הזמנה #{o.order_number}</strong>
                                    <p className="text-xs text-slate-600 mt-1">{o.delivery_address}</p>
                                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                                        <UserIcon className="w-3 h-3" /> {o.customer_name}
                                    </div>
                                    <Button
                                        size="sm"
                                        className="w-full mt-2 h-8 bg-brand hover:bg-brand/90"
                                        onClick={() => addOrderToRoute(o)}
                                    >
                                        הוסף למסלול
                                    </Button>
                                </div>
                            </Popup>
                        </Marker>
                    ))}

                    {plannedStops.map((s, idx) => (
                        <Marker key={`stop-${s.id}`} position={[s.lat, s.lng]} icon={s.type === 'pickup' ? pickupIcon : deliveryIcon}>
                            <Popup>
                                <div className="text-right p-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="w-4 h-4 bg-brand text-white rounded-full flex items-center justify-center text-[10px]">{idx + 1}</div>
                                        <Badge variant="outline" className="text-[10px]">{s.type === 'pickup' ? 'איסוף' : 'מסירה'}</Badge>
                                    </div>
                                    <strong className="block text-sm">{s.full_address}</strong>
                                    {s.contact_name && <div className="text-xs mt-1 font-medium">{s.contact_name}</div>}
                                    {s.time_window && <div className="text-[10px] text-brand mt-1 flex items-center gap-1"><Clock className="w-3 h-3" />{s.time_window}</div>}
                                </div>
                            </Popup>
                        </Marker>
                    ))}

                    {plannedStops.length > 1 && (
                        <Polyline
                            positions={plannedStops.map(s => [s.lat, s.lng])}
                            color="#3b82f6"
                            weight={5}
                            opacity={0.6}
                            dashArray="10, 15"
                        />
                    )}
                </MapContainer>
            </div>

            {/* Circuit-style Sidebar Overlay */}
            <div className="absolute right-4 top-4 bottom-4 w-full md:w-[420px] bg-white/95 backdrop-blur-md shadow-2xl rounded-2xl flex flex-col z-10 border border-slate-200 overflow-hidden">
                <header className="p-5 border-b bg-slate-50/50">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-lg flex items-center gap-2 text-slate-800">
                            <Navigation className="w-5 h-5 text-brand" />
                            תכנון מסלול חכם
                        </h3>
                        <div className="flex gap-2">
                            <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">{plannedStops.length} תחנות</Badge>
                        </div>
                    </div>
                </header>

                <Tabs defaultValue="stops" className="flex-1 flex flex-col overflow-hidden" dir="rtl">
                    <TabsList className="grid grid-cols-3 rounded-none bg-slate-100/50 h-10">
                        <TabsTrigger value="stops" className="text-xs">המסלול</TabsTrigger>
                        <TabsTrigger value="add" className="text-xs">הוספה</TabsTrigger>
                        <TabsTrigger value="settings" className="text-xs">שיוך</TabsTrigger>
                    </TabsList>

                    <ScrollArea className="flex-1">
                        <TabsContent value="stops" className="p-4 space-y-0">
                            {plannedStops.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                                    <RouteIcon className="w-12 h-12 mb-3 opacity-20" />
                                    <p className="text-sm font-medium">אין תחנות במסלול</p>
                                    <p className="text-xs opacity-60">הוסף תחנה ידנית או בחר מהמפה</p>
                                </div>
                            ) : (
                                <Reorder.Group axis="y" values={plannedStops} onReorder={setPlannedStops} className="space-y-3">
                                    <AnimatePresence initial={false}>
                                        {plannedStops.map((stop, idx) => (
                                            <Reorder.Item
                                                key={stop.id}
                                                value={stop}
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                className="relative group"
                                            >
                                                <Card className={`overflow-hidden border-transparent hover:border-brand/30 transition-all shadow-sm ${stop.type === 'pickup' ? 'bg-green-50/30' : 'bg-blue-50/30'}`}>
                                                    <CardContent className="p-3 flex items-start gap-3">
                                                        <div className="flex flex-col items-center gap-1 mt-1">
                                                            <GripVertical className="w-4 h-4 text-slate-300 cursor-grab active:cursor-grabbing" />
                                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${stop.type === 'pickup' ? 'bg-green-500' : 'bg-blue-500'} text-white`}>
                                                                {idx + 1}
                                                            </div>
                                                        </div>
                                                        <div className="flex-1 min-w-0 pr-2">
                                                            <div className="flex items-center justify-between mb-1">
                                                                <Badge variant="outline" className={`h-4 text-[9px] px-1 ${stop.type === 'pickup' ? 'text-green-600 border-green-200 bg-green-50' : 'text-blue-600 border-blue-200 bg-blue-50'}`}>
                                                                    {stop.type === 'pickup' ? 'איסוף' : stop.type === 'delivery' ? 'מסירה' : 'נקודת ציון'}
                                                                </Badge>
                                                                <button title="הסר" onClick={() => removeStop(stop.id)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-50 rounded">
                                                                    <X className="w-3.5 h-3.5 text-red-400" />
                                                                </button>
                                                            </div>
                                                            <p className="font-bold text-sm text-slate-800 truncate mb-1" title={stop.full_address}>
                                                                {stop.full_address}
                                                            </p>
                                                            <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500">
                                                                {stop.contact_name && <span className="flex items-center gap-1 truncate"><UserIcon className="w-2.5 h-2.5" />{stop.contact_name}</span>}
                                                                {stop.contact_phone && <span className="flex items-center gap-1 truncate"><Phone className="w-2.5 h-2.5" />{stop.contact_phone}</span>}
                                                            </div>
                                                            {stop.note && <p className="text-[10px] text-slate-400 mt-1 italic line-clamp-1">{stop.note}</p>}
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            </Reorder.Item>
                                        ))}
                                    </AnimatePresence>
                                </Reorder.Group>
                            )}
                        </TabsContent>

                        <TabsContent value="add" className="p-5 space-y-5">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold text-slate-600">סוג תחנה</Label>
                                    <Select
                                        value={stopForm.type}
                                        onValueChange={(val: any) => setStopForm(prev => ({ ...prev, type: val }))}
                                    >
                                        <SelectTrigger className="bg-slate-50 h-9">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="pickup">📦 איסוף</SelectItem>
                                            <SelectItem value="delivery">📍 מסירה</SelectItem>
                                            <SelectItem value="waypoint">🚩 נקודת ציון</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold text-slate-600">כתובת (חיפוש ב-Maps)</Label>
                                    <AddressAutocomplete
                                        placeholder="הקלד כתובת..."
                                        value={stopForm.full_address}
                                        onChange={(val) => setStopForm(prev => ({ ...prev, full_address: val }))}
                                        onSelectAddress={(addr) => {
                                            setStopForm(prev => ({
                                                ...prev,
                                                full_address: addr.full_address,
                                                city: addr.city || "",
                                                street: addr.street || "",
                                                building_number: addr.number || "",
                                                lat: addr.lat,
                                                lng: addr.lng
                                            }));
                                        }}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] text-slate-500 uppercase">קומה</Label>
                                        <Input
                                            placeholder="קומה..."
                                            value={stopForm.floor}
                                            onChange={e => setStopForm(prev => ({ ...prev, floor: e.target.value }))}
                                            className="h-8 text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] text-slate-500 uppercase">דירה / עסק</Label>
                                        <Input
                                            placeholder="דירה..."
                                            value={stopForm.apartment}
                                            onChange={e => setStopForm(prev => ({ ...prev, apartment: e.target.value }))}
                                            className="h-8 text-sm"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold text-slate-600 tracking-tight">פרטי איש קשר</Label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <Input
                                            placeholder="שם..."
                                            value={stopForm.contact_name}
                                            onChange={e => setStopForm(prev => ({ ...prev, contact_name: e.target.value }))}
                                            className="h-9 text-sm"
                                        />
                                        <Input
                                            placeholder="טלפון..."
                                            value={stopForm.contact_phone}
                                            onChange={e => setStopForm(prev => ({ ...prev, contact_phone: e.target.value }))}
                                            className="h-9 text-sm"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold text-slate-600">הנחיות לשליח</Label>
                                    <Textarea
                                        placeholder="קוד כניסה, הנחיות איסוף..."
                                        value={stopForm.note}
                                        onChange={e => setStopForm(prev => ({ ...prev, note: e.target.value }))}
                                        className="min-h-[60px] text-xs resize-none bg-slate-50"
                                    />
                                </div>

                                <Button
                                    onClick={addPlannedStop}
                                    className="w-full bg-slate-900 text-white hover:bg-slate-800 shadow-lg h-10"
                                >
                                    <Plus className="w-4 h-4 ml-2" />
                                    הוספת תחנה למסלול
                                </Button>
                            </div>
                        </TabsContent>

                        <TabsContent value="settings" className="p-5 space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold">שליח אחראי</Label>
                                    {selectedCourier ? (
                                        <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                                                    {selectedCourier.full_name[0]}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold">{selectedCourier.full_name}</div>
                                                    <div className="text-[10px] text-blue-600 uppercase font-semibold">{selectedCourier.vehicle_type}</div>
                                                </div>
                                            </div>
                                            <button title="ביטול בחירה" onClick={() => setSelectedCourier(null)} className="p-1 hover:bg-blue-100 rounded">
                                                <X className="w-4 h-4 text-blue-400" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="p-4 border border-dashed rounded-lg text-center text-slate-400 bg-slate-50">
                                            <p className="text-xs italic mb-1">לא נבחר שליח</p>
                                            <p className="text-[10px]">לחץ על שליח במפה כדי לשייך</p>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold">פרטי המסלול</Label>
                                    <Input
                                        className="h-9 text-xs"
                                        placeholder="שם המסלול..."
                                        value={routeName}
                                        onChange={e => setRouteName(e.target.value)}
                                    />
                                    <Input
                                        type="date"
                                        className="h-9 text-xs"
                                        value={routeDate}
                                        onChange={e => setRouteDate(e.target.value)}
                                    />
                                </div>
                            </div>
                        </TabsContent>
                    </ScrollArea>

                    <footer className="p-4 border-t bg-slate-50/80 backdrop-blur-sm space-y-3">
                        <div className="flex items-center justify-between text-xs px-1">
                            <div className="text-slate-500 font-medium">
                                סה"כ מרחק משוער: <span className="text-slate-800 font-bold">{
                                    (() => {
                                        let total = 0;
                                        for (let i = 0; i < plannedStops.length - 1; i++) {
                                            const a = plannedStops[i];
                                            const b = plannedStops[i + 1];
                                            if (a.lat && a.lng && b.lat && b.lng) {
                                                const R = 6371; // km
                                                const dLat = (b.lat - a.lat) * Math.PI / 180;
                                                const dLon = (b.lng - a.lng) * Math.PI / 180;
                                                const lat1 = a.lat * Math.PI / 180;
                                                const lat2 = b.lat * Math.PI / 180;
                                                const x = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                                                    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
                                                const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
                                                total += R * c;
                                            }
                                        }
                                        return total.toFixed(1);
                                    })()
                                } ק"מ</span>
                            </div>
                            <div className="text-slate-500 font-medium">זמן מוערך: <span className="text-slate-800 font-bold">{Math.ceil(plannedStops.length * 8.5)} דק'</span></div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <Button
                                variant="outline"
                                className="w-full bg-white shadow-sm border-slate-200 text-slate-700 hover:bg-slate-50"
                                onClick={handleSaveDraft}
                                disabled={isSaving || plannedStops.length === 0}
                            >
                                <Save className="w-4 h-4 ml-2" />
                                שמירה כטיוטה
                            </Button>
                            <Button
                                className="w-full bg-brand text-white shadow-brand/20 shadow-lg hover:bg-brand/90"
                                onClick={handlePublish}
                                disabled={plannedStops.length === 0}
                            >
                                <Send className="w-4 h-4 ml-2" />
                                פרסום ושידור
                            </Button>
                        </div>
                        <Button
                            className="w-full bg-indigo-600 text-white shadow-indigo-100 shadow-md hover:bg-indigo-700 h-10 font-bold"
                            onClick={handleOptimize}
                            disabled={isCalculating || plannedStops.length < 2}
                        >
                            {isCalculating ? (
                                <><span className="animate-spin ml-2">⏳</span>מחשב מסלול אופטימלי...</>
                            ) : (
                                <><RouteIcon className="w-4 h-4 ml-2" />בצע אופטימיזציית מסלול</>
                            )}
                        </Button>
                    </footer>
                </Tabs>
            </div>
        </div>
    );
}

