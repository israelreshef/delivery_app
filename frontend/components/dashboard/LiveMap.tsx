"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Bike, Car, Truck, Navigation } from "lucide-react";

// Fix Leaflet Default Icon issue in Next.js
// We use custom icons anyway, but this is good practice
const iconPerson = new L.Icon({
    iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
    iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
    shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Custom div icon provider
const createCustomIcon = (type: string) => {
    let color = "#3b82f6"; // blue-500
    let iconHtml = '<div style="background-color: #3b82f6; width: 100%; height: 100%; border-radius: 50%;"></div>';

    if (type === 'motorcycle' || type === 'scooter') {
        color = "#f59e0b"; // amber-500
        iconHtml = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><path d="M15 6h2.5a2.5 2.5 0 1 1 0 5H12"/><path d="M6 17.5V11l5-5"/></svg>`;
    } else if (type === 'car') {
        color = "#22c55e"; // green-500
        iconHtml = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>`;
    }

    return L.divIcon({
        className: "custom-marker",
        html: `<div style="
            background-color: ${color};
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid white;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        ">${iconHtml}</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
    });
};

const RecenterBtn = ({ lat, lng }: { lat: number, lng: number }) => {
    const map = useMap();
    useEffect(() => {
        map.setView([lat, lng]);
    }, [lat, lng, map]);
    return null;
};

export default function LiveMap() {
    const [couriers, setCouriers] = useState<any[]>([]);

    // Default center (Tel Aviv)
    const center: [number, number] = [32.0853, 34.7818];

    useEffect(() => {
        const fetchCouriers = async () => {
            try {
                const res = await api.get('/couriers');
                setCouriers(res.data);
            } catch (err) {
                console.error("Failed to fetch couriers", err);
            }
        };

        fetchCouriers();
        // Poll every 5 seconds for live movement
        const interval = setInterval(fetchCouriers, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="h-full w-full rounded-xl overflow-hidden shadow-sm border border-slate-200 relative z-0">
            <MapContainer
                center={center}
                zoom={13}
                style={{ height: "100%", width: "100%" }}
                scrollWheelZoom={true}
            >
                {/* Dark Mode Style for Premium Feel */}
                <TileLayer
                    attribution='&copy; <a href="https://www.carto.com/">CARTOn</a>'
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                />

                {couriers.map((courier) => (
                    courier.current_location && (
                        <Marker
                            key={courier.id}
                            position={[courier.current_location.lat, courier.current_location.lng]}
                            icon={createCustomIcon(courier.vehicle_type)}
                        >
                            <Popup>
                                <div className="p-1 min-w-[150px] text-right" dir="rtl">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="font-bold text-sm">{courier.full_name}</div>
                                        <Badge variant={courier.is_available ? "default" : "secondary"} className="text-[10px] h-5">
                                            {courier.is_available ? "פנוי" : "עסוק"}
                                        </Badge>
                                    </div>
                                    <div className="text-xs text-muted-foreground mb-1">
                                        {courier.vehicle_type === 'scooter' ? 'קטנוע' :
                                            courier.vehicle_type === 'car' ? 'רכב פרטי' : courier.vehicle_type}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        סוללה: 85% | מהירות: 0 קמ"ש
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    )
                ))}
            </MapContainer>
        </div>
    );
}
