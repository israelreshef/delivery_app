"use client";

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet Default Icon issue in Next.js
const iconUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png';
const iconRetinaUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png';
const shadowUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png';

// Custom Icons
const createIcon = (color: string) => new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/markers/blue.png`.replace('blue', color),
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const pickupIcon = createIcon('green');
const deliveryIcon = createIcon('red');
const courierIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/3063/3063823.png', // Motorcycle icon
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -10],
});

interface Point {
    lat: number;
    lng: number;
    address?: string;
}

interface TrackingMapProps {
    pickup: Point;
    delivery: Point;
    courier?: Point;
    status: string;
}

function SetBounds({ pickup, delivery, courier }: { pickup: Point, delivery: Point, courier?: Point }) {
    const map = useMap();

    useEffect(() => {
        if (!pickup.lat || !delivery.lat) return;

        const bounds = L.latLngBounds([
            [pickup.lat, pickup.lng],
            [delivery.lat, delivery.lng]
        ]);

        if (courier && courier.lat) {
            bounds.extend([courier.lat, courier.lng]);
        }

        map.fitBounds(bounds, { padding: [50, 50] });
    }, [pickup, delivery, courier, map]);

    return null;
}

export default function TrackingMap({ pickup, delivery, courier, status }: TrackingMapProps) {
    // Default center if coordinates missing (Tel Aviv)
    const center = [32.0853, 34.7818];
    const hasCoords = pickup.lat && delivery.lat;

    if (!hasCoords) {
        return (
            <div className="h-full w-full bg-slate-100 flex items-center justify-center text-slate-500 rounded-xl">
                חסרים נתוני מיקום להצגת המפה
            </div>
        );
    }

    return (
        <MapContainer
            center={center as [number, number]}
            zoom={13}
            className="h-full w-full rounded-xl z-0"
            scrollWheelZoom={false}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <SetBounds pickup={pickup} delivery={delivery} courier={courier} />

            {/* Pickup Marker */}
            <Marker position={[pickup.lat, pickup.lng]} icon={pickupIcon}>
                <Popup>
                    <div className="text-right" dir="rtl">
                        <strong>נקודת איסוף</strong><br />
                        {pickup.address}
                    </div>
                </Popup>
            </Marker>

            {/* Delivery Marker */}
            <Marker position={[delivery.lat, delivery.lng]} icon={deliveryIcon}>
                <Popup>
                    <div className="text-right" dir="rtl">
                        <strong>נקודת מסירה</strong><br />
                        {delivery.address}
                    </div>
                </Popup>
            </Marker>

            {/* Courier Marker (if active) */}
            {courier && courier.lat && (status === 'assigned' || status === 'picked_up' || status === 'in_transit') && (
                <Marker position={[courier.lat, courier.lng]} icon={courierIcon}>
                    <Popup>
                        <div className="text-right" dir="rtl">
                            <strong>השליח כאן</strong>
                        </div>
                    </Popup>
                </Marker>
            )}

            {/* Route Line (Straight line for now - OSMR can provide real geometry later) */}
            <Polyline
                positions={[
                    [pickup.lat, pickup.lng],
                    [delivery.lat, delivery.lng]
                ]}
                color="blue"
                dashArray="10, 10"
                opacity={0.5}
            />
        </MapContainer>
    );
}
