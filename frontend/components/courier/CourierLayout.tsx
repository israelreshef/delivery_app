"use client";

import { useAuth } from "@/context/AuthContext";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, DollarSign, User, Pause, Play, LogOut, MapPin, Package, AlertCircle } from "lucide-react";
import ConsentModal from "../auth/ConsentModal";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useSocket } from "@/context/SocketContext";
import { useCourierStore } from "@/lib/stores/courierStore";
import { useEffect } from "react";

export default function CourierLayout({ children }: { children: React.ReactNode }) {
    const { user, logout } = useAuth();
    const pathname = usePathname();
    const [isOnline, setIsOnline] = useState(true);

    // Global Socket Handling
    const { socket } = useSocket();
    const { setIncomingOrder } = useCourierStore();

    useEffect(() => {
        if (!socket) return;

        // Listen for new order offers globally
        socket.on('new_order_offer', (data) => {
            console.log("🔔 Incoming Order Offer (Global):", data);

            // Enrich with mock location if missing (consistent with dashboard for demo)
            const enrichedOrder = {
                ...data.order,
                pickup_location: { lat: 32.0800 + (Math.random() * 0.01), lng: 34.7800 + (Math.random() * 0.01), address: data.order.pickup_address },
                delivery_location: { lat: 32.0850 + (Math.random() * 0.01), lng: 34.7850 + (Math.random() * 0.01), address: data.order.delivery_address }
            };

            setIncomingOrder(enrichedOrder);

            // Optional: Play sound
            const audio = new Audio('/sounds/notification.mp3'); // Ensure this file exists or use trusted URL
            audio.play().catch(e => console.log('Audio play failed', e));
        });

        return () => {
            socket.off('new_order_offer');
        };
    }, [socket, setIncomingOrder]);

    const toggleStatus = () => {
        const newStatus = !isOnline;
        setIsOnline(newStatus);
        // In a real app, we would make an API call here
        toast.success(newStatus ? "עברת למצב זמין" : "עברת למצב לא זמין");
    };

    const navItems = [
        { href: "/courier/dashboard", label: "דשבורד", icon: LayoutDashboard },
        { href: "/courier/stats", label: "רווחים", icon: DollarSign },
        { href: "/courier/profile", label: "פרופיל", icon: User },
    ];

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row" dir="rtl">

            {/* Desktop Right Sidebar */}
            <aside className="hidden md:flex flex-col w-64 bg-white border-l h-screen sticky top-0 z-40 shadow-sm">
                <div className="p-6 border-b flex items-center justify-center">
                    <h1 className="text-2xl font-black text-blue-600 tracking-tighter">TZIR<span className="text-slate-400">.</span></h1>
                </div>

                <div className="p-4 flex flex-col gap-2 flex-1">
                    <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-lg mb-4">
                        <div className={cn("w-3 h-3 rounded-full", isOnline ? "bg-green-500" : "bg-red-500 shadow-sm")} />
                        <div className="flex-1">
                            <p className="text-sm font-bold text-slate-700">{user?.username || 'שליח'}</p>
                            <p className="text-xs text-slate-500">{isOnline ? 'זמין לקבלת הצעות' : 'לא זמין כרגע'}</p>
                        </div>
                    </div>

                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group",
                                    isActive
                                        ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                                        : "text-slate-600 hover:bg-slate-50 hover:text-blue-600"
                                )}
                            >
                                <Icon className={cn("w-5 h-5", isActive ? "text-white" : "text-slate-400 group-hover:text-blue-600")} />
                                <span className="font-medium text-sm">{item.label}</span>
                            </Link>
                        );
                    })}
                </div>

                <div className="p-4 border-t space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <Label htmlFor="status-mode" className="text-sm text-slate-600">מצב זמינות</Label>
                        <Switch
                            id="status-mode"
                            checked={isOnline}
                            onCheckedChange={toggleStatus}
                            className="data-[state=checked]:bg-green-600"
                        />
                    </div>
                    <Button
                        onClick={logout}
                        variant="ghost"
                        className="w-full text-red-500 hover:text-red-700 hover:bg-red-50 justify-start gap-2"
                    >
                        <LogOut className="w-4 h-4" /> התנתק
                    </Button>
                </div>
            </aside>

            {/* Mobile Top Header (Hidden on Desktop) */}
            <header className="md:hidden bg-white border-b sticky top-0 z-30 px-4 h-16 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                        <span className="font-bold text-lg leading-tight">שלום, {user?.username}</span>
                        <span className={cn("text-xs flex items-center gap-1", isOnline ? "text-green-600" : "text-slate-500")}>
                            <span className={cn("w-2 h-2 rounded-full", isOnline ? "bg-green-600" : "bg-slate-400")} />
                            {isOnline ? "זמין להצעות" : "לא זמין"}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-full">
                        <span className={cn("text-xs font-medium px-2 transition-colors", !isOnline && "text-slate-500")}>
                            {isOnline ? "פעיל" : "הפסקה"}
                        </span>
                        <Switch
                            checked={isOnline}
                            onCheckedChange={toggleStatus}
                            className="data-[state=checked]:bg-green-600"
                        />
                    </div>
                </div>
            </header>

            {/* Consent Modal for Privacy/Terms */}
            <ConsentModal />

            {/* Main Content Area */}
            <main className="flex-1 pb-20 md:pb-6 container p-4 md:p-8 max-w-5xl overflow-y-auto h-screen">
                {children}
            </main>

            {/* Bottom Navigation (Mobile Only) */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t z-30 pb-safe-area">
                <div className="flex justify-around items-center h-16">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex flex-col items-center justify-center w-full h-full gap-1 transition-colors",
                                    isActive ? "text-blue-600" : "text-slate-500 hover:text-slate-800"
                                )}
                            >
                                <Icon className={cn("w-6 h-6", isActive && "fill-current/10")} />
                                <span className="text-[10px] font-medium">{item.label}</span>
                            </Link>
                        );
                    })}
                    <button
                        onClick={logout}
                        className="flex flex-col items-center justify-center w-full h-full gap-1 text-slate-500 hover:text-red-600 transition-colors"
                    >
                        <LogOut className="w-6 h-6" />
                        <span className="text-[10px] font-medium">יציאה</span>
                    </button>
                </div>
            </nav>
        </div>
    );
}
