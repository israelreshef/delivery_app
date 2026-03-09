"use client";

import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, Truck, Users, Activity, TrendingUp, DollarSign, MapPin } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from './dashboard.module.css';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import dynamic from 'next/dynamic';
import LiveFeed from "@/components/admin/LiveFeed";
import ExpensesDashboard from "@/components/admin/ExpensesDashboard";
import { Badge } from "@/components/ui/badge";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

import { auth } from "@/lib/auth";

export default function AdminDashboard() {
    const { user, isAuthenticated, isLoading } = useAuth();
    const router = useRouter();
    const [stats, setStats] = useState<DashboardStats & { active_courier_list?: any[] }>({
        active_orders: 0,
        active_couriers: 0,
        orders_today: 0,
        revenue_today: 0,
        new_customers: 0,
        available_couriers: 0,
        active_courier_list: []
    });
    const [isCouriersModalOpen, setIsCouriersModalOpen] = useState(false);
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
    const token = auth.getToken();
    const socket = useSocket(token, user?.role || null);

    useEffect(() => {
        if (!socket || user?.role !== 'admin') return;

        socket.on('courier_availability_update', (data: any) => {
            console.log("Real-time courier availability update:", data);
            fetchStats();
        });

        socket.on('courier_count_update', (data: any) => {
            console.log("Real-time courier connection count update:", data);
            fetchStats();
        });

        // Other relevant events that should trigger a stats refresh
        socket.on('order_update', () => fetchStats());
        socket.on('new_order', () => fetchStats());

        return () => {
            socket.off('courier_availability_update');
            socket.off('courier_count_update');
            socket.off('order_update');
            socket.off('new_order');
        };
    }, [socket, user?.role]);

    if (isLoading) return <div className="flex h-screen items-center justify-center"><LoadingSpinner size="lg" text="טוען נתוני דאשבורד..." /></div>;
    // if (!isAuthenticated) return null; // Handled by middleware or effect

    return (
        <div className={styles.dashboardContainer}>
            <header className={styles.headerArea}>
                <div>
                    <h1 className={styles.title}>לוח בקרה ניהולי</h1>
                    <p className={styles.subtitle}>סקירה כללית על ביצועי המערכת בזמן אמת</p>
                </div>
                <div className={styles.headerActions}>
                    <Link href="/orders/new" className={styles.btnPrimary}>
                        <Package size={18} />
                        הזמנה חדשה
                    </Link>
                    <Link href="/admin/couriers" className={styles.btnOutline}>
                        <Truck size={18} />
                        ניהול שליחים
                    </Link>
                </div>
            </header>

            {/* Key Metrics Grid */}
            <div className={styles.metricsGrid}>
                <div className={styles.metricCard}>
                    <div>
                        <div className={styles.metricLabel}>הכנסות היום</div>
                        <div className={styles.metricValue}>₪{stats.revenue_today?.toLocaleString() || 0}</div>
                        <p className="text-xs text-green-500 flex items-center mt-1">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            מתעדכן בזמן אמת
                        </p>
                    </div>
                    <div className={`${styles.metricIcon} ${styles.iconGreen}`}>
                        <DollarSign size={24} />
                    </div>
                </div>

                <div className={styles.metricCard}>
                    <div>
                        <div className={styles.metricLabel}>משלוחים פעילים</div>
                        <div className={styles.metricValue}>{stats.active_orders || 0}</div>
                        <p className="text-xs text-slate-400 mt-1">מתוך {stats.orders_today || 0} הזמנות היום</p>
                    </div>
                    <div className={`${styles.metricIcon} ${styles.iconBrand}`}>
                        <Activity size={24} />
                    </div>
                </div>

                <div
                    className={`${styles.metricCard} cursor-pointer hover:bg-slate-50 transition-colors`}
                    onClick={() => setIsCouriersModalOpen(true)}
                >
                    <div>
                        <div className={styles.metricLabel}>שליחים פעילים</div>
                        <div className={styles.metricValue}>{stats.active_couriers || 0}</div>
                        <p className="text-xs text-slate-400 mt-1">מחוברים כעת (לחץ לפירוט)</p>
                    </div>
                    <div className={`${styles.metricIcon} ${styles.iconOrange}`}>
                        <Truck size={24} />
                    </div>
                </div>

                <div className={styles.metricCard}>
                    <div>
                        <div className={styles.metricLabel}>לקוחות חדשים</div>
                        <div className={styles.metricValue}>+{stats.new_customers}</div>
                        <p className="text-xs text-slate-400 mt-1">הצטרפו השבוע</p>
                    </div>
                    <div className={`${styles.metricIcon} ${styles.iconPurple}`}>
                        <Users size={24} />
                    </div>
                </div>
            </div>

            {/* Expenses Monitor */}
            <ExpensesDashboard />

            {/* Charts & Map Section */}
            <div className={`${styles.sectionGrid} ${styles.sectionGrid7}`}>
                {/* Revenue Chart */}
                <div className={`${styles.panelCard} ${styles.colSpan4}`}>
                    <div className={styles.panelHeader}>
                        <div>
                            <div className={styles.panelTitle}>הכנסות שבועיות</div>
                            <div className={styles.panelDescription}>סיכום הכנסות משליחויות ב-7 הימים האחרונים</div>
                        </div>
                    </div>
                    <div className={styles.panelContent}>
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
                                    cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                                    contentStyle={{ backgroundColor: '#1E293B', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Live Map */}
                <div className={`${styles.panelCard} ${styles.colSpan3} ${styles.liveMapContainer}`}>
                    <div className={styles.panelHeader}>
                        <div>
                            <div className={styles.panelTitle}>
                                <MapPin className="text-brand" size={20} />
                                מפה חיה
                            </div>
                            <div className={styles.panelDescription}>מיקום שליחים בזמן אמת</div>
                        </div>
                        <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30 animate-pulse">Live</Badge>
                    </div>
                    <div className={styles.panelContentNoPadding}>
                        <DynamicLiveMap />
                    </div>
                </div>
            </div>

            {/* Live Feed Row */}
            <div className={`${styles.sectionGrid} ${styles.sectionGrid3}`}>
                <div className={`${styles.panelCard} ${styles.colSpan1}`}>
                    <div className={styles.panelHeader}>
                        <div>
                            <div className={styles.panelTitle}>עדכונים אחרונים</div>
                            <div className={styles.panelDescription}>פיד פעילות מבצעית</div>
                        </div>
                    </div>
                    <div className={styles.panelContent}>
                        <LiveFeed />
                    </div>
                </div>
            </div>

            <div className={`${styles.sectionGrid} ${styles.sectionGrid3}`}>
                <Link href="/admin/couriers" className={styles.quickLinkCard}>
                    <div className={`${styles.quickLinkIcon} bg-brand/20`}>
                        <Truck className="text-brand" size={24} />
                    </div>
                    <div>
                        <div className={styles.quickLinkTitle}>ניהול שליחים</div>
                        <div className={styles.quickLinkDesc}>צפייה, עריכה וגיוס שליחים</div>
                    </div>
                </Link>

                <Link href="/admin/customers" className={styles.quickLinkCard}>
                    <div className={`${styles.quickLinkIcon} bg-purple-500/20`}>
                        <Users className="text-purple-400" size={24} />
                    </div>
                    <div>
                        <div className={styles.quickLinkTitle}>ניהול לקוחות</div>
                        <div className={styles.quickLinkDesc}>לקוחות עסקיים, חיובים ואשראי</div>
                    </div>
                </Link>

                <Link href="/admin/finance" className={styles.quickLinkCard}>
                    <Badge className="absolute top-4 left-4 bg-brand text-white border-0 z-10" variant="default">חדש</Badge>
                    <div className={`${styles.quickLinkIcon} bg-green-500/20`}>
                        <TrendingUp className="text-green-400" size={24} />
                    </div>
                    <div>
                        <div className={styles.quickLinkTitle}>מרכז פיננסי</div>
                        <div className={styles.quickLinkDesc}>ניהול הכנסות ודיווחים רגולטוריים</div>
                    </div>
                </Link>
            </div>

            {/* Active Couriers Modal */}
            <Dialog open={isCouriersModalOpen} onOpenChange={setIsCouriersModalOpen}>
                <DialogContent className="max-w-md bg-white">
                    <DialogHeader>
                        <DialogTitle className="text-right">שליחים מחוברים כעת</DialogTitle>
                        <DialogDescription className="text-right">
                            רשימת השליחים שזמינים כרגע ומחוברים מהאפליקציה
                        </DialogDescription>
                    </DialogHeader>

                    <div className="mt-4 space-y-3">
                        {stats.active_courier_list && stats.active_courier_list.length > 0 ? (
                            stats.active_courier_list.map((courier: any) => (
                                <div key={courier.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-10 w-10 border-2 border-brand/20">
                                            <AvatarFallback className="bg-brand/10 text-brand">
                                                {courier.name.charAt(0)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="text-right">
                                            <div className="font-bold text-slate-900">{courier.name}</div>
                                            <div className="text-xs text-slate-500">ID: {courier.id}</div>
                                        </div>
                                    </div>
                                    <div className="text-left">
                                        <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200">זמין</Badge>
                                        <div className="text-[10px] text-slate-400 mt-1">
                                            {courier.lat.toFixed(4)}, {courier.lng.toFixed(4)}
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-10 text-slate-400 border-2 border-dashed rounded-lg">
                                אין שליחים מחוברים כרגע
                            </div>
                        )}
                    </div>

                    <div className="mt-6 flex justify-end">
                        <Button variant="secondary" onClick={() => setIsCouriersModalOpen(false)}>סגור</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
