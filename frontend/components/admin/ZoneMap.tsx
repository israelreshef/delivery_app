"use client";

import { MapContainer, TileLayer, Polygon, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect } from 'react';

// Fix Leaflet Icon
const icon = L.icon({
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

interface Zone {
    id: number;
    name: string;
    description: string;
    polygon_coords: [number, number][];
    price_multiplier: number;
}

interface ZoneMapProps {
    zones: Zone[];
}

function MapUpdater({ zones }: { zones: Zone[] }) {
    const map = useMap();
    useEffect(() => {
        if (zones.length > 0) {
            // Calculate bounds to fit all zones
            const allCoords = zones.flatMap(z => z.polygon_coords);
            if (allCoords.length > 0) {
                const bounds = L.latLngBounds(allCoords);
                map.fitBounds(bounds, { padding: [50, 50] });
            }
        }
    }, [zones, map]);
    return null;
}

export default function ZoneMap({ zones }: ZoneMapProps) {
    const defaultCenter: [number, number] = [32.0853, 34.7818]; // Tel Aviv

    // Colors for different zones
    const colors = ['blue', 'green', 'red', 'purple', 'orange'];

    return (
        <MapContainer
            center={defaultCenter}
            zoom={12}
            style={{ height: '100%', width: '100%' }}
        >
            <TileLayer
                url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                attribution="&copy; Google Maps"
            />

            <MapUpdater zones={zones} />

            {zones.map((zone, index) => (
                <Polygon
                    key={zone.id}
                    positions={zone.polygon_coords}
                    pathOptions={{ color: colors[index % colors.length] }}
                >
                    <Popup>
                        <div className="text-right" dir="rtl">
                            <h3 className="font-bold">{zone.name}</h3>
                            <p>{zone.description}</p>
                            <p className="text-sm font-semibold">מכפיל מחיר: x{zone.price_multiplier}</p>
                        </div>
                    </Popup>
                </Polygon>
            ))}
        </MapContainer>
    );
}
