"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';
import { DollarSign, TrendingDown, Activity, Server, Zap, RefreshCw } from "lucide-react";

interface ExpensesSummary {
    today: { cost: number; calls: number };
    month: { cost: number; calls: number; effective_cost: number };
    google_credit: { used: number; total: number; remaining: number; percent_used: number };
    services: ServiceData[];
    chart: { date: string; cost: number; calls: number }[];
}

interface ServiceData {
    name: string;
    icon: string;
    category: string;
    total_calls: number;
    total_cost: number;
    cost_per_call: number;
    monthly_free_credit: number;
    monthly_fixed: number;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function ExpensesDashboard() {
    const [data, setData] = useState<ExpensesSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        try {
            const res = await api.get('/expenses/summary');
            setData(res.data);
        } catch (err) {
            console.error("Failed to fetch expenses", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
        // Auto-refresh every 30 seconds for live data
        const interval = setInterval(() => fetchData(), 30000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <Card className="border-none shadow-md col-span-full">
                <CardContent className="flex items-center justify-center py-12">
                    <div className="animate-pulse flex items-center gap-3 text-slate-400">
                        <Activity className="w-5 h-5 animate-spin" />
                        <span>טוען נתוני הוצאות...</span>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!data) return null;

    const apiServices = data.services.filter(s => s.category === 'api');
    const infraServices = data.services.filter(s => s.category === 'infrastructure');

    // Pie chart data - only services with actual costs
    const pieData = data.services
        .filter(s => s.total_cost > 0 || s.monthly_fixed > 0)
        .map(s => ({
            name: s.name,
            value: s.total_cost + (s.monthly_fixed || 0)
        }));

    // If no expenses yet, show a minimal empty state pie
    if (pieData.length === 0) {
        pieData.push({ name: 'חינמי', value: 1 });
    }

    const creditPercent = data.google_credit.percent_used;
    const creditColor = creditPercent > 80 ? 'text-red-500' : creditPercent > 50 ? 'text-amber-500' : 'text-green-500';

    return (
        <Card className="border-none shadow-md col-span-full overflow-hidden">
            <CardHeader className="pb-3 bg-gradient-to-l from-slate-900 via-slate-800 to-slate-900 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-xl flex items-center gap-2">
                            <div className="p-1.5 bg-white/10 rounded-lg">
                                <DollarSign className="w-5 h-5 text-emerald-400" />
                            </div>
                            מוניטור הוצאות — לייב
                        </CardTitle>
                        <CardDescription className="text-slate-400 mt-1">
                            עלויות שירותים וAPI בזמן אמת
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => fetchData(true)}
                            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                            title="רענן נתונים"
                        >
                            <RefreshCw className={`w-4 h-4 text-slate-400 ${refreshing ? 'animate-spin' : ''}`} />
                        </button>
                        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 animate-pulse">
                            Live
                        </Badge>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-0">
                {/* Top Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-slate-100 rtl:divide-x-reverse border-b border-slate-100">
                    <div className="p-4 md:p-5 text-center">
                        <div className="text-xs text-slate-500 mb-1">עלות היום</div>
                        <div className="text-2xl font-bold text-slate-900">
                            ${data.today.cost.toFixed(4)}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">{data.today.calls} קריאות</div>
                    </div>
                    <div className="p-4 md:p-5 text-center">
                        <div className="text-xs text-slate-500 mb-1">עלות החודש</div>
                        <div className="text-2xl font-bold text-slate-900">
                            ${data.month.cost.toFixed(2)}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">{data.month.calls} קריאות</div>
                    </div>
                    <div className="p-4 md:p-5 text-center">
                        <div className="text-xs text-slate-500 mb-1">עלות בפועל</div>
                        <div className="text-2xl font-bold text-emerald-600">
                            ${data.month.effective_cost.toFixed(2)}
                        </div>
                        <div className="text-xs text-emerald-500 mt-1 flex items-center justify-center gap-1">
                            <TrendingDown className="w-3 h-3" /> אחרי קרדיט גוגל
                        </div>
                    </div>
                    <div className="p-4 md:p-5 text-center">
                        <div className="text-xs text-slate-500 mb-1">קרדיט Google נותר</div>
                        <div className={`text-2xl font-bold ${creditColor}`}>
                            ${data.google_credit.remaining.toFixed(2)}
                        </div>
                        <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5">
                            <div
                                className={`h-1.5 rounded-full transition-all duration-500 ${creditPercent > 80 ? 'bg-red-500' : creditPercent > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                                    }`}
                                style={{ width: `${Math.min(100, creditPercent)}%` }}
                            />
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">
                            {creditPercent.toFixed(1)}% מתוך $200
                        </div>
                    </div>
                </div>

                {/* Main Content: Chart + Services */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-0 divide-x divide-slate-100 rtl:divide-x-reverse">
                    {/* Daily Cost Chart */}
                    <div className="col-span-3 p-5">
                        <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                            <Activity className="w-4 h-4 text-brand" />
                            עלויות יומיות (14 ימים אחרונים)
                        </h3>
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={data.chart}>
                                <XAxis
                                    dataKey="date"
                                    stroke="#94a3b8"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="#94a3b8"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(v) => `$${v}`}
                                />
                                <Tooltip
                                    contentStyle={{
                                        borderRadius: '10px',
                                        border: 'none',
                                        boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                                        fontSize: '12px',
                                        direction: 'rtl'
                                    }}
                                    formatter={((value: any, name: any) => [
                                        `$${Number(value || 0).toFixed(4)}`,
                                        name === 'cost' ? 'עלות' : 'קריאות'
                                    ]) as any}
                                    labelStyle={{ fontWeight: 'bold' }}
                                />
                                <Bar dataKey="cost" fill="#3b82f6" radius={[4, 4, 0, 0]} name="cost" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Services Breakdown */}
                    <div className="col-span-2 p-5 bg-slate-50/50">
                        <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                            <Server className="w-4 h-4 text-brand" />
                            פירוט שירותים
                        </h3>

                        {/* API Services */}
                        <div className="space-y-2 mb-4">
                            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">שירותי API</div>
                            {apiServices.map((svc, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-white rounded-lg p-2.5 shadow-sm border border-slate-100">
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg">{svc.icon}</span>
                                        <div>
                                            <div className="text-xs font-medium text-slate-700">{svc.name}</div>
                                            <div className="text-[10px] text-slate-400">
                                                {svc.total_calls.toLocaleString()} קריאות
                                                {svc.cost_per_call > 0 && ` • $${svc.cost_per_call}/קריאה`}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-left">
                                        <div className={`text-sm font-bold ${svc.total_cost > 0 ? 'text-slate-900' : 'text-emerald-600'}`}>
                                            {svc.total_cost > 0 ? `$${svc.total_cost.toFixed(2)}` : 'חינם'}
                                        </div>
                                        {svc.monthly_free_credit > 0 && (
                                            <div className="text-[10px] text-emerald-500">קרדיט ${svc.monthly_free_credit}</div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Infrastructure Services */}
                        <div className="space-y-2">
                            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">תשתיות</div>
                            {infraServices.map((svc, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-white rounded-lg p-2.5 shadow-sm border border-slate-100">
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg">{svc.icon}</span>
                                        <div>
                                            <div className="text-xs font-medium text-slate-700">{svc.name}</div>
                                            <div className="text-[10px] text-slate-400">עלות חודשית קבועה</div>
                                        </div>
                                    </div>
                                    <div className={`text-sm font-bold ${svc.monthly_fixed > 0 ? 'text-slate-900' : 'text-emerald-600'}`}>
                                        {svc.monthly_fixed > 0 ? `$${svc.monthly_fixed.toFixed(2)}/חודש` : 'חינם'}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Bottom Note */}
                        <div className="mt-4 p-2.5 bg-blue-50 border border-blue-100 rounded-lg">
                            <div className="flex items-start gap-2">
                                <Zap className="w-3.5 h-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
                                <div className="text-[11px] text-blue-700 leading-relaxed">
                                    שירותי הוסטינג יתעדכנו אוטומטית כשתעלה לפרודקשן.
                                    כרגע הכל רץ מקומית — $0.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
