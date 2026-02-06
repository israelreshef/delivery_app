"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Phone, Mail, Building2, TrendingUp, CheckCircle, XCircle } from "lucide-react";
import { api } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Lead {
    id: number;
    contact_name: string;
    company_name: string;
    email: string;
    phone: string;
    status: 'new' | 'contacted' | 'meeting' | 'proposal' | 'negotiation' | 'won' | 'lost';
    source: string;
    estimated_monthly_value: number;
    notes?: string;
}

const STATUS_COLUMNS = [
    { key: 'new', label: 'חדש', color: 'bg-blue-100 text-blue-700' },
    { key: 'contacted', label: 'יצרנו קשר', color: 'bg-purple-100 text-purple-700' },
    { key: 'negotiation', label: 'משא ומתן', color: 'bg-yellow-100 text-yellow-700' },
    { key: 'won', label: '✅ נסגר', color: 'bg-green-100 text-green-700' },
    { key: 'lost', label: '❌ אבוד', color: 'bg-red-100 text-red-700' },
];

import LoadingSpinner from "@/components/ui/loading-spinner";

export default function CRMPage() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const fetchLeads = async () => {
        setIsLoading(true);
        try {
            const response = await api.get('/crm/leads');
            setLeads(response.data);
        } catch (error) {
            console.error("Failed to fetch leads", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchLeads();
    }, []);

    // ... (groupedLeads and handlers remain the same)

    const groupedLeads = STATUS_COLUMNS.reduce((acc, col) => {
        acc[col.key] = leads.filter(l => l.status === col.key);
        return acc;
    }, {} as Record<string, Lead[]>);

    const handleStatusChange = async (leadId: number, newStatus: string) => {
        try {
            await api.put(`/crm/leads/${leadId}`, { status: newStatus });
            fetchLeads();
        } catch (error) {
            console.error("Failed to update status", error);
        }
    };

    // ... (rest of handlers)

    if (isLoading) {
        return <div className="h-screen flex items-center justify-center"><LoadingSpinner size="lg" text="טוען לידים..." /></div>;
    }

    return (
        <div className="p-4 md:p-8 space-y-6 bg-slate-50 min-h-screen" dir="rtl">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-slate-900">CRM & מכירות</h1>
                    <p className="text-slate-500 mt-2">ניהול לידים והמרה ללקוחות</p>
                </div>
                <Button onClick={() => setIsNewLeadModalOpen(true)} className="gap-2 w-full md:w-auto">
                    <Plus className="w-4 h-4" /> ליד חדש
                </Button>
            </header>

            {/* Kanban Board - Scrollable on mobile */}
            <div className="flex gap-4 overflow-x-auto pb-6 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-5 md:overflow-visible custom-scrollbar">
                {STATUS_COLUMNS.map(column => (
                    <div key={column.key} className="space-y-3 min-w-[280px] md:min-w-0">
                        <div className="flex items-center justify-between bg-white p-3 rounded-lg shadow-sm border-t-4 border-blue-500 sticky top-0 z-10">
                            <h3 className="font-bold text-sm">{column.label}</h3>
                            <Badge variant="outline" className={column.color}>
                                {groupedLeads[column.key]?.length || 0}
                            </Badge>
                        </div>
                        <div className="space-y-2">
                            {groupedLeads[column.key]?.map(lead => (
                                <Card
                                    key={lead.id}
                                    className="cursor-pointer hover:shadow-lg transition-shadow border-r-4 border-blue-400 active:scale-95 transition-transform"
                                    onClick={() => { setSelectedLead(lead); setIsModalOpen(true); }}
                                >
                                    <CardContent className="p-4 space-y-2">
                                        <div className="font-bold text-sm">{lead.company_name}</div>
                                        <div className="text-xs text-muted-foreground">{lead.contact_name}</div>
                                        <div className="flex items-center gap-2 text-xs text-green-600 font-semibold">
                                            <TrendingUp className="w-3 h-3" />
                                            ₪{lead.estimated_monthly_value.toLocaleString()}/חודש
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Lead Details Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-md" dir="rtl">
                    {selectedLead && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="text-right">{selectedLead.company_name}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 text-right">
                                <div>
                                    <Label>איש קשר</Label>
                                    <p className="font-semibold">{selectedLead.contact_name}</p>
                                </div>
                                <div className="flex gap-2">
                                    <Phone className="w-4 h-4 text-blue-600" />
                                    <span className="text-sm">{selectedLead.phone}</span>
                                </div>
                                <div className="flex gap-2">
                                    <Mail className="w-4 h-4 text-blue-600" />
                                    <span className="text-sm">{selectedLead.email}</span>
                                </div>
                                <div>
                                    <Label>סטטוס</Label>
                                    <Select
                                        value={selectedLead.status}
                                        onValueChange={(val) => handleStatusChange(selectedLead.id, val)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {STATUS_COLUMNS.map(col => (
                                                <SelectItem key={col.key} value={col.key}>{col.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                {selectedLead.notes && (
                                    <div>
                                        <Label>הערות</Label>
                                        <p className="text-sm text-muted-foreground">{selectedLead.notes}</p>
                                    </div>
                                )}
                            </div>
                            <DialogFooter className="gap-2">
                                <Button variant="outline" onClick={() => setIsModalOpen(false)}>סגור</Button>
                                {selectedLead.status !== 'won' && (
                                    <Button onClick={() => handleConvert(selectedLead.id)} className="bg-green-600 hover:bg-green-700">
                                        <CheckCircle className="w-4 h-4 mr-2" /> המר ללקוח
                                    </Button>
                                )}
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* New Lead Modal */}
            <Dialog open={isNewLeadModalOpen} onOpenChange={setIsNewLeadModalOpen}>
                <DialogContent className="sm:max-w-md" dir="rtl">
                    <DialogHeader>
                        <DialogTitle className="text-right">ליד חדש</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateLead} className="space-y-4">
                        <div>
                            <Label htmlFor="company_name">שם חברה</Label>
                            <Input id="company_name" name="company_name" required />
                        </div>
                        <div>
                            <Label htmlFor="contact_name">איש קשר</Label>
                            <Input id="contact_name" name="contact_name" required />
                        </div>
                        <div>
                            <Label htmlFor="phone">טלפון</Label>
                            <Input id="phone" name="phone" type="tel" required />
                        </div>
                        <div>
                            <Label htmlFor="email">אימייל</Label>
                            <Input id="email" name="email" type="email" />
                        </div>
                        <div>
                            <Label htmlFor="source">מקור</Label>
                            <Select name="source" defaultValue="other">
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="website">אתר</SelectItem>
                                    <SelectItem value="facebook">פייסבוק</SelectItem>
                                    <SelectItem value="referral">הפניה</SelectItem>
                                    <SelectItem value="cold_call">שיחה קרה</SelectItem>
                                    <SelectItem value="other">אחר</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="estimated_monthly_value">הכנסה חודשית משוערת (₪)</Label>
                            <Input id="estimated_monthly_value" name="estimated_monthly_value" type="number" defaultValue={0} />
                        </div>
                        <div>
                            <Label htmlFor="notes">הערות</Label>
                            <Textarea id="notes" name="notes" />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsNewLeadModalOpen(false)}>ביטול</Button>
                            <Button type="submit">צור ליד</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
