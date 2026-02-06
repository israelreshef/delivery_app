"use client";

import * as React from "react"
import { Check, ChevronsUpDown, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { api } from "@/lib/api"
import { auth } from "@/lib/auth"

interface AddressAutocompleteProps {
    value: string;
    onChange: (value: string) => void;
    onSelectAddress?: (address: any) => void;
    placeholder?: string;
    className?: string;
    error?: string;
    valueKey?: 'street' | 'city' | 'full_address';
}

export function AddressAutocomplete({ value, onChange, onSelectAddress, placeholder = "חפש כתובת...", className, error, valueKey = 'street' }: AddressAutocompleteProps) {
    const [open, setOpen] = React.useState(false)
    const [inputValue, setInputValue] = React.useState(value)
    const [suggestions, setSuggestions] = React.useState<any[]>([])
    const [loading, setLoading] = React.useState(false)

    React.useEffect(() => {
        setInputValue(value);
    }, [value]);

    const fetchSuggestions = async (query: string) => {
        if (!query || query.length < 2) {
            setSuggestions([]);
            return;
        }

        setLoading(true);
        try {
            const res = await api.get(`/addresses/autocomplete?q=${encodeURIComponent(query)}`);
            setSuggestions(res.data);
        } catch (error) {
            console.error("Failed to fetch address suggestions", error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setInputValue(newValue);
        onChange(newValue);

        // Debounce fetching
        const timeoutId = setTimeout(() => {
            fetchSuggestions(newValue);
        }, 300);
        return () => clearTimeout(timeoutId);
    };

    const handleSelect = (suggestion: any) => {
        onChange(suggestion[valueKey]); // Set the value based on selected key
        if (onSelectAddress) {
            onSelectAddress(suggestion); // Pass full details back
        }
        setOpen(false);
    };

    return (
        <div className={cn("relative", className)}>
            <div className="relative">
                <Input
                    value={inputValue}
                    onChange={handleInputChange}
                    onFocus={() => {
                        if (suggestions.length > 0) setOpen(true);
                    }}
                    placeholder={placeholder}
                    className={cn("w-full", error && "border-red-500 focus:border-red-500")}
                />
                {suggestions.length > 0 && open && (
                    <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                        {loading && <div className="p-2 text-sm text-gray-500">מחפש...</div>}
                        {!loading && suggestions.map((suggestion) => (
                            <div
                                key={suggestion.id}
                                className="px-4 py-2 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800"
                                onClick={() => handleSelect(suggestion)}
                            >
                                <div className="font-medium inline-block">{suggestion.full_address}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            {error && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {error}
                </p>
            )}
            {/* Overlay to close when clicking outside */}
            {open && (
                <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setOpen(false)} />
            )}
        </div>
    )
}
