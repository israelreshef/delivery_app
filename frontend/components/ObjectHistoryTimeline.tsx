"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Clock, User, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface HistoryEntry {
    id: number;
    action: 'INSERT' | 'UPDATE' | 'DELETE';
    changed_by: number | null;
    changes: Record<string, { old?: string; new?: string }>;
    ip_address: string | null;
    timestamp: string;
}

interface ObjectHistoryTimelineProps {
    tableName: string;
    recordId: string | number;
    title?: string;
}

const actionLabels: Record<string, { label: string; color: string }> = {
    INSERT: { label: "נוצר", color: "bg-green-100 text-green-800" },
    UPDATE: { label: "עודכן", color: "bg-blue-100 text-blue-800" },
    DELETE: { label: "נמחק", color: "bg-red-100 text-red-800" },
};

export function ObjectHistoryTimeline({ tableName, recordId, title }: ObjectHistoryTimelineProps) {
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);

    useEffect(() => {
        const fetchHistory = async () => {
            setLoading(true);
            try {
                const res = await api.get(`/archive/${tableName}/${recordId}`);
                setHistory(res.data.history || []);
                setTotal(res.data.total || 0);
            } catch (error) {
                console.error("Error fetching object history:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, [tableName, recordId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <Card className="border shadow-sm">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5 text-brand" />
                    {title || "היסטוריית שינויים"}
                    <Badge variant="secondary" className="mr-auto">{total} רשומות</Badge>
                </CardTitle>
            </CardHeader>
            <CardContent>
                {history.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-4">
                        אין היסטוריה זמינה עבור אובייקט זה
                    </p>
                ) : (
                    <div className="relative border-r-2 border-slate-200 mr-4 space-y-6 py-2">
                        {history.map((entry) => {
                            const actionInfo = actionLabels[entry.action] || actionLabels.UPDATE;
                            const changedFields = Object.entries(entry.changes);

                            return (
                                <div key={entry.id} className="relative pr-8">
                                    {/* Dot on the timeline */}
                                    <div className={cn(
                                        "absolute -right-[9px] top-1 w-4 h-4 rounded-full border-2 border-white shadow",
                                        entry.action === 'INSERT' ? 'bg-green-500' :
                                            entry.action === 'DELETE' ? 'bg-red-500' : 'bg-blue-500'
                                    )} />

                                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <Badge className={actionInfo.color}>{actionInfo.label}</Badge>
                                                {entry.changed_by && (
                                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                        <User className="w-3 h-3" />
                                                        משתמש #{entry.changed_by}
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-xs text-muted-foreground">
                                                {new Date(entry.timestamp).toLocaleString('he-IL')}
                                            </span>
                                        </div>

                                        {changedFields.length > 0 && (
                                            <div className="space-y-1 mt-2">
                                                {changedFields.slice(0, 8).map(([field, vals]) => (
                                                    <div key={field} className="flex items-center text-xs gap-2 text-slate-600">
                                                        <code className="bg-slate-200 px-1 rounded text-[11px]">{field}</code>
                                                        {vals.old !== undefined && (
                                                            <>
                                                                <span className="line-through text-red-400 max-w-[100px] truncate">
                                                                    {String(vals.old || '—')}
                                                                </span>
                                                                <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                                                            </>
                                                        )}
                                                        {vals.new !== undefined && (
                                                            <span className="text-green-700 max-w-[150px] truncate font-medium">
                                                                {String(vals.new || '—')}
                                                            </span>
                                                        )}
                                                    </div>
                                                ))}
                                                {changedFields.length > 8 && (
                                                    <p className="text-[11px] text-muted-foreground">
                                                        +{changedFields.length - 8} שדות נוספים...
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
