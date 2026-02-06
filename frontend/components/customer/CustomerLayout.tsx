"use client";

import { useAuth } from "@/context/AuthContext";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, PlusCircle, Settings, LogOut, Package, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import ConsentModal from "../auth/ConsentModal";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
    const { user, logout } = useAuth();
    const pathname = usePathname();

    const navItems = [
        { href: "/customer/dashboard", label: "דשבורד", icon: LayoutDashboard },
        { href: "/customer/orders/new", label: "הזמנה חדשה", icon: PlusCircle },
        { href: "/customer/orders", label: "ההזמנות שלי", icon: Package },
        { href: "/customer/profile", label: "פרופיל", icon: User },
    ];

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row" dir="rtl">

            {/* Desktop Sidebar */}
            <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-white h-screen sticky top-0 z-40">
                <div className="p-6 border-b border-slate-800 flex items-center justify-center">
                    <h1 className="text-2xl font-black tracking-tighter text-blue-400">TZIR<span className="text-white">.Customer</span></h1>
                </div>

                <div className="p-4 flex flex-col gap-2 flex-1 mt-4">
                    <div className="px-4 py-2 mb-6">
                        <p className="text-xs text-slate-400 uppercase tracking-wider font-bold mb-1">שלום,</p>
                        <p className="font-bold text-lg truncate">{user?.full_name || user?.username || 'לקוח יקר'}</p>
                    </div>

                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group",
                                    isActive
                                        ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20"
                                        : "text-slate-400 hover:bg-slate-800 hover:text-white"
                                )}
                            >
                                <Icon className={cn("w-5 h-5", isActive ? "text-white" : "text-slate-500 group-hover:text-blue-400")} />
                                <span className="font-medium">{item.label}</span>
                            </Link>
                        );
                    })}
                </div>

                <div className="p-4 border-t border-slate-800 mt-auto">
                    <Button
                        onClick={logout}
                        variant="ghost"
                        className="w-full text-slate-400 hover:text-white hover:bg-red-900/20 justify-start gap-2"
                        aria-label="התנתק מהמערכת"
                    >
                        <LogOut className="w-4 h-4" /> התנתק
                    </Button>
                </div>
            </aside>

            {/* Mobile Header */}
            <header className="md:hidden bg-slate-900 text-white p-4 flex items-center justify-between shadow-md sticky top-0 z-30">
                <span className="font-black text-xl text-blue-400">TZIR</span>
                <div className="text-sm font-medium">{user?.username}</div>
            </header>

            {/* Main Content */}
            <main className="flex-1 w-full p-4 md:p-8 overflow-y-auto h-screen pb-24 md:pb-8">
                {children}
            </main>

            {/* Consent Modal for Privacy/Terms */}
            <ConsentModal />

            {/* Mobile Bottom Nav */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 pb-safe-area shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
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
                                    isActive ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
                                )}
                            >
                                <Icon className={cn("w-5 h-5", isActive && "fill-current/20")} />
                                <span className="text-[10px] font-medium">{item.label}</span>
                            </Link>
                        );
                    })}
                    <button
                        className="flex flex-col items-center justify-center w-full h-full gap-1 text-slate-400 hover:text-red-500 transition-colors"
                        aria-label="יציאה מהמערכת"
                    >
                        <LogOut className="w-5 h-5" />
                        <span className="text-[10px] font-medium">יציאה</span>
                    </button>
                </div>
            </nav>

        </div>
    );
}
