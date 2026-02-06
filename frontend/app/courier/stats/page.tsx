"use client";

import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, Package, TrendingUp, Calendar, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { format } from "date-fns";

export default function CourierStatsPage() {
    const { user } = useAuth();
    const [history, setHistory] = useState<any[]>([]);
    const [stats, setStats] = useState<any>({
        today_deliveries: 0,
        today_earnings: 0,
        weekly_earnings: 0,
        monthly_earnings: 0
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem('token');
                // Fetch stats
                const statsRes = await fetch('http://localhost:5000/api/courier/stats', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (statsRes.ok) {
                    const data = await statsRes.json();
                    setStats(data);
                }

                // Fetch history
                const historyRes = await fetch('http://localhost:5000/api/courier/history', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (historyRes.ok) {
                    const data = await historyRes.json();
                    setHistory(data);
                }
            } catch (err) {
                console.error(err);
            }
        };
        fetchData();
    }, []);

    // Mock graph data if empty
    const graphData = [
        { name: 'א', earnings: 400 },
        { name: 'ב', earnings: 300 },
        { name: 'ג', earnings: 550 },
        { name: 'ד', earnings: 200 },
        { name: 'ה', earnings: 450 },
        { name: 'ו', earnings: 150 },
        { name: 'ש', earnings: 0 },
    ];

    return (
        <div className="space-y-6" dir="rtl">
            <h1 className="text-2xl font-bold mb-4">דוחות ורווחים</h1>

            {/* Daily/Weekly Summary Cards */}
            <div className="grid grid-cols-2 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">רווח יומי</CardTitle>
                        <DollarSign className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₪{stats.today_earnings}</div>
                        <p className="text-xs text-muted-foreground flex items-center">
                            <ArrowUpRight className="w-3 h-3 mr-1 text-green-500" /> +20.1% מאתמול
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">משלוחים היום</CardTitle>
                        <Package className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.today_deliveries}</div>
                        <p className="text-xs text-muted-foreground flex items-center">
                            <ArrowDownRight className="w-3 h-3 mr-1 text-red-500" /> -4% מאתמול
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Weekly Earnings Chart */}
            <Card className="col-span-4">
                <CardHeader>
                    <CardTitle>הכנסות השבוע</CardTitle>
                </CardHeader>
                <CardContent className="pl-2">
                    <div className="h-[200px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={graphData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                                <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `₪${value}`} />
                                <Tooltip
                                    cursor={{ fill: 'transparent' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="earnings" fill="#16a34a" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* Delivery History List */}
            <Card>
                <CardHeader>
                    <CardTitle>היסטוריית משלוחים אחרונים</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {history.length > 0 ? (
                            history.map((order) => (
                                <div key={order.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium leading-none">הזמנה #{order.order_number}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {order.pickup_address} <span className="mx-1">←</span> {order.delivery_address}
                                        </p>
                                        <p className="text-[10px] text-slate-400">
                                            {format(new Date(order.date), "dd/MM/yyyy HH:mm")}
                                        </p>
                                    </div>
                                    <div className="font-bold text-green-600">
                                        +₪{order.price}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-4 text-slate-500">
                                <Calendar className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                <p>אין היסטוריית משלוחים עדיין</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
