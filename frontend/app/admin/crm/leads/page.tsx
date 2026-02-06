"use client";

import { useState, useEffect } from "react";
import { crmApi } from "@/lib/api/crm";
import { Lead } from "@/types/crm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Phone, Mail, Calendar, MoreHorizontal, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { AddLeadModal } from "@/components/admin/crm/AddLeadModal";

const STATUS_COLUMNS = [
    { id: 'new', label: 'חדש', color: 'bg-blue-100 text-blue-800' },
    { id: 'contacted', label: 'נוצר קשר', color: 'bg-yellow-100 text-yellow-800' },
    { id: 'meeting', label: 'פגישה', color: 'bg-purple-100 text-purple-800' },
    { id: 'proposal', label: 'הצעת מחיר', color: 'bg-orange-100 text-orange-800' },
    { id: 'negotiation', label: 'משא ומתן', color: 'bg-indigo-100 text-indigo-800' },
    { id: 'won', label: 'זכייה (לקוח)', color: 'bg-green-100 text-green-800' },
    { id: 'lost', label: 'הפסד', color: 'bg-red-100 text-red-800' }
];

export default function LeadsPage() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [pipelineStats, setPipelineStats] = useState<Record<string, { count: number; value: number }>>({});

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            setLoading(true);
            const [leadsData, statsData] = await Promise.all([
                crmApi.getLeads(),
                crmApi.getPipelineStats()
            ]);
            setLeads(leadsData);
            setPipelineStats(statsData);
        } catch (error) {
            toast.error("שגיאה בטעינת נתונים");
        } finally {
            setLoading(false);
        }
    }

    const getLeadsByStatus = (status: string) => {
        return leads.filter(lead => lead.status === status);
    };

    return (
        <div className="p-8 space-y-6 bg-slate-50 min-h-screen" dir="rtl">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">ניהול לידים</h1>
                    <p className="text-slate-500">מעקב אחר תהליך המכירה והפייפליין</p>
                </div>
                <AddLeadModal onSuccess={loadData} />
            </header>

            {/* Pipeline Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">סה"כ בשלבים פעילים</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{leads.filter(l => l.status !== 'won' && l.status !== 'lost').length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">שווי פייפליין משוער</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            ₪{Object.values(pipelineStats).reduce((acc, curr) => acc + curr.value, 0).toLocaleString()}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : (
                <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-250px)]">
                    {STATUS_COLUMNS.map(col => (
                        <div key={col.id} className="min-w-[280px] w-[280px] flex flex-col bg-slate-100 rounded-lg p-3 h-full">
                            <div className="flex justify-between items-center mb-3 px-1">
                                <h3 className="font-semibold text-slate-700">{col.label}</h3>
                                <Badge variant="secondary" className="bg-white">
                                    {getLeadsByStatus(col.id).length}
                                </Badge>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-3">
                                {getLeadsByStatus(col.id).map(lead => (
                                    <Card key={lead.id} className="cursor-pointer hover:shadow-md transition-shadow group">
                                        <CardContent className="p-4 space-y-3">
                                            <div className="flex justify-between items-start">
                                                <div className="font-medium text-sm truncate" title={`${lead.first_name} ${lead.last_name}`}>
                                                    {lead.first_name} {lead.last_name}
                                                </div>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </div>

                                            {lead.company_name && (
                                                <div className="text-xs text-muted-foreground bg-slate-50 p-1 rounded">
                                                    {lead.company_name}
                                                </div>
                                            )}

                                            <div className="flex justify-between items-center text-xs text-muted-foreground">
                                                <div className="flex gap-2">
                                                    <Phone className="h-3 w-3" />
                                                    <Mail className="h-3 w-3" />
                                                </div>
                                                <span>₪{lead.estimated_value.toLocaleString()}</span>
                                            </div>

                                            <div className="text-[10px] text-slate-400 text-left pt-1 border-t">
                                                {new Date(lead.created_at).toLocaleDateString()}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
