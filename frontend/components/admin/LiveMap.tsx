"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useState, useCallback } from 'react';
import { useSocket } from '@/lib/socket';
import { useAuth } from '@/context/AuthContext';
import L from 'leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { Button } from '@/components/ui/button';
import { Maximize2, Navigation } from 'lucide-react';
import { auth } from '@/lib/auth';
import { api } from '@/lib/api';

// Helper for custom colored icons
const getCourierIcon = (isAvailable: boolean, activeDeliveryId: number | null, isLive: boolean) => {
    let color = '#94a3b8'; // gray-400 (offline)
    if (activeDeliveryId) color = '#145DDB'; // brand (busy)
    else if (isAvailable && isLive) color = '#10b981'; // emerald-500 (available)

    return L.divIcon({
        className: 'custom-courier-icon',
        html: `
            <div style="
                background-color: ${color};
                width: 32px;
                height: 32px;
                border: 2px solid white;
                border-radius: 50%;
                box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
                display: flex;
                align-items: center;
                justify-content: center;
            ">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14"></path>
                    <path d="M16.5 9.4 7.55 4.24"></path>
                    <polyline points="3.29 7 12 12 20.71 7"></polyline>
                    <line x1="12" y1="22" x2="12" y2="12"></line>
                </svg>
            </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16]
    });
};

interface CourierLocation {
    id: number;
    name: string;
    lat: number;
    lng: number;
    isAvailable: boolean;
    activeDeliveryId: number | null;
    isLive: boolean;
    status: 'idle' | 'busy' | 'offline';
    lastUpdate: Date;
}

// Sub-component to handle map view updates
function MapUpdater({ couriers, autoFocus }: { couriers: CourierLocation[], autoFocus: boolean }) {
    const map = useMap();

    useEffect(() => {
        if (!couriers || couriers.length === 0) return;

        if (couriers.length === 1) {
            // If only one courier (e.g. emulator in Europe), center and zoom on them
            map.setView([couriers[0].lat, couriers[0].lng], 13);
        } else if (autoFocus) {
            // If multiple couriers, fit bounds to see all
            const bounds = L.latLngBounds(couriers.map(c => [c.lat, c.lng]));
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
        }
    }, [couriers, autoFocus, map]);

    return null;
}

export default function LiveMap() {
    const { user } = useAuth();
    // Use the robust getToken helper from auth.ts instead of direct storage access
    const token = typeof window !== 'undefined' ? auth.getToken() : null;
    const [role, setRole] = useState<string | null>(null);

    useEffect(() => {
        if (user) {
            setRole(user.role || user.user_type || null);
        }
    }, [user]);

    const socket = useSocket(token, role);

    const [couriers, setCouriers] = useState<Record<number, CourierLocation>>({});
    const [autoFocus, setAutoFocus] = useState(true);

    // Initial Fetch
    useEffect(() => {
        if (!token) return;

        const fetchInitialCouriers = async () => {
            try {
                const res = await api.get('/admin/couriers/locations');
                const data = res.data;

                if (data && Array.isArray(data.couriers)) {
                    const initialCouriers: Record<number, CourierLocation> = {};
                    data.couriers.forEach((c: any) => {
                        if (c.latitude && c.longitude) {
                            initialCouriers[c.id] = {
                                id: c.id,
                                name: c.name,
                                lat: c.latitude,
                                lng: c.longitude,
                                isLive: !!c.is_live,
                                isAvailable: !!c.is_available,
                                activeDeliveryId: c.active_delivery_id || null,
                                status: c.active_delivery_id ? 'busy' : (c.is_available ? 'idle' : 'offline'),
                                lastUpdate: c.last_seen ? new Date(c.last_seen) : new Date()
                            };
                        }
                    });
                    setCouriers(initialCouriers);
                }
            } catch (err) {
                console.error("Failed to fetch initial courier locations:", err);
            }
        };

        fetchInitialCouriers();
    }, [token]);

    useEffect(() => {
        if (!socket) return;
        console.log("🗺️ Live Map Listening...");

        const handleLocationUpdate = (data: any) => {
            setCouriers(prev => ({
                ...prev,
                [data.courier_id]: {
                    id: data.courier_id,
                    name: data.name || `שליח ${data.courier_id}`,
                    lat: data.lat,
                    lng: data.lng,
                    isLive: true,
                    isAvailable: !!data.is_available,
                    activeDeliveryId: data.active_delivery_id || null,
                    status: data.active_delivery_id ? 'busy' : (data.is_available ? 'idle' : 'offline'),
                    lastUpdate: new Date()
                }
            }));
        };

        socket.on('courier_location_update', handleLocationUpdate);
        socket.on('courier_location', handleLocationUpdate); // Fallback for mixed backend versions

        return () => {
            socket.off('courier_location_update');
            socket.off('courier_location');
        };
    }, [socket]);

    const courierList = Object.values(couriers);

    return (
        <div className="relative w-full h-full rounded-lg overflow-hidden border shadow-sm">
            <MapContainer
                center={[32.0853, 34.7818]} // Default TA, but MapUpdater will override
                zoom={13}
                scrollWheelZoom={true}
                style={{ height: "100%", width: "100%" }}
            >
                <TileLayer
                    url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                    attribution="&copy; Google Maps"
                />

                <MapUpdater couriers={courierList} autoFocus={autoFocus} />

                <MarkerClusterGroup chunkedLoading>
                    {courierList.map(courier => (
                        <Marker
                            key={courier.id}
                            position={[courier.lat, courier.lng]}
                            icon={getCourierIcon(courier.isAvailable, courier.activeDeliveryId, courier.isLive)}
                        >
                            <Popup>
                                <div className="text-right p-1" dir="rtl">
                                    <div className="font-bold text-brand">{courier.name}</div>
                                    <div className="text-sm mt-1">
                                        <span className="font-medium">סטטוס:</span> {
                                            courier.status === 'idle' ? 'זמין' :
                                                courier.status === 'busy' ? 'במשלוח' : 'לא מחובר'
                                        }
                                    </div>
                                    <div className="text-[10px] text-gray-500 mt-2 bg-slate-50 p-1 rounded">
                                        עודכן לאחרונה: {courier.lastUpdate.toLocaleTimeString()}
                                    </div>
                                    <div className="text-[10px] text-slate-400 mt-1">
                                        מיקום: {courier.lat.toFixed(4)}, {courier.lng.toFixed(4)}
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MarkerClusterGroup>
            </MapContainer>

            {/* Map Controls */}
            <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
                <Button
                    size="sm"
                    variant={autoFocus ? "default" : "secondary"}
                    className="shadow-md gap-2"
                    onClick={() => setAutoFocus(!autoFocus)}
                >
                    <Maximize2 className="h-4 w-4" />
                    {autoFocus ? "ביטול מיקוד אוטומטי" : "מיקוד על השליחים"}
                </Button>
            </div>

            {/* Stats Overlay */}
            <div className="absolute bottom-4 left-4 z-[1000] bg-slate-900/90 backdrop-blur-sm p-3 rounded-lg border border-slate-700 shadow-lg pointer-events-none text-slate-100">
                <div className="text-xs font-bold mb-1">
                    שליחים מחוברים כעת: {courierList.filter(c => c.isLive).length}
                </div>
                <div className="flex gap-3">
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-[10px] text-slate-200">זמינים</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-brand" />
                        <span className="text-[10px] text-slate-200">במשלוח</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

