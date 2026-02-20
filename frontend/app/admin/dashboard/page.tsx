"use client";

import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, Truck, Users, Activity, TrendingUp, DollarSign, MapPin } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import dynamic from 'next/dynamic';
import LiveFeed from "@/components/admin/LiveFeed";
import { Badge } from "@/components/ui/badge";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { DashboardStats, RevenueData } from "@/types/api";
import { useSocket } from "@/lib/socket";

// Dynamically import Map to avoid SSR issues
const DynamicLiveMap = dynamic(() => import('@/components/admin/LiveMap'), {
    ssr: false,
    loading: () => <div className="h-full w-full bg-slate-100 animate-pulse flex items-center justify-center text-slate-400">טוען מפה...</div>
});

// Mock Data for Charts (Will be replaced with API data later)
const mockRevenueData = [
    { name: 'א', total: 4000 },
    { name: 'ב', total: 3000 },
    { name: 'ג', total: 2000 },
    { name: 'ד', total: 2780 },
    { name: 'ה', total: 1890 },
    { name: 'ו', total: 2390 },
    { name: 'ש', total: 3490 },
];

export default function AdminDashboard() {
    const { user, isAuthenticated, isLoading } = useAuth();
    const router = useRouter();
    const [stats, setStats] = useState<DashboardStats>({
        active_orders: 0,
        active_couriers: 0,
        orders_today: 0,
        revenue_today: 0,
        new_customers: 0,
        available_couriers: 0
    });
    const [revenueData, setRevenueData] = useState<RevenueData[]>([]); // Initialize empty

    // Fetch stats initially without getting blocked by missing sockets
    const fetchStats = async () => {
        try {
            const statsRes = await api.get('/stats/dashboard');
            setStats(statsRes.data);

            // Fetch Revenue Data
            const revRes = await api.get('/stats/revenue');
            setRevenueData(revRes.data);
        } catch (error: any) {
            if (error.response?.status === 401) {
                console.log("Unauthorized stats fetch");
                return;
            }
            console.error("Failed to fetch admin stats", error);
        }
    };

    useEffect(() => {
        if (user?.role !== 'admin') return;
        fetchStats();

        // Fallback polling just in case WebSockets fail
        const interval = setInterval(fetchStats, 60000); // 1-minute fallback
        return () => clearInterval(interval);
    }, [user?.role]);

    // WebSocket realtime integration
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const socket = useSocket(token, user?.role || null);

    useEffect(() => {
        if (!socket || user?.role !== 'admin') return;

        socket.on('courier_availability_update', (data: any) => {
            console.log("Real-time courier availability update:", data);
            // Re-fetch entire stats cleanly to ensure consistency
            fetchStats();
        });

        // Other relevant events that should trigger a stats refresh
        socket.on('order_update', () => fetchStats());
        socket.on('new_order', () => fetchStats());

        return () => {
            socket.off('courier_availability_update');
            socket.off('order_update');
            socket.off('new_order');
        };
    }, [socket, user?.role]);

    if (isLoading) return <div className="flex h-screen items-center justify-center"><LoadingSpinner size="lg" text="טוען נתוני דאשבורד..." /></div>;
    // if (!isAuthenticated) return null; // Handled by middleware or effect

    return (
        <div className="p-4 md:p-8 space-y-6 md:space-y-8 bg-slate-50 min-h-screen" dir="rtl">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">לוח בקרה ניהולי</h1>
                    <p className="text-slate-500 mt-2">סקירה כללית על ביצועי המערכת בזמן אמת</p>
                </div>
                <div className="flex flex-wrap gap-3 w-full md:w-auto">
                    <Link href="/orders/new" className="flex-1 md:flex-none">
                        <Button className="gap-2 bg-blue-600 hover:bg-blue-700 shadow-sm w-full md:w-auto">
                            <Package className="w-4 h-4" />
                            הזמנה חדשה
                        </Button>
                    </Link>
                    <Link href="/admin/couriers" className="flex-1 md:flex-none">
                        <Button variant="outline" className="gap-2 w-full md:w-auto">
                            <Truck className="w-4 h-4" />
                            ניהול שליחים
                        </Button>
                    </Link>
                </div>
            </header>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="border-none shadow-md hover:shadow-lg transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">הכנסות היום</CardTitle>
                        <DollarSign className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-slate-900">₪{stats.revenue_today?.toLocaleString() || 0}</div>
                        <p className="text-xs text-green-600 flex items-center mt-1">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            מתעדכן בזמן אמת
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-md hover:shadow-lg transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">משלוחים פעילים</CardTitle>
                        <Activity className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-slate-900">{stats.active_orders || 0}</div>
                        <p className="text-xs text-slate-500 mt-1">מתוך {stats.orders_today || 0} הזמנות היום</p>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-md hover:shadow-lg transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">שליחים פעילים</CardTitle>
                        <Truck className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-slate-900">{stats.active_couriers || 0}</div>
                        <p className="text-xs text-slate-500 mt-1">מחוברים כעת</p>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-md hover:shadow-lg transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">לקוחות חדשים</CardTitle>
                        <Users className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-slate-900">+{stats.new_customers}</div>
                        <p className="text-xs text-slate-500 mt-1">הצטרפו השבוע</p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts & Map Section */}
            <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
                {/* Revenue Chart */}
                <Card className="col-span-4 border-none shadow-md">
                    <CardHeader>
                        <CardTitle>הכנסות שבועיות</CardTitle>
                        <CardDescription>סיכום הכנסות משליחויות ב-7 הימים האחרונים</CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <ResponsiveContainer width="100%" height={350}>
                            <BarChart data={revenueData}>
                                <XAxis
                                    dataKey="date"
                                    stroke="#888888"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="#888888"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => `₪${value}`}
                                />
                                <Tooltip
                                    cursor={{ fill: 'transparent' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                />
                                <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Live Map */}
                <Card className="col-span-3 border-none shadow-md flex flex-col h-[450px]">
                    <CardHeader className="pb-2">
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <MapPin className="w-5 h-5 text-blue-600" />
                                    מפה חיה
                                </CardTitle>
                                <CardDescription>מיקום שליחים בזמן אמת</CardDescription>
                            </div>
                            <Badge variant="outline" className="bg-green-50 text-green-700 animate-pulse">Live</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 p-0 relative overflow-hidden rounded-b-lg">
                        <DynamicLiveMap />
                    </CardContent>
                </Card>
            </div>

            {/* Live Feed Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="col-span-1 border-none shadow-md">
                    <CardHeader>
                        <CardTitle>עדכונים אחרונים</CardTitle>
                        <CardDescription>פיד פעילות מבצעית</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <LiveFeed />
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Link href="/admin/couriers" className="block">
                    <Card className="hover:bg-slate-50 transition-colors cursor-pointer border-dashed border-2 box-content">
                        <CardHeader className="flex flex-row items-center gap-4">
                            <div className="p-2 bg-blue-100 rounded-full">
                                <Truck className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                                <CardTitle className="text-base">ניהול שליחים</CardTitle>
                                <CardDescription>צפייה, עריכה וגיוס שליחים</CardDescription>
                            </div>
                        </CardHeader>
                    </Card>
                </Link>

                <Link href="/admin/customers" className="block">
                    <Card className="hover:bg-slate-50 transition-colors cursor-pointer border-dashed border-2 box-content">
                        <CardHeader className="flex flex-row items-center gap-4">
                            <div className="p-2 bg-purple-100 rounded-full">
                                <Users className="h-6 w-6 text-purple-600" />
                            </div>
                            <div>
                                <CardTitle className="text-base">ניהול לקוחות</CardTitle>
                                <CardDescription>לקוחות עסקיים, חיובים ואשראי</CardDescription>
                            </div>
                        </CardHeader>
                    </Card>
                </Link>

                <Link href="/reports" className="block">
                    <Card className="hover:bg-slate-50 transition-colors cursor-pointer border-dashed border-2 box-content">
                        <CardHeader className="flex flex-row items-center gap-4">
                            <div className="p-2 bg-green-100 rounded-full">
                                <TrendingUp className="h-6 w-6 text-green-600" />
                            </div>
                            <div>
                                <CardTitle className="text-base">דוחות כספיים</CardTitle>
                                <CardDescription>ייצוא דוחות וחשבוניות</CardDescription>
                            </div>
                        </CardHeader>
                    </Card>
                </Link>
            </div>

        </div>
    );
}
