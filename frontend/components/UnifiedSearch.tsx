"use client";

import * as React from "react"
import { MapPin, Loader2, Search, Package, User, Phone, Hash, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { api } from "@/lib/api"
import { Badge } from "@/components/ui/badge"

interface UnifiedSearchProps {
    onSelectAddress?: (address: any) => void;
    onSelectOrder?: (order: any) => void;
    placeholder?: string;
    className?: string;
}

export function UnifiedSearch({
    onSelectAddress,
    onSelectOrder,
    placeholder = "חפש כתובת או מספר הזמנה...",
    className
}: UnifiedSearchProps) {
    const [open, setOpen] = React.useState(false)
    const [inputValue, setInputValue] = React.useState('')
    const [results, setResults] = React.useState<{
        addresses: any[],
        orders: any[]
    }>({ addresses: [], orders: [] })
    const [loading, setLoading] = React.useState(false)
    const debounceRef = React.useRef<NodeJS.Timeout | null>(null)
    const containerRef = React.useRef<HTMLDivElement>(null)

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

    const performSearch = async (query: string) => {
        if (!query || query.length < 2) {
            setResults({ addresses: [], orders: [] });
            setOpen(false);
            return;
        }

        setLoading(true);
        try {
            // Parallel search for addresses and orders
            const [addrRes, orderRes] = await Promise.all([
                api.get(`/addresses/autocomplete?q=${encodeURIComponent(query)}`),
                api.get(`/orders?q=${encodeURIComponent(query)}&limit=5`)
            ]);

            setResults({
                addresses: addrRes.data || [],
                orders: orderRes.data || []
            });

            if ((addrRes.data?.length > 0) || (orderRes.data?.length > 0)) {
                setOpen(true);
            }
        } catch (error) {
            console.error("Search failed", error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setInputValue(newValue);

        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }
        debounceRef.current = setTimeout(() => {
            performSearch(newValue);
        }, 300);
    };

    const handleSelectAddress = async (suggestion: any) => {
        setInputValue('');
        setOpen(false);
        setResults({ addresses: [], orders: [] });

        // If suggestion doesn't have coordinates, fetch them
        if (!suggestion.lat || !suggestion.lng) {
            setLoading(true);
            try {
                const params = new URLSearchParams();
                if (suggestion.place_id) {
                    params.append('place_id', suggestion.place_id);
                } else {
                    params.append('q', suggestion.full_address);
                }

                const res = await api.get(`/addresses/geocode?${params.toString()}`);
                if (res.data && res.data.lat) {
                    onSelectAddress?.({
                        ...suggestion,
                        lat: res.data.lat,
                        lng: res.data.lng,
                        city: res.data.city || suggestion.city,
                        street: res.data.street || suggestion.street
                    });
                }
            } catch (error) {
                console.error("Geocoding failed", error);
            } finally {
                setLoading(false);
            }
        } else {
            onSelectAddress?.(suggestion);
        }
    };

    const handleSelectOrder = (order: any) => {
        setInputValue('');
        setOpen(false);
        setResults({ addresses: [], orders: [] });
        onSelectOrder?.(order);
    };

    return (
        <div ref={containerRef} className={cn("relative", className)} dir="rtl">
            <div className="relative group">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    {loading ? (
                        <Loader2 className="h-4 w-4 text-brand animate-spin" />
                    ) : (
                        <Search className="h-4 w-4 text-slate-400 group-focus-within:text-brand transition-colors" />
                    )}
                </div>
                <Input
                    value={inputValue}
                    onChange={handleInputChange}
                    placeholder={placeholder}
                    className="w-full h-9 pr-9 pl-4 bg-slate-900 border-slate-700 focus:border-brand focus:ring-brand shadow-sm rounded-lg transition-all text-slate-200 placeholder:text-slate-600 text-xs"
                    autoComplete="off"
                />
            </div>

            {open && (
                <div className="absolute z-[100] w-full mt-2 bg-[#0e0e14] border border-slate-700 rounded-xl shadow-2xl max-h-[400px] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="overflow-y-auto max-h-[400px] p-1.5">
                        {/* Orders Section */}
                        {results.orders.length > 0 && (
                            <div className="mb-2">
                                <div className="px-3 py-1.5 text-[9px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
                                    <Package className="w-3 h-3" />
                                    הזמנות קיימות
                                </div>
                                {results.orders.map((order) => (
                                    <button
                                        key={order.id}
                                        className="w-full p-2.5 text-right flex items-center justify-between hover:bg-slate-800 rounded-lg transition-all group"
                                        onClick={() => handleSelectOrder(order)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 bg-brand/20 rounded-lg flex items-center justify-center text-brand">
                                                <Hash className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-slate-100">#{order.order_number}</div>
                                                <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                                                    <span className="flex items-center gap-1"><User className="w-2.5 h-2.5 text-slate-500" />{order.customer_name}</span>
                                                    <span className="flex items-center gap-1"><Phone className="w-2.5 h-2.5 text-slate-500" />{order.phone}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <Badge variant="outline" className="text-[9px] h-4 px-1.5 py-0 border-brand/20 text-brand bg-brand/5">{order.status}</Badge>
                                            <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-brand group-hover:translate-x-[-3px] transition-all" />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Addresses Section */}
                        {results.addresses.length > 0 && (
                            <div>
                                <div className="px-3 py-1.5 text-[9px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
                                    <MapPin className="w-3 h-3" />
                                    כתובות ומיקומים
                                </div>
                                {results.addresses.map((addr, index) => (
                                    <button
                                        key={addr.place_id || index}
                                        className="w-full p-2.5 text-right flex items-start gap-3 hover:bg-slate-800 rounded-lg transition-all"
                                        onClick={() => handleSelectAddress(addr)}
                                    >
                                        <div className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center text-indigo-400 mt-0.5">
                                            <MapPin className="w-3.5 h-3.5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs font-bold text-slate-200 truncate">
                                                {addr.full_address}
                                            </div>
                                            {(addr.street || addr.city) && (
                                                <div className="text-[10px] text-slate-500 mt-0.5">
                                                    {addr.street} {addr.number}, {addr.city}
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {results.addresses.length === 0 && results.orders.length === 0 && !loading && (
                            <div className="p-8 text-center">
                                <Search className="w-8 h-8 mx-auto mb-3 text-slate-700" />
                                <p className="text-xs font-bold text-slate-500">לא נמצאו תוצאות</p>
                            </div>
                        )}
                    </div>
                    {(results.addresses.length > 0 || results.orders.length > 0) && (
                        <div className="px-3 py-2 text-[9px] font-bold text-slate-600 bg-slate-900 text-center border-t border-slate-800 flex justify-center gap-4">
                            <span>🔍 חיפוש חכם</span>
                            <span>📍 Google Maps</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
