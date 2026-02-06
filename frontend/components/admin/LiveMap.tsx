"use client";

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useState } from 'react';
import { useSocket } from '@/lib/socket';
import L from 'leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';

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

export default function LiveMap() {
    const socket = useSocket();
    // Default to Tel Aviv
    const [couriers, setCouriers] = useState<Record<number, CourierLocation>>({});

    useEffect(() => {
        if (!socket) return;
        console.log("🗺️ Live Map Listening...");

        socket.on('courier_location_update', (data: any) => {
            setCouriers(prev => ({
                ...prev,
                [data.courier_id]: {
                    id: data.courier_id,
                    name: data.name || `Courier ${data.courier_id}`,
                    lat: data.lat,
                    lng: data.lng,
                    status: data.status || 'busy',
                    lastUpdate: new Date()
                }
            }));
        });

        // Mock data update for demo purposes if no real couriers move
        socket.on('demo_location_update', (data: any) => { /* Same logic */ });

        return () => {
            socket.off('courier_location_update');
        };
    }, [socket]);

    return (
        <MapContainer
            center={[32.0853, 34.7818]}
            zoom={13}
            scrollWheelZoom={true}
            style={{ height: "100%", width: "100%", borderRadius: "0.5rem" }}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MarkerClusterGroup chunkedLoading>
                {Object.values(couriers).map(courier => (
                    <Marker
                        key={courier.id}
                        position={[courier.lat, courier.lng]}
                        icon={iconPerson}
                    >
                        <Popup>
                            <div className="text-right" dir="rtl">
                                <strong>{courier.name}</strong><br />
                                סטטוס: {courier.status}<br />
                                <span className="text-xs text-gray-500">עודכן: {courier.lastUpdate.toLocaleTimeString()}</span>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MarkerClusterGroup>
        </MapContainer>
    );
}
