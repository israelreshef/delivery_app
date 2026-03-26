"use client"

import { AdminSidebar } from "@/components/admin/AdminSidebar"
import { useIdleTimer } from "@/hooks/useIdleTimer"

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    useIdleTimer(15) // Fix 16: auto-logout after 15 min inactivity
    return (

        <div className="flex h-screen bg-slate-50 overflow-hidden">
            {/* Sidebar - Fixed width */}
            <aside className="hidden md:block h-full shrink-0">
                <AdminSidebar />
            </aside>

            {/* Main Content - Scrollable */}
            <main className="flex-1 overflow-y-auto h-full w-full">
                {children}
            </main>

            {/* Mobile Sidebar overlay could be added here later */}
        </div>
    )
}
