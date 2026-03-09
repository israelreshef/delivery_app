"use client";

import * as React from "react";
import { MapPin, Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface AddressAutocompleteProps {
    value: string;
    onChange: (value: string) => void;
    onSelectAddress?: (address: {
        full_address: string;
        city: string;
        street: string;
        number: string;
        lat?: number;
        lng?: number;
    }) => void;
    placeholder?: string;
    className?: string;
    error?: string;
}

// Global script loader — only loads once
let googleMapsLoaded = false;
let googleMapsLoading = false;
const loadCallbacks: (() => void)[] = [];

function loadGoogleMapsScript(): Promise<void> {
    return new Promise((resolve) => {
        if (googleMapsLoaded && window.google?.maps?.places) {
            resolve();
            return;
        }
        loadCallbacks.push(resolve);
        if (googleMapsLoading) return;
        googleMapsLoading = true;

        const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
        if (!key) {
            console.error("[AddressAutocomplete] Missing NEXT_PUBLIC_GOOGLE_MAPS_KEY");
            googleMapsLoading = false;
            resolve(); // resolve anyway so the input stays usable as plain text
            return;
        }

        const script = document.createElement("script");
        script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&language=he&region=IL`;
        script.async = true;
        script.defer = true;
        script.onload = () => {
            googleMapsLoaded = true;
            googleMapsLoading = false;
            loadCallbacks.forEach((cb) => cb());
            loadCallbacks.length = 0;
        };
        script.onerror = () => {
            console.error("[AddressAutocomplete] Failed to load Google Maps script");
            googleMapsLoading = false;
            resolve();
        };
        document.head.appendChild(script);
    });
}

export function AddressAutocomplete({
    value,
    onChange,
    onSelectAddress,
    placeholder = "חפש כתובת...",
    className,
    error,
}: AddressAutocompleteProps) {
    const inputRef = React.useRef<HTMLInputElement>(null);
    const autocompleteRef = React.useRef<google.maps.places.Autocomplete | null>(null);
    const [ready, setReady] = React.useState(false);
    const [selected, setSelected] = React.useState(false);

    // Load Google Maps script
    React.useEffect(() => {
        loadGoogleMapsScript().then(() => setReady(true));
    }, []);

    // Initialize autocomplete when ready
    React.useEffect(() => {
        if (!ready || !inputRef.current || autocompleteRef.current) return;
        if (!window.google?.maps?.places) return;

        const ac = new google.maps.places.Autocomplete(inputRef.current, {
            componentRestrictions: { country: "il" },
            fields: ["address_components", "formatted_address", "geometry", "name"],
            types: ["address"],
        });

        ac.addListener("place_changed", () => {
            const place = ac.getPlace();
            if (!place?.address_components) return;

            let city = "";
            let street = "";
            let number = "";

            for (const comp of place.address_components) {
                const types = comp.types;
                if (types.includes("locality")) city = comp.long_name;
                if (types.includes("route")) street = comp.long_name;
                if (types.includes("street_number")) number = comp.long_name;
            }

            const fullAddress = place.formatted_address || `${street} ${number}, ${city}`;
            onChange(fullAddress);
            setSelected(true);

            if (onSelectAddress) {
                onSelectAddress({
                    full_address: fullAddress,
                    city,
                    street,
                    number,
                    lat: place.geometry?.location?.lat(),
                    lng: place.geometry?.location?.lng(),
                });
            }
        });

        autocompleteRef.current = ac;
    }, [ready, onChange, onSelectAddress]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSelected(false);
        onChange(e.target.value);
    };

    return (
        <div className={cn("relative", className)}>
            <div className="relative">
                <Input
                    ref={inputRef}
                    value={value}
                    onChange={handleChange}
                    placeholder={placeholder}
                    className={cn(
                        "w-full h-11 pr-3 pl-9",
                        error && "border-red-500 focus:border-red-500",
                        selected && "border-green-400 bg-green-50/50"
                    )}
                    autoComplete="off"
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    {!ready ? (
                        <Loader2 className="w-4 h-4 text-brand animate-spin" />
                    ) : selected ? (
                        <MapPin className="w-4 h-4 text-green-500" />
                    ) : (
                        <Search className="w-4 h-4 text-slate-400" />
                    )}
                </div>
            </div>
            {error && (
                <p className="text-red-500 text-xs mt-1">{error}</p>
            )}
        </div>
    );
}
