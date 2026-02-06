"use client";

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useSocket } from '@/lib/socket';

// Fix Leaflet marker icon issue in Next.js
const icon = L.icon({
    iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
    iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
    shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Courier custom icon (motorcycle/car)
const courierIcon = L.icon({
    iconUrl: "https://cdn-icons-png.flaticon.com/512/3063/3063823.png", // Example courier icon
    iconSize: [32, 32],
    iconAnchor: [16, 16],
});

type CourierLocation = {
    courier_id: number;
    lat: number;
    lng: number;
    timestamp?: string;
};

export default function LiveMap() {
    const socket = useSocket();
    const [couriers, setCouriers] = useState<Record<number, CourierLocation>>({});

    useEffect(() => {
        if (!socket) return;

        // Listen for location updates
        socket.on('courier_location', (data: any) => {
            // data format: { courier_id: 1, lat: 32.0, lng: 34.0 }
            console.log('📍 Location update:', data);
            setCouriers(prev => ({
                ...prev,
                [data.courier_id]: {
                    courier_id: data.courier_id,
                    lat: data.lat,
                    lng: data.lng,
                    timestamp: new Date().toISOString() // or data.timestamp
                }
            }));
        });

        return () => {
            socket.off('courier_location');
        };
    }, [socket]);

    return (
        <div className="h-full w-full rounded-lg overflow-hidden border">
            <MapContainer
                center={[32.0853, 34.7818]} // Tel Aviv
                zoom={13}
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                />

                {Object.values(couriers).map((courier) => (
                    <Marker
                        key={courier.courier_id}
                        position={[courier.lat, courier.lng]}
                        icon={courierIcon}
                    >
                        <Popup>
                            <div dir="rtl" className="text-right">
                                <strong>שליח #{courier.courier_id}</strong><br />
                                עודכן: {new Date().toLocaleTimeString()}
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
}
