"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
    LayoutDashboard,
    Users,
    Truck,
    Settings,
    LogOut,
    Package,
    MessageSquare,
    BarChart3,
    LifeBuoy,
    Map,
    Wallet
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/AuthContext"

const sidebarItems = [
    { title: "לוח בקרה", href: "/admin/dashboard", icon: LayoutDashboard },
    { title: "הזמנות", href: "/admin/orders", icon: Package },
    { title: "ניהול שליחים", href: "/admin/couriers", icon: Truck },
    { title: "ניהול לקוחות", href: "/admin/customers", icon: Users },
    { title: "מרכז פיננסי", href: "/admin/finance", icon: Wallet },
    { title: "ניהול מלאי", href: "/admin/wms", icon: Package },
    { title: "דוחות ורגולציה", href: "/admin/reports", icon: BarChart3 },
    { title: "תכנון מסלולים", href: "/admin/map", icon: Map },
    { title: "CRM", href: "/admin/crm", icon: MessageSquare },
    { title: "תמיכה", href: "/admin/support", icon: LifeBuoy },
    { title: "הגדרות", href: "/admin/settings", icon: Settings },
]

export function AdminSidebar() {
    const pathname = usePathname()
    const { logout } = useAuth()

    return (
        <div className="flex flex-col h-full w-64 bg-navy-950 text-white shadow-xl" dir="rtl">
            <div className="p-6 border-b border-navy-900">
                <img src="/logo.png" alt="TZIR" className="h-8 w-auto mb-1" />
                <p className="text-xs text-navy-200 mt-1">מערכת ניהול מתקדמת</p>
            </div>

            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                {sidebarItems.map((item) => (
                    <Link key={item.href} href={item.href}>
                        <span
                            className={cn(
                                "flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium",
                                pathname === item.href || pathname?.startsWith(item.href + '/')
                                    ? "bg-brand text-white shadow-md"
                                    : "text-navy-200 hover:bg-navy-900 hover:text-white"
                            )}
                        >
                            <item.icon className="h-4 w-4" />
                            {item.title}
                        </span>
                    </Link>
                ))}
            </nav>

            <div className="p-4 border-t border-navy-900">
                <Button
                    variant="ghost"
                    className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-950/30 gap-3"
                    onClick={logout}
                >
                    <LogOut className="h-4 w-4" />
                    התנתק
                </Button>
            </div>
        </div>
    )
}
