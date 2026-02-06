"use client";

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Skeleton } from "@/components/ui/skeleton";

// Dynamically import Map with no SSR
const MapContainer = dynamic(
    () => import('react-leaflet').then((mod) => mod.MapContainer),
    { ssr: false }
);
const TileLayer = dynamic(
    () => import('react-leaflet').then((mod) => mod.TileLayer),
    { ssr: false }
);
const Marker = dynamic(
    () => import('react-leaflet').then((mod) => mod.Marker),
    { ssr: false }
);
const Popup = dynamic(
    () => import('react-leaflet').then((mod) => mod.Popup),
    { ssr: false }
);

import "leaflet/dist/leaflet.css";
import L from 'leaflet';

// Fix for default Leaflet icons in Next.js
const iconUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png';
const iconRetinaUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png';
const shadowUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png';

// Custom Icons
const courierIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: shadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const storeIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: shadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const customerIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: shadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

interface Location {
    lat: number;
    lng: number;
    address?: string;
}

interface Order {
    id: number;
    order_number: string;
    pickup_location?: Location;
    delivery_location?: Location;
    status: string;
}

interface CourierMapProps {
    courierLocation?: Location;
    orders?: Order[]; // Orders to show (available or active)
    activeOrder?: Order; // If set, highlights route/focused view
    height?: string;
}

export default function CourierMap({ courierLocation, orders = [], activeOrder, height = "400px" }: CourierMapProps) {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) {
        return <Skeleton className={`w-full h-[${height}] rounded-lg`} />;
    }

    const center = courierLocation
        ? [courierLocation.lat, courierLocation.lng]
        : [32.0853, 34.7818]; // Tel Aviv default

    return (
        <div style={{ height, width: "100%", borderRadius: "0.5rem", overflow: "hidden", zIndex: 0 }}>
            {/* @ts-ignore */}
            <MapContainer center={center} zoom={13} style={{ height: "100%", width: "100%" }}>
                {/* @ts-ignore */}
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />

                {/* Courier Location */}
                {courierLocation && (
                    /* @ts-ignore */
                    <Marker position={[courierLocation.lat, courierLocation.lng]} icon={courierIcon}>
                        {/* @ts-ignore */}
                        <Popup>המיקום שלך</Popup>
                    </Marker>
                )}

                {/* Orders */}
                {orders.map(order => (
                    <div key={order.id}>
                        {order.pickup_location && (
                            /* @ts-ignore */
                            <Marker position={[order.pickup_location.lat, order.pickup_location.lng]} icon={storeIcon}>
                                {/* @ts-ignore */}
                                <Popup>
                                    <div className="text-right" dir="rtl">
                                        <strong>איסוף: {order.order_number}</strong><br />
                                        {order.pickup_location.address}
                                    </div>
                                </Popup>
                            </Marker>
                        )}
                        {order.delivery_location && (
                            /* @ts-ignore */
                            <Marker position={[order.delivery_location.lat, order.delivery_location.lng]} icon={customerIcon}>
                                {/* @ts-ignore */}
                                <Popup>
                                    <div className="text-right" dir="rtl">
                                        <strong>מסירה: {order.order_number}</strong><br />
                                        {order.delivery_location.address}
                                    </div>
                                </Popup>
                            </Marker>
                        )}
                    </div>
                ))}
            </MapContainer>
        </div>
    );
}
