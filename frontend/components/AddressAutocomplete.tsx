"use client";

import * as React from "react"
import { MapPin, Loader2, AlertCircle, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { api } from "@/lib/api"

interface AddressAutocompleteProps {
    value: string;
    onChange: (value: string) => void;
    onSelectAddress?: (address: any) => void;
    placeholder?: string;
    className?: string;
    error?: string;
    valueKey?: 'street' | 'city' | 'full_address';
}

export function AddressAutocomplete({
    value,
    onChange,
    onSelectAddress,
    placeholder = "חפש כתובת...",
    className,
    error,
    valueKey = 'street'
}: AddressAutocompleteProps) {
    const [open, setOpen] = React.useState(false)
    const [inputValue, setInputValue] = React.useState('')
    const [suggestions, setSuggestions] = React.useState<any[]>([])
    const [loading, setLoading] = React.useState(false)
    const [hasSelected, setHasSelected] = React.useState(false)
    const debounceRef = React.useRef<NodeJS.Timeout | null>(null)
    const containerRef = React.useRef<HTMLDivElement>(null)

    // Sync display value from parent, especially when cleared
    React.useEffect(() => {
        if (value === "") {
            setInputValue("");
            setHasSelected(false);
        } else if (value && !inputValue && !hasSelected) {
            setInputValue(value);
            setHasSelected(true);
        }
    }, [value, inputValue, hasSelected]);

    // Close dropdown when clicking outside
    React.useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchSuggestions = async (query: string) => {
        if (!query || query.length < 2) {
            setSuggestions([]);
            setOpen(false);
            return;
        }

        setLoading(true);
        try {
            const res = await api.get(`/addresses/autocomplete?q=${encodeURIComponent(query)}`);
            const data = res.data || [];
            setSuggestions(data);
            if (data.length > 0) {
                setOpen(true);
            }
        } catch (error) {
            console.error("Failed to fetch address suggestions", error);
            setSuggestions([]);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setInputValue(newValue);
        setHasSelected(false);
        onChange(newValue);

        // Debounce API calls
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }
        debounceRef.current = setTimeout(() => {
            fetchSuggestions(newValue);
        }, 300);
    };

    const handleSelect = async (suggestion: any) => {
        const displayValue = suggestion.full_address || `${suggestion.street} ${suggestion.number}, ${suggestion.city}`;
        setInputValue(displayValue);
        setHasSelected(true);
        onChange(displayValue);
        setOpen(false);
        setSuggestions([]);

        // If suggestion doesn't have coordinates, fetch them via geocode endpoint
        if (!suggestion.lat || !suggestion.lng) {
            setLoading(true);
            try {
                const params = new URLSearchParams();
                if (suggestion.place_id) {
                    params.append('place_id', suggestion.place_id);
                } else {
                    params.append('q', displayValue);
                }

                const res = await api.get(`/addresses/geocode?${params.toString()}`);
                if (res.data && res.data.lat) {
                    const enrichedSuggestion = {
                        ...suggestion,
                        lat: res.data.lat,
                        lng: res.data.lng,
                        city: res.data.city || suggestion.city,
                        street: res.data.street || suggestion.street
                    };
                    if (onSelectAddress) {
                        onSelectAddress(enrichedSuggestion);
                    }
                }
            } catch (error) {
                console.error("Geocoding failed", error);
            } finally {
                setLoading(false);
            }
        } else {
            if (onSelectAddress) {
                onSelectAddress(suggestion);
            }
        }
    };

    const handleFocus = () => {
        // When user clicks the field after a selection, clear it so they can search again
        if (hasSelected && inputValue) {
            setInputValue('');
            setHasSelected(false);
            onChange(''); // Also clear parent
        }
        if (suggestions.length > 0 && !hasSelected) {
            setOpen(true);
        }
    };

    return (
        <div ref={containerRef} className={cn("relative", className)}>
            <div className="relative">
                <Input
                    value={inputValue}
                    onChange={handleInputChange}
                    onFocus={handleFocus}
                    placeholder={placeholder}
                    className={cn(
                        "w-full h-11 pr-3 pl-9",
                        error && "border-red-500 focus:border-red-500 focus:ring-red-500",
                        hasSelected && "border-green-400 bg-green-50/50"
                    )}
                    autoComplete="off"
                />
                {/* Search icon / loading spinner */}
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    {loading ? (
                        <Loader2 className="w-4 h-4 text-brand animate-spin" />
                    ) : (hasSelected && inputValue) ? (
                        <MapPin className="w-4 h-4 text-green-500" />
                    ) : (
                        <Search className="w-4 h-4 text-slate-400" />
                    )}
                </div>
            </div>

            {/* Suggestions dropdown */}
            {open && suggestions.length > 0 && (
                <div className="absolute z-[100] w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-60 overflow-auto animate-in fade-in slide-in-from-top-1 duration-150">
                    {suggestions.map((suggestion, index) => (
                        <button
                            key={suggestion.id || index}
                            type="button"
                            className="w-full px-4 py-3 text-right flex items-start gap-3 cursor-pointer hover:bg-brand/10 dark:hover:bg-brand/20 transition-colors border-b border-slate-50 dark:border-slate-800 last:border-0"
                            onClick={() => handleSelect(suggestion)}
                        >
                            <MapPin className="w-4 h-4 text-brand mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm text-slate-800 dark:text-slate-200 truncate">
                                    {suggestion.full_address}
                                </div>
                                {suggestion.city && suggestion.street && (
                                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        {suggestion.street}{suggestion.number ? ` ${suggestion.number}` : ''}, {suggestion.city}
                                    </div>
                                )}
                            </div>
                        </button>
                    ))}
                    <div className="px-4 py-1.5 text-[10px] text-slate-400 bg-slate-50 dark:bg-slate-800 text-center">
                        📍 תוצאות מ-Google Maps
                    </div>
                </div>
            )}

            {/* Loading state when no results yet */}
            {open && loading && suggestions.length === 0 && (
                <div className="absolute z-[100] w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl p-4 text-center">
                    <Loader2 className="w-5 h-5 text-brand animate-spin mx-auto mb-2" />
                    <span className="text-sm text-slate-500">מחפש כתובות...</span>
                </div>
            )}

            {/* Error message */}
            {error && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {error}
                </p>
            )}
        </div>
    )
}
