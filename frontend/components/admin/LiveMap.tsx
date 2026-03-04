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
        if (!autoFocus || couriers.length === 0) return;

        const bounds = L.latLngBounds(couriers.map(c => [c.lat, c.lng]));
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }, [couriers, autoFocus, map]);

    return null;
}

export default function LiveMap() {
    const { user } = useAuth();
    // Correct token retrieval from sessionStorage using the key from auth.ts
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('tzir_auth_token') : null;
    const socket = useSocket(token, user?.role || null);

    const [couriers, setCouriers] = useState<Record<number, CourierLocation>>({});
    const [autoFocus, setAutoFocus] = useState(true);

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

