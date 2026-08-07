"use client";

import { useEffect, useRef, useState } from 'react';

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
    waypoints?: Point[]; // Added support for future multiple stops
}

function loadGoogleMapsScript(): Promise<void> {
    return new Promise((resolve) => {
        const checkReady = () => {
            if (window.google?.maps?.Map) {
                resolve();
            } else {
                setTimeout(checkReady, 100);
            }
        };

        if (window.google?.maps?.Map) {
            resolve();
            return;
        }

        const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
        if (existingScript) {
            checkReady();
            return;
        }

        const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
        if (!key) {
            console.error("[TrackingMap] Missing NEXT_PUBLIC_GOOGLE_MAPS_KEY");
            resolve();
            return;
        }

        const script = document.createElement("script");
        script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&language=he&region=IL`;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
        
        checkReady();
    });
}

export default function TrackingMap({ pickup, delivery, courier, status, waypoints = [] }: TrackingMapProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const [map, setMap] = useState<google.maps.Map | null>(null);
    const [directionsRenderer, setDirectionsRenderer] = useState<google.maps.DirectionsRenderer | null>(null);

    useEffect(() => {
        loadGoogleMapsScript().then(() => {
            if (!mapRef.current || !window.google?.maps?.Map) return;
            
            // Dark mode styling for Google Maps (TZIR Premium Style)
            const darkStyle = [
              { elementType: "geometry", stylers: [{ color: "#0A1929" }] },
              { elementType: "labels.text.stroke", stylers: [{ color: "#05101F" }] },
              { elementType: "labels.text.fill", stylers: [{ color: "#A8C8E0" }] },
              { featureType: "road", elementType: "geometry", stylers: [{ color: "#1A3557" }] },
              { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#2E5480" }] },
              { featureType: "poi", elementType: "geometry", stylers: [{ color: "#0D2137" }] },
              { featureType: "water", elementType: "geometry", stylers: [{ color: "#05101F" }] },
            ];

            const initialMap = new window.google.maps.Map(mapRef.current, {
                center: { lat: pickup.lat || 32.0853, lng: pickup.lng || 34.7818 },
                zoom: 13,
                styles: darkStyle,
                disableDefaultUI: true,
                zoomControl: true,
            });

            const renderer = new window.google.maps.DirectionsRenderer({
                map: initialMap,
                suppressMarkers: true, // We will draw our own custom markers
                polylineOptions: {
                    strokeColor: '#145DDB', // TZIR Brand Amber
                    strokeWeight: 4,
                    strokeOpacity: 0.9
                }
            });

            setMap(initialMap);
            setDirectionsRenderer(renderer);
        });
    }, [pickup.lat, pickup.lng]);

    // Draw route and markers when map is ready
    useEffect(() => {
        if (!map || !directionsRenderer || !window.google) return;

        // Custom Markers
        const createMarker = (position: {lat: number, lng: number}, iconUrl: string, title: string, size: number = 40) => {
            return new window.google.maps.Marker({
                position,
                map,
                title,
                icon: {
                    url: iconUrl,
                    scaledSize: new window.google.maps.Size(size, size),
                    anchor: new window.google.maps.Point(size/2, size) // Anchor at bottom center
                }
            });
        };

        const markers: google.maps.Marker[] = [];

        // Pickup Marker (Green Store/Box Icon)
        if (pickup.lat && pickup.lng) {
            markers.push(createMarker(
                { lat: pickup.lat, lng: pickup.lng }, 
                'https://cdn-icons-png.flaticon.com/512/3082/3082008.png',
                'נקודת איסוף',
                44
            ));
        }

        // Delivery Marker (Red Map Pin / Flag)
        if (delivery.lat && delivery.lng) {
            markers.push(createMarker(
                { lat: delivery.lat, lng: delivery.lng }, 
                'https://cdn-icons-png.flaticon.com/512/1483/1483336.png',
                'נקודת מסירה',
                44
            ));
        }

        // Waypoints Markers (if any)
        waypoints.forEach((wp, index) => {
            if (wp.lat && wp.lng) {
                markers.push(createMarker(
                    { lat: wp.lat, lng: wp.lng },
                    'https://cdn-icons-png.flaticon.com/512/3082/3082008.png', // Reusing pickup icon for waypoints
                    `תחנה ${index + 1}`,
                    32
                ));
            }
        });

        // Courier Marker (if active)
        if (courier?.lat && courier?.lng && ['assigned', 'picked_up', 'in_transit'].includes(status)) {
            markers.push(createMarker(
                { lat: courier.lat, lng: courier.lng },
                'https://cdn-icons-png.flaticon.com/512/3063/3063823.png', // Motorcycle
                'השליח',
                48
            ));
        }

        // Draw Route (Using OSRM to save Google Directions API costs)
        if (pickup.lat && delivery.lat) {
            const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${pickup.lng},${pickup.lat};${delivery.lng},${delivery.lat}?overview=full&geometries=geojson`;
            
            fetch(osrmUrl)
                .then(res => res.json())
                .then(data => {
                    if (data.code === 'Ok' && map) {
                        const coords = data.routes[0].geometry.coordinates;
                        const path = coords.map((c: number[]) => new window.google.maps.LatLng(c[1], c[0]));
                        
                        const routeLine = new window.google.maps.Polyline({
                            path: path,
                            geodesic: true,
                            strokeColor: '#145DDB', // Brand Amber
                            strokeOpacity: 0.9,
                            strokeWeight: 5,
                            map: map
                        });
                        
                        // Add to markers array to clean up later
                        (routeLine as any).isRouteLine = true;
                        markers.push(routeLine as any);

                        // Fit map bounds to route
                        const bounds = new window.google.maps.LatLngBounds();
                        path.forEach((p: any) => bounds.extend(p));
                        map.fitBounds(bounds);
                    }
                })
                .catch(err => {
                    console.error("OSRM Route fetch failed:", err);
                    // Fallback to straight line bounds
                    if (map) {
                        const bounds = new window.google.maps.LatLngBounds();
                        markers.forEach(m => {
                            if (m.getPosition) bounds.extend(m.getPosition()!);
                        });
                        map.fitBounds(bounds);
                    }
                });
        }

        // Cleanup markers and lines on unmount or update
        return () => {
            markers.forEach(m => m.setMap(null));
        };

    }, [map, directionsRenderer, pickup, delivery, courier, status, waypoints]);

    return (
        <div className="w-full h-full relative">
            {!window.google?.maps?.Map && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#05101F]/80 backdrop-blur-sm text-brand animate-pulse">
                    טוען מפות...
                </div>
            )}
            <div ref={mapRef} className="w-full h-full rounded-xl bg-[#0A1929]" />
        </div>
    );
}
