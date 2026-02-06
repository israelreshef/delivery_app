import Link from "next/link";
import Image from "next/image";
import {
    LayoutDashboard,
    Package,
    Users,
    Truck,
    Settings,
    LogOut,
    MessageSquare,
    BarChart3,
    LifeBuoy,
    CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";
import StartChatButton from "@/components/chat/StartChatButton";

const menuItems = [
    { href: "/", label: "לוח בקרה", icon: LayoutDashboard },
    { href: "/orders", label: "משלוחים", icon: Package },
    { href: "/couriers", label: "שליחים", icon: Truck },
    { href: "/admin/customers", label: "לקוחות", icon: Users },
    { href: "/admin/crm", label: "CRM", icon: MessageSquare },
    { href: "/admin/support", label: "תמיכה", icon: LifeBuoy },
    { href: "/admin/compliance", label: "רגולציה", icon: CheckCircle2 },
    { href: "/admin/wms", label: "ניהול מלאי", icon: Package },
    { href: "/admin/reports", label: "דוחות", icon: BarChart3 },
    { href: "/settings", label: "הגדרות", icon: Settings },
];

export function Sidebar() {
    const pathname = "/";

    return (
        <div className="flex h-screen w-64 flex-col justify-between border-l bg-card px-4 py-6">
            <div>
                <div className="mb-8 flex items-center justify-center px-2">
                    <div className="relative h-12 w-full">
                        <Image
                            src="/logo.png"
                            alt="TZIR DELIVERY"
                            fill
                            className="object-contain"
                            priority
                        />
                    </div>
                </div>

                <nav className="space-y-1">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                                    isActive
                                        ? "bg-primary text-primary-foreground"
                                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                )}
                            >
                                <Icon className="h-4 w-4 ml-2" />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            <div className="space-y-2">
                <StartChatButton variant="ghost" className="w-full justify-start" showLabel={true} />
                <button className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 w-full">
                    <LogOut className="h-4 w-4 ml-2" />
                    התנתק
                </button>
            </div>
        </div>
    );
}
