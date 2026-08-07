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
    Plus, Minus, Save, Send, Calendar, Clock, MapPin,
    Hash, GripVertical, Info, Phone, User as UserIcon,
    Loader2, Package, AlertTriangle, BarChart3, Link2, Zap
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
import { UnifiedSearch } from "@/components/UnifiedSearch";
import { cn } from "@/lib/utils";
import styles from './map.module.css';

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
    const [routePolyline, setRoutePolyline] = useState<[number, number][]>([]);
    const [shipmentCounter, setShipmentCounter] = useState(1);
    const [routeStats, setRouteStats] = useState({ distance: 0, duration: 0 });
    const [routeMode, setRouteMode] = useState<'distribution' | 'multi-pickup' | 'free'>('distribution');
    const [savedRoutes, setSavedRoutes] = useState<any[]>([]);

    // Planning State
    const [configuringStop, setConfiguringStop] = useState<any>(null);
    const [plannedStops, setPlannedStops] = useState<any[]>([]);
    const [routeName, setRouteName] = useState(`מסלול ${new Date().toLocaleDateString('he-IL')}`);
    const [routeDate, setRouteDate] = useState(new Date().toISOString().split('T')[0]);
    const [isSaving, setIsSaving] = useState(false);

    // Shipment color palette for visual linking
    const SHIPMENT_COLORS = ['#10b981', '#3b82f6', '#a855f7', '#145DDB', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'];
    const getShipmentColor = (shipmentId: string) => {
        const ids = Array.from(new Set(plannedStops.map(s => s.shipment_id).filter(Boolean)));
        const idx = ids.indexOf(shipmentId);
        return SHIPMENT_COLORS[idx % SHIPMENT_COLORS.length] || '#6b7280';
    };

    // Computed route summary
    const routeSummary = {
        pickups: plannedStops.filter(s => s.type === 'pickup').length,
        deliveries: plannedStops.filter(s => s.type === 'delivery').length,
        totalPackages: plannedStops.reduce((sum, s) => sum + (s.packages || 1), 0),
        shipments: Array.from(new Set(plannedStops.map(s => s.shipment_id).filter(Boolean))).length,
        warnings: (() => {
            const warns: string[] = [];
            const groups: Record<string, { p: number; d: number }> = {};
            for (const s of plannedStops) {
                if (!s.shipment_id) continue;
                if (!groups[s.shipment_id]) groups[s.shipment_id] = { p: 0, d: 0 };
                if (s.type === 'pickup') groups[s.shipment_id].p += (s.packages || 1);
                if (s.type === 'delivery') groups[s.shipment_id].d += (s.packages || 1);
            }
            for (const [id, c] of Object.entries(groups)) {
                if (c.p > 0 && c.d === 0) warns.push(`${id}: איסוף ללא מסירה`);
                if (c.d > 0 && c.p === 0) warns.push(`${id}: מסירה ללא איסוף`);
                if (c.p > 0 && c.d > 0 && c.p !== c.d) warns.push(`${id}: ${c.p} איסופים ≠ ${c.d} מסירות`);
            }
            return warns;
        })()
    };

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
            const [ordersRes, couriersRes, routesRes] = await Promise.all([
                api.get('/orders?status=pending&limit=50'),
                api.get('/couriers'),
                api.get('/optimization/managed-routes').catch(() => ({ data: [] }))
            ]);

            // Real coordinates from backend
            const ordersData = ordersRes.data.orders || ordersRes.data || [];
            const fetchedOrders = Array.isArray(ordersData)
                ? ordersData.map((o: any) => ({
                    ...o,
                    lat: o.delivery_lat || o.pickup_lat,
                    lng: o.delivery_lng || o.pickup_lng,
                })).filter((o: any) => o.lat && o.lng)
                : [];
            setOrders(fetchedOrders);

            setSavedRoutes(routesRes.data || []);

            const couriersData = couriersRes.data.data || couriersRes.data || [];
            const fetchedCouriers = Array.isArray(couriersData)
                ? couriersData.filter((c: any) => c.is_available).map((c: any) => ({
                    ...c,
                    lat: c.current_location?.lat || c.lat,
                    lng: c.current_location?.lng || c.lng,
                })).filter((c: any) => c.lat && c.lng)
                : [];
            setCouriers(fetchedCouriers);
        } catch (error) {
            console.error(error);
            toast.error("שגיאה בטעינת נתונים");
        }
    };

    const loadRoute = async (routeId: string | number) => {
        try {
            const res = await api.get(`/optimization/managed-routes/${routeId}`);
            const data = res.data;

            setRouteName(data.name || `מסלול ${new Date().toLocaleDateString('he-IL')}`);
            if (data.date) {
                setRouteDate(data.date.split('T')[0]);
            }

            setPlannedStops(data.stops.map((s: any) => ({
                id: `loaded-${s.id}-${Math.random().toString(36).substr(2, 9)}`,
                sequence_number: s.sequence,
                full_address: s.address,
                city: s.city,
                street: s.street,
                building_number: s.building_number,
                floor: s.floor,
                apartment: s.apartment,
                note: s.note,
                type: s.type,
                lat: s.lat,
                lng: s.lng,
                order_id: s.order_id,
                contact_name: s.contact_name,
                contact_phone: s.contact_phone
            })));

            setRoutePolyline([]); // Clear old polyline
            setRouteStats({ distance: 0, duration: 0 }); // Reset stats until optimized again

            if (data.courier_id) {
                setCouriers(prev => {
                    const c = prev.find(courier => courier.id === data.courier_id);
                    if (c) setSelectedCourier(c);
                    return prev;
                });
            } else {
                setSelectedCourier(null);
            }

            toast.success(`נטען מסלול: ${data.name}`);
        } catch (error) {
            console.error(error);
            toast.error("שגיאה בטעינת המסלול");
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
        // Instead of adding immediately, we'll configure the pickup/delivery first
        // But for multiple stops, we might want a slightly different flow.
        // For now, let's treat it as "configuring the order's stops"
        setConfiguringStop({
            address: order.pickup_address,
            lat: order.pickup_lat,
            lng: order.pickup_lng,
            type: 'pickup',
            order_id: order.id,
            order_number: order.order_number,
            shipment_id: order.order_number || `S${String(shipmentCounter).padStart(3, '0')}`,
            packages: 1,
            contact_name: order.customer_name,
            contact_phone: order.phone,
            note: "",
            isOrder: true,
            delivery_address: order.delivery_address,
            delivery_lat: order.delivery_lat,
            delivery_lng: order.delivery_lng,
            recipient_name: order.recipient_name || order.customer_name,
            recipient_phone: order.recipient_phone || order.phone
        });
        toast.info(`הגדר פרטי איסוף עבור הזמנה ${order.order_number}`);
    };

    const confirmAddStop = (stop: any) => {
        // Auto-generate shipment_id if user left it empty
        const finalShipmentId = stop.shipment_id?.trim() || `S${String(shipmentCounter).padStart(3, '0')}`;
        if (!stop.shipment_id?.trim()) {
            setShipmentCounter(prev => prev + 1);
        }

        const baseStop = {
            ...stop,
            shipment_id: finalShipmentId,
            id: `stop-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        };

        if (stop.isOrder) {
            const pickup = {
                ...baseStop,
                id: `pickup-${baseStop.id}`,
                type: 'pickup'
            };
            const delivery = {
                ...baseStop,
                id: `delivery-${baseStop.id}`,
                type: 'delivery',
                full_address: stop.delivery_address,
                lat: stop.delivery_lat,
                lng: stop.delivery_lng,
                contact_name: stop.recipient_name,
                contact_phone: stop.recipient_phone
            };
            setPlannedStops([...plannedStops, pickup, delivery]);
            toast.success(`משלוח ${finalShipmentId}: איסוף + מסירה נוספו`);
        } else {
            setPlannedStops([...plannedStops, baseStop]);
            toast.success(`תחנה [משלוח ${finalShipmentId}] נוספה`);
        }
        setConfiguringStop(null);
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

        // Pre-optimization validation: check package counts per shipment_id
        const shipmentGroups: Record<string, { pickups: number; deliveries: number }> = {};
        for (const stop of plannedStops) {
            if (!stop.shipment_id) continue;
            if (!shipmentGroups[stop.shipment_id]) {
                shipmentGroups[stop.shipment_id] = { pickups: 0, deliveries: 0 };
            }
            if (stop.type === 'pickup') {
                shipmentGroups[stop.shipment_id].pickups += (stop.packages || 1);
            } else if (stop.type === 'delivery') {
                shipmentGroups[stop.shipment_id].deliveries += (stop.packages || 1);
            }
        }

        const mismatches: string[] = [];
        for (const [sid, counts] of Object.entries(shipmentGroups)) {
            if (counts.pickups > 0 && counts.deliveries > 0 && counts.pickups !== counts.deliveries) {
                mismatches.push(`${sid}: ${counts.pickups} איסופים ≠ ${counts.deliveries} מסירות`);
            }
            if (counts.pickups > 0 && counts.deliveries === 0) {
                mismatches.push(`${sid}: ${counts.pickups} איסופים ללא מסירה`);
            }
            if (counts.deliveries > 0 && counts.pickups === 0) {
                mismatches.push(`${sid}: ${counts.deliveries} מסירות ללא איסוף`);
            }
        }

        if (mismatches.length > 0) {
            toast.warning(`אזהרה: חבילות לא מתאימות`, {
                description: mismatches.join(' | '),
                duration: 6000
            });
        }

        setIsCalculating(true);
        try {
            // Calculate from current map center or selected courier's location
            const startLat = selectedCourier?.lat || center[0];
            const startLng = selectedCourier?.lng || center[1];

            const response = await api.post('/optimization/manual-run', {
                lat: startLat,
                lng: startLng,
                stops: plannedStops.map(s => ({
                    id: s.id,
                    order_id: s.order_id,
                    type: s.type,
                    lat: s.lat,
                    lng: s.lng,
                    address: s.full_address
                }))
            });

            if (response.data.optimized_sequence) {
                setPlannedStops(response.data.optimized_sequence.map((s: any) => ({
                    ...s,
                    // Keep the original properties that frontend needs
                    id: s.id || Date.now() + Math.random(),
                    full_address: s.address || s.full_address
                })));

                if (response.data.route_geometry) {
                    // OSRM returns [lng, lat], Leaflet needs [lat, lng]
                    const decoded = response.data.route_geometry.map((coord: [number, number]) => [coord[1], coord[0]]);
                    setRoutePolyline(decoded);
                }

                setRouteStats({
                    distance: response.data.total_distance_km,
                    duration: response.data.total_duration_min
                });

                toast.success(`המסלול עבר אופטימיזציה לסדר הקצר ביותר (${response.data.provider})`);
            }
        } catch (error: any) {
            console.error("Optimization error:", error);
            toast.error(error.response?.data?.error || "שגיאה בחישוב האופטימיזציה");
        } finally {
            setIsCalculating(false);
        }
    };

    const mapMarkers = [
        ...couriers.map(c => ({ ...c, markerType: 'courier' })),
        ...orders.map(o => ({ ...o, markerType: 'order' })),
        ...plannedStops.map(s => ({ ...s, markerType: 'planned' }))
    ];

    return (
        <>
            {/* Map Background */}
            <div className={styles.mapWrapper}>
                <MapContainer center={center} zoom={13} style={{ height: "100%", width: "100%", zIndex: 1 }}>
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

                    {routePolyline.length > 0 ? (
                        <Polyline
                            positions={routePolyline}
                            color="#3b82f6"
                            weight={6}
                            opacity={0.8}
                        />
                    ) : plannedStops.length > 1 && (
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

            {/* Logistics Sidebar */}
            <div className={styles.sidebar} dir="rtl">
                <header className={styles.sidebarHeader}>
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                            <div className={styles.headerIconBox}>
                                <Navigation className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className={styles.headerTitle}>תכנון מסלול</h3>
                                <p className={styles.headerSubtitle}>Pro Route Planner</p>
                            </div>
                        </div>
                        <Badge className="bg-slate-800 text-slate-300 border-slate-700 px-2.5 py-0.5 rounded-md text-[10px] font-bold">
                            {plannedStops.length} תחנות
                        </Badge>
                    </div>

                    {/* Search */}
                    <UnifiedSearch
                        onSelectAddress={(addr: any) => {
                            const hasPickup = plannedStops.some(s => s.type === 'pickup');
                            const autoType = routeMode === 'distribution'
                                ? (hasPickup ? 'delivery' : 'pickup')
                                : 'delivery';
                            const autoShipmentId = routeMode === 'distribution' && hasPickup
                                ? (plannedStops.find(s => s.type === 'pickup')?.shipment_id || '')
                                : '';
                            setConfiguringStop({
                                full_address: addr.full_address,
                                lat: addr.lat,
                                lng: addr.lng,
                                type: autoType,
                                contact_name: "",
                                contact_phone: "",
                                note: "",
                                shipment_id: autoShipmentId,
                                packages: 1,
                                isOrder: false
                            });
                        }}
                        onSelectOrder={(order: any) => addOrderToRoute(order)}
                        placeholder="חפש הזמנה או כתובת..."
                    />

                    {/* Route Mode Selector */}
                    <div className="flex gap-1.5 mt-2">
                        <button
                            title="חלוקה פשוטה"
                            onClick={() => setRouteMode('distribution')}
                            className={cn(
                                "flex-1 h-7 rounded-md text-[9px] font-bold flex items-center justify-center gap-1 transition-all border",
                                routeMode === 'distribution'
                                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                                    : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
                            )}
                        >
                            <Zap className="w-3 h-3" />
                            חלוקה
                        </button>
                        <button
                            title="איסוף מרובה"
                            onClick={() => setRouteMode('multi-pickup')}
                            className={cn(
                                "flex-1 h-7 rounded-md text-[9px] font-bold flex items-center justify-center gap-1 transition-all border",
                                routeMode === 'multi-pickup'
                                    ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                                    : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
                            )}
                        >
                            <Package className="w-3 h-3" />
                            מרובה
                        </button>
                        <button
                            title="מסלול חופשי"
                            onClick={() => setRouteMode('free')}
                            className={cn(
                                "flex-1 h-7 rounded-md text-[9px] font-bold flex items-center justify-center gap-1 transition-all border",
                                routeMode === 'free'
                                    ? 'bg-red-500/20 border-red-500 text-red-400'
                                    : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
                            )}
                        >
                            <Navigation className="w-3 h-3" />
                            חופשי
                        </button>
                    </div>
                </header>

                <Tabs defaultValue="stops" className="flex-1 flex flex-col overflow-hidden relative" dir="rtl">
                    <TabsList className={cn(styles.tabList, "grid-cols-4")}>
                        <TabsTrigger value="stops" className={styles.tabTrigger}>המסלול</TabsTrigger>
                        <TabsTrigger value="summary" className={styles.tabTrigger}>סיכום</TabsTrigger>
                        <TabsTrigger value="routes" className={styles.tabTrigger}>מסלולים</TabsTrigger>
                        <TabsTrigger value="settings" className={styles.tabTrigger}>הגדרות</TabsTrigger>
                    </TabsList>

                    <ScrollArea className="flex-1 px-4 pt-3">
                        <TabsContent value="stops" className="m-0 pb-6">
                            {plannedStops.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-24 text-white/20">
                                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                                        <RouteIcon className="w-10 h-10" />
                                    </div>
                                    <p className="text-lg font-bold text-white/40">התחל לתכנן מסלול</p>
                                    <p className="text-xs text-white/20 mt-2">השתמש בחיפוש למעלה או בחר מהמפה</p>
                                </div>
                            ) : (
                                <Reorder.Group axis="y" values={plannedStops} onReorder={setPlannedStops} className="space-y-4">
                                    <AnimatePresence initial={false}>
                                        {plannedStops.map((stop, idx) => (
                                            <Reorder.Item
                                                key={stop.id}
                                                value={stop}
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, x: -20 }}
                                                className="relative group"
                                            >
                                                <div className={stop.type === 'pickup' ? styles.stopCardPickup : styles.stopCardDelivery}>
                                                    <div className={styles.stopBody}>
                                                        <div className="flex flex-col items-center gap-1.5 mt-0.5">
                                                            <div className="w-6 h-6 rounded-md bg-slate-800 flex items-center justify-center cursor-grab active:cursor-grabbing text-slate-500 hover:text-white transition-colors">
                                                                <GripVertical className="w-3.5 h-3.5" />
                                                            </div>
                                                            <div className={cn(
                                                                "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black",
                                                                stop.type === 'pickup' ? 'bg-emerald-500' : 'bg-blue-500',
                                                                "text-white"
                                                            )}>
                                                                {idx + 1}
                                                            </div>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between mb-1.5">
                                                                <Badge className={cn(
                                                                    "h-4 text-[9px] font-bold px-1.5 rounded-md border-none",
                                                                    stop.type === 'pickup' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-blue-500/15 text-blue-400'
                                                                )}>
                                                                    {stop.type === 'pickup' ? 'איסוף' : 'מסירה'}
                                                                </Badge>
                                                                <button title="Remove Stop" onClick={() => removeStop(stop.id)} className="w-6 h-6 flex items-center justify-center rounded-md bg-slate-800 text-slate-500 hover:bg-red-500 hover:text-white transition-all">
                                                                    <X className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                            <h4 className="font-bold text-xs text-white mb-1.5 leading-tight">
                                                                {stop.full_address}
                                                            </h4>
                                                            <div className="flex flex-wrap gap-3">
                                                                {stop.contact_name && (
                                                                    <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                                                        <UserIcon className="w-3 h-3 text-slate-500" />
                                                                        {stop.contact_name}
                                                                    </div>
                                                                )}
                                                                {stop.packages > 1 && (
                                                                    <div className="flex items-center gap-1 text-[10px] text-violet-400 font-bold bg-violet-500/10 px-1.5 py-0.5 rounded">
                                                                        <Package className="w-3 h-3" />
                                                                        ×{stop.packages}
                                                                    </div>
                                                                )}
                                                                {stop.shipment_id && (
                                                                    <div className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ color: getShipmentColor(stop.shipment_id), backgroundColor: `${getShipmentColor(stop.shipment_id)}15` }}>
                                                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getShipmentColor(stop.shipment_id) }} />
                                                                        {stop.shipment_id}
                                                                    </div>
                                                                )}

                                                                {stop.order_id && (
                                                                    <div className="flex items-center gap-1 text-[10px] text-brand font-bold bg-brand/10 px-1.5 py-0.5 rounded">
                                                                        <Hash className="w-3 h-3" />
                                                                        #{stop.order_id}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Progress bar */}
                                                    <div className="h-1 w-full bg-slate-800 overflow-hidden">
                                                        <motion.div
                                                            className={cn("h-full", stop.type === 'pickup' ? 'bg-emerald-500' : 'bg-blue-500')}
                                                            initial={{ width: 0 }}
                                                            animate={{ width: "100%" }}
                                                            transition={{ duration: 1, ease: "easeInOut" }}
                                                        />
                                                    </div>
                                                </div>
                                            </Reorder.Item>
                                        ))}
                                    </AnimatePresence>
                                </Reorder.Group>
                            )}
                        </TabsContent>

                        <TabsContent value="routes" className="m-0 space-y-3 pb-6">
                            {savedRoutes.length === 0 ? (
                                <div className="text-center py-12 text-slate-500 text-xs">אין מסלולים שמורים</div>
                            ) : (
                                savedRoutes.map((route) => (
                                    <div key={route.id} onClick={() => loadRoute(route.id)} className="bg-slate-900 border border-slate-800 rounded-xl p-3 hover:border-slate-700 transition cursor-pointer">
                                        <div className="flex items-start justify-between mb-2">
                                            <div>
                                                <div className="font-bold text-white text-xs whitespace-pre-wrap">{route.name}</div>
                                                <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(route.date).toLocaleDateString('he-il')}</div>
                                            </div>
                                            <Badge variant="outline" className={cn(
                                                "text-[9px]",
                                                route.status === 'draft' && "text-slate-400 border-slate-700",
                                                route.status === 'published' && "text-blue-400 border-blue-900",
                                                route.status === 'assigned' && "text-emerald-400 border-emerald-900",
                                                route.status === 'completed' && "text-violet-400 border-violet-900"
                                            )}>
                                                {route.status === 'draft' ? "טיוטה"
                                                    : route.status === 'published' ? "פתוח לכולם"
                                                        : route.status === 'assigned' ? "משויך לשליח"
                                                            : "הושלם"}
                                            </Badge>
                                        </div>
                                        <div className="flex gap-4 mt-3 pt-3 border-t border-slate-800">
                                            <div className="text-[10px] text-slate-400"><strong className="text-slate-200">{route.stop_count}</strong> תחנות</div>
                                            {route.courier_id && <div className="text-[10px] text-slate-400 flex items-center gap-1"><Truck className="w-3 h-3" /> מינוי קיים</div>}
                                        </div>
                                    </div>
                                ))
                            )}
                        </TabsContent>

                        <TabsContent value="summary" className="m-0 p-4">
                            {plannedStops.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <div className="w-14 h-14 bg-slate-900 rounded-xl flex items-center justify-center mb-4">
                                        <BarChart3 className="w-7 h-7 text-slate-600" />
                                    </div>
                                    <p className="text-xs font-bold text-slate-400 mb-1">אין תחנות עדיין</p>
                                    <p className="text-[10px] text-slate-600 leading-relaxed max-w-[200px]">
                                        הוסף תחנות דרך החיפוש למעלה כדי לראות סיכום
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2.5 text-center">
                                            <div className="text-lg font-black text-emerald-400">{routeSummary.pickups}</div>
                                            <div className="text-[9px] text-emerald-500/80 font-bold">נקודות איסוף</div>
                                        </div>
                                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2.5 text-center">
                                            <div className="text-lg font-black text-blue-400">{routeSummary.deliveries}</div>
                                            <div className="text-[9px] text-blue-500/80 font-bold">נקודות מסירה</div>
                                        </div>
                                        <div className="bg-violet-500/10 border border-violet-500/20 rounded-lg p-2.5 text-center">
                                            <div className="text-lg font-black text-violet-400">{routeSummary.totalPackages}</div>
                                            <div className="text-[9px] text-violet-500/80 font-bold">חבילות סה״כ</div>
                                        </div>
                                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2.5 text-center">
                                            <div className="text-lg font-black text-blue-400">{routeSummary.shipments}</div>
                                            <div className="text-[9px] text-blue-500/80 font-bold">משלוחים</div>
                                        </div>
                                    </div>

                                    {/* Shipment Links */}
                                    {routeSummary.shipments > 0 && (
                                        <div className="space-y-1.5">
                                            <div className="text-[9px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
                                                <Link2 className="w-3 h-3" />
                                                קישורי משלוחים
                                            </div>
                                            {Array.from(new Set(plannedStops.map(s => s.shipment_id).filter(Boolean))).map(sid => {
                                                const stops = plannedStops.filter(s => s.shipment_id === sid);
                                                const pickups = stops.filter(s => s.type === 'pickup');
                                                const deliveries = stops.filter(s => s.type === 'delivery');
                                                const color = getShipmentColor(sid);
                                                return (
                                                    <div key={sid} className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg p-2">
                                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-[10px] font-bold text-white">{sid}</div>
                                                            <div className="text-[9px] text-slate-500">
                                                                {pickups.length} איסוף → {deliveries.length} מסירה
                                                            </div>
                                                        </div>
                                                        <div className="text-[10px] font-bold" style={{ color }}>
                                                            {stops.reduce((s, st) => s + (st.packages || 1), 0)} חבילות
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Warnings */}
                                    {routeSummary.warnings.length > 0 && (
                                        <div className="space-y-1.5">
                                            <div className="text-[9px] font-bold text-blue-500 uppercase flex items-center gap-1.5">
                                                <AlertTriangle className="w-3 h-3" />
                                                אזהרות
                                            </div>
                                            {routeSummary.warnings.map((w, i) => (
                                                <div key={i} className="flex items-center gap-2 bg-blue-500/5 border border-blue-500/20 rounded-lg p-2 text-[10px] text-blue-400">
                                                    <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                                                    {w}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Route Mode Indicator */}
                                    <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5">
                                        <div className="text-[9px] text-slate-500 font-bold mb-1">מצב מסלול</div>
                                        <div className="text-xs font-bold text-white">
                                            {routeMode === 'distribution' && '🟢 חלוקה פשוטה — איסוף אחד → מסירות מרובות'}
                                            {routeMode === 'multi-pickup' && '🟡 איסוף מרובה — כמה ספקים → מסירות'}
                                            {routeMode === 'free' && '🔴 מסלול חופשי — שליטה מלאה'}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </TabsContent>


                        <TabsContent value="settings" className="m-0 p-4 space-y-4">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-[9px] font-bold text-slate-500 uppercase">שליח לביצוע</Label>
                                    {selectedCourier ? (
                                        <div className="flex items-center justify-between p-3 bg-brand/10 border border-brand/20 rounded-xl">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 bg-brand rounded-lg flex items-center justify-center text-white font-bold text-sm">
                                                    {selectedCourier.full_name[0]}
                                                </div>
                                                <div>
                                                    <div className="text-white text-sm font-bold">{selectedCourier.full_name}</div>
                                                    <div className="text-[9px] text-brand uppercase font-bold">{selectedCourier.vehicle_type}</div>
                                                </div>
                                            </div>
                                            <button title="ביטול בחירה" onClick={() => setSelectedCourier(null)} className="w-6 h-6 flex items-center justify-center rounded-md bg-slate-800 text-slate-500 hover:text-white transition-colors">
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="p-4 border border-dashed border-slate-700 rounded-xl text-center bg-slate-900">
                                            <p className="text-xs font-bold text-slate-500 mb-0.5">לא נבחר שליח</p>
                                            <p className="text-[9px] text-slate-600">לחץ על שליח במפה לשיוך</p>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-[9px] font-bold text-slate-500 uppercase">פרטי מסלול</Label>
                                    <div className="space-y-2">
                                        <Input
                                            className="h-9 bg-slate-900 border-slate-700 text-slate-200 rounded-lg text-xs"
                                            placeholder="שם המסלול..."
                                            value={routeName}
                                            onChange={e => setRouteName(e.target.value)}
                                        />
                                        <Input
                                            type="date"
                                            className="h-9 bg-slate-900 border-slate-700 text-slate-200 rounded-lg text-xs [color-scheme:dark]"
                                            value={routeDate}
                                            onChange={e => setRouteDate(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </TabsContent>
                    </ScrollArea>

                    <footer className="p-3 border-t border-slate-800 bg-[#0c0c12]">
                        <div className="flex items-center justify-between mb-2 bg-slate-900 p-2 rounded-lg border border-slate-800">
                            <div className="flex items-center gap-2">
                                <RouteIcon className="w-3.5 h-3.5 text-indigo-400" />
                                <div className="space-y-0.5">
                                    <p className="text-[8px] text-slate-500 uppercase font-black">מרחק</p>
                                    <p className="text-xs font-black text-slate-50">{routeStats.distance > 0 ? routeStats.distance : '0.0'}<span className="text-[9px] opacity-30 ml-0.5">ק"מ</span></p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-right">
                                <div className="space-y-0.5">
                                    <p className="text-[8px] text-slate-500 uppercase font-black">זמן</p>
                                    <p className="text-xs font-black text-slate-50">{routeStats.duration > 0 ? routeStats.duration : '0'}<span className="text-[9px] opacity-30 ml-0.5">דק'</span></p>
                                </div>
                                <Clock className="w-3.5 h-3.5 text-brand" />
                            </div>
                        </div>

                        <div className="flex gap-2 mb-2">
                            <Button
                                variant="outline"
                                className="flex-1 h-9 rounded-lg bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:text-white font-bold text-[10px]"
                                onClick={handleSaveDraft}
                                disabled={isSaving || plannedStops.length === 0}
                            >
                                <Save className="w-3 h-3 ml-1.5" />
                                טיוטה
                            </Button>
                            <Button
                                className="flex-1 h-9 rounded-lg bg-emerald-600 text-white shadow-xl shadow-emerald-500/10 hover:bg-emerald-500 font-black text-[10px]"
                                onClick={handlePublish}
                                disabled={plannedStops.length === 0}
                            >
                                <Send className="w-3 h-3 ml-1.5" />
                                פרסם
                            </Button>
                        </div>
                        <Button
                            className="w-full h-10 rounded-lg bg-indigo-600/90 text-white font-black shadow-xl shadow-indigo-600/20 hover:bg-indigo-600 transition-all border border-indigo-400/10 text-[11px]"
                            onClick={handleOptimize}
                            disabled={isCalculating || plannedStops.length < 2}
                        >
                            {isCalculating ? (
                                <><Loader2 className="w-4 h-4 ml-2 animate-spin" />מחשב אופטימיזציה...</>
                            ) : (
                                <><RouteIcon className="w-4 h-4 ml-2" />אופטימיזציה חכמה</>
                            )}
                        </Button>
                    </footer>

                    {/* CONFIGURATION OVERLAY - The "Small Page" requested */}
                    <AnimatePresence>
                        {configuringStop && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                className="absolute inset-x-0 bottom-0 top-0 z-[100] bg-[#0a0a0f] border-l border-slate-800 rounded-none shadow-2xl flex flex-col overflow-hidden"
                            >
                                <div className="p-3 border-b border-slate-800 bg-[#0c0c12] flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-md bg-brand/20 flex items-center justify-center text-brand">
                                            <MapPin className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h4 className="font-black text-xs text-white leading-tight">הגדרת תחנה חדשה</h4>
                                            <p className="text-[10px] text-slate-500 font-bold truncate max-w-[180px]">{configuringStop.full_address || configuringStop.address}</p>
                                        </div>
                                    </div>
                                    <button title="Close" onClick={() => setConfiguringStop(null)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 text-slate-500 hover:text-white transition-colors">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                <ScrollArea className="flex-1 p-4 space-y-5">
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black text-slate-500 uppercase">סוג תחנה</Label>
                                            <div className="grid grid-cols-2 gap-2">
                                                <button
                                                    onClick={() => setConfiguringStop({ ...configuringStop, type: 'pickup' })}
                                                    className={cn(
                                                        "h-10 rounded-xl border flex items-center justify-center gap-2 text-[11px] font-black transition-all",
                                                        configuringStop.type === 'pickup'
                                                            ? "bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                                                            : "bg-white/5 border-white/5 text-slate-500 grayscale opacity-60"
                                                    )}
                                                >
                                                    📦 איסוף
                                                </button>
                                                <button
                                                    onClick={() => setConfiguringStop({ ...configuringStop, type: 'delivery' })}
                                                    className={cn(
                                                        "h-10 rounded-xl border flex items-center justify-center gap-2 text-[11px] font-black transition-all",
                                                        configuringStop.type === 'delivery'
                                                            ? "bg-blue-500/20 border-blue-500 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.2)]"
                                                            : "bg-white/5 border-white/5 text-slate-500 grayscale opacity-60"
                                                    )}
                                                >
                                                    📍 מסירה
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black text-slate-500 uppercase">מזהה משלוח</Label>
                                            <div className="relative">
                                                <Package className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-blue-500/60" />
                                                <Input
                                                    placeholder={`אוטומטי: S${String(shipmentCounter).padStart(3, '0')}`}
                                                    value={configuringStop.shipment_id || ""}
                                                    onChange={e => setConfiguringStop({ ...configuringStop, shipment_id: e.target.value })}
                                                    className="h-9 bg-blue-500/5 border-blue-500/20 text-blue-300 pr-9 text-xs rounded-lg placeholder:text-blue-500/30 font-bold"
                                                />
                                            </div>
                                            <p className="text-[9px] text-slate-600 leading-snug">מקשר איסוף למסירה. אותו ID = אותה חבילה.</p>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black text-slate-500 uppercase">כמות חבילות / קרטונים</Label>
                                            <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-lg p-2">
                                                <button
                                                    title="הפחת חבילה"
                                                    onClick={() => setConfiguringStop({ ...configuringStop, packages: Math.max(1, (configuringStop.packages || 1) - 1) })}
                                                    className="w-8 h-8 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                                                >
                                                    <Minus className="w-3.5 h-3.5" />
                                                </button>
                                                <div className="flex-1 text-center">
                                                    <div className="text-xl font-black text-white">{configuringStop.packages || 1}</div>
                                                    <div className="text-[8px] text-slate-600 font-bold">{
                                                        (configuringStop.packages || 1) === 1 ? 'חבילה אחת' : 'חבילות'
                                                    }</div>
                                                </div>
                                                <button
                                                    title="הוסף חבילה"
                                                    onClick={() => setConfiguringStop({ ...configuringStop, packages: (configuringStop.packages || 1) + 1 })}
                                                    className="w-8 h-8 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                                                >
                                                    <Plus className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                            <p className="text-[9px] text-slate-600 leading-snug">כמה פריטים נאספים / נמסרים בתחנה זו. מספר קרטונים באיסוף צריך להתאים למספר במסירות.</p>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black text-slate-500 uppercase">מידע לתחנה</Label>
                                            <div className="space-y-2">
                                                <div className="relative">
                                                    <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
                                                    <Input
                                                        placeholder="מספר טלפון..."
                                                        value={configuringStop.contact_phone}
                                                        onChange={e => setConfiguringStop({ ...configuringStop, contact_phone: e.target.value })}
                                                        className="h-10 bg-white/5 border-white/5 text-slate-200 pr-9 text-xs rounded-lg"
                                                    />
                                                </div>
                                                <div className="relative">
                                                    <Info className="absolute right-3 top-3 w-3.5 h-3.5 text-slate-600" />
                                                    <Textarea
                                                        placeholder="הערות לשליח / קוד כניסה / תיוג..."
                                                        value={configuringStop.note}
                                                        onChange={e => setConfiguringStop({ ...configuringStop, note: e.target.value })}
                                                        className="min-h-[80px] bg-white/5 border-white/5 text-slate-200 pr-9 pt-2.5 text-xs rounded-lg resize-none"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </ScrollArea>

                                <div className="p-4 border-t border-white/5 bg-white/[0.01]">
                                    <Button
                                        onClick={() => confirmAddStop(configuringStop)}
                                        className="w-full h-11 bg-white text-slate-950 font-black rounded-lg hover:bg-slate-200 transition-all text-xs"
                                    >
                                        <Plus className="w-4 h-4 ml-2" />
                                        אישור והוספה למסלול
                                    </Button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </Tabs>
            </div>
        </>
    );
}
