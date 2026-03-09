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

// Fix Leaflet Default Icon in Next.js
const iconPerson = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/6833/6833605.png', // Courier Icon
    iconRetinaUrl: 'https://cdn-icons-png.flaticon.com/512/6833/6833605.png',
    iconSize: [35, 35],
    popupAnchor: [0, -15],
    className: 'rounded-full border-2 border-white shadow-lg'
});

interface CourierLocation {
    id: number;
    name: string;
    lat: number;
    lng: number;
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
                // Use the configured api instance for automatic interceptors and robustness
                const res = await api.get('/couriers?limit=100');
                const data = res.data;

                if (data.data) {
                    const initialCouriers: Record<number, CourierLocation> = {};
                    data.data.forEach((c: any) => {
                        if (c.current_location) {
                            initialCouriers[c.id] = {
                                id: c.id,
                                name: c.full_name,
                                lat: c.current_location.lat,
                                lng: c.current_location.lng,
                                status: c.is_available ? 'idle' : 'offline', // Default, real-time will refine
                                lastUpdate: new Date()
                            };
                        }
                    });
                    setCouriers(initialCouriers);
                }
            } catch (err) {
                console.error("Failed to fetch initial couriers:", err);
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
                    status: data.status || 'busy',
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
                            icon={iconPerson}
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
            <div className="absolute bottom-4 left-4 z-[1000] bg-white/90 backdrop-blur-sm p-3 rounded-lg border shadow-lg pointer-events-none">
                <div className="text-xs font-bold text-slate-700 mb-1">שליחים פעילים: {courierList.length}</div>
                <div className="flex gap-3">
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-[10px] text-slate-600">זמינים</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-amber-500" />
                        <span className="text-[10px] text-slate-600">במשלוח</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

