"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Phone, Mail, Building2, TrendingUp, CheckCircle, Calendar as CalendarIcon, Clock, LayoutGrid, MessageSquare } from "lucide-react";
import { api } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO } from "date-fns";
import { he } from "date-fns/locale";
import styles from "./crm-view.module.css";
import { cn } from "@/lib/utils";

interface LeadActivity {
    id: number;
    activity_type: string;
    description: string;
    created_at: string;
    performed_by: number;
}

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
    next_follow_up?: string;
    activities?: LeadActivity[];
}

const STATUS_COLUMNS = [
    { key: 'new', label: 'חדש', color: 'bg-indigo-500/20 text-indigo-300' },
    { key: 'contacted', label: 'יצרנו קשר', color: 'bg-purple-500/20 text-purple-300' },
    { key: 'negotiation', label: 'משא ומתן', color: 'bg-blue-500/20 text-blue-300' },
    { key: 'won', label: 'נסגר / לקוח', color: 'bg-emerald-500/20 text-emerald-400' },
    { key: 'lost', label: 'לא רלוונטי', color: 'bg-rose-500/20 text-rose-300' },
];

export default function CRMPage() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'kanban' | 'agenda'>('kanban');

    // Follow up state
    const [followUpDate, setFollowUpDate] = useState<Date | undefined>(undefined);
    const [followUpTime, setFollowUpTime] = useState<string>("12:00");
    const [activityType, setActivityType] = useState('call');
    const [activityDesc, setActivityDesc] = useState('');

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

    const fetchLeadDetails = async (id: number) => {
        try {
            const response = await api.get(`/crm/leads/${id}`);
            setSelectedLead(response.data);
            if (response.data.next_follow_up) {
                try {
                    const parsedStr = response.data.next_follow_up.replace(' ', 'T');
                    const d = new Date(parsedStr);
                    setFollowUpDate(d);
                    const hours = String(d.getHours()).padStart(2, '0');
                    const mins = String(d.getMinutes()).padStart(2, '0');
                    setFollowUpTime(`${hours}:${mins}`);
                } catch (err) {
                    console.error("Date parse error", err);
                }
            } else {
                setFollowUpDate(undefined);
                setFollowUpTime("12:00");
            }
        } catch (e) {
            console.error(e);
        }
    }

    useEffect(() => {
        fetchLeads();
    }, []);

    const groupedLeads = STATUS_COLUMNS.reduce((acc, col) => {
        acc[col.key] = leads.filter(l => l.status === col.key);
        return acc;
    }, {} as Record<string, Lead[]>);

    const agendaLeads = leads.filter(l => l.next_follow_up).sort((a, b) => new Date(a.next_follow_up!).getTime() - new Date(b.next_follow_up!).getTime());
    const groupedAgenda = agendaLeads.reduce((acc, lead) => {
        const dateStr = lead.next_follow_up!.split(' ')[0];
        if (!acc[dateStr]) acc[dateStr] = [];
        acc[dateStr].push(lead);
        return acc;
    }, {} as Record<string, Lead[]>);

    const handleStatusChange = async (leadId: number, newStatus: string) => {
        try {
            await api.put(`/crm/leads/${leadId}`, { status: newStatus });
            fetchLeads();
            fetchLeadDetails(leadId);
        } catch (error) {
            console.error("Failed to update status", error);
        }
    };

    const handleConvert = async (leadId: number) => {
        try {
            await api.post(`/crm/leads/${leadId}/convert`);
            setIsModalOpen(false);
            fetchLeads();
        } catch (error) {
            console.error("Failed to convert lead", error);
        }
    };

    const handleAddActivity = async (leadId: number) => {
        if (!activityDesc) return;
        try {
            await api.post(`/crm/leads/${leadId}/activity`, {
                activity_type: activityType,
                description: activityDesc
            });
            setActivityDesc('');

            if (followUpDate) {
                const timeStr = followUpTime || "00:00";
                const combinedDateStr = `${format(followUpDate, "yyyy-MM-dd")} ${timeStr}`;
                await api.put(`/crm/leads/${leadId}`, {
                    next_follow_up: combinedDateStr
                });
            }

            fetchLeadDetails(leadId);
            fetchLeads();
        } catch (e) {
            console.error("Failed to log activity", e);
        }
    };

    const handleCreateLead = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const newLead = {
            company_name: formData.get('company_name'),
            contact_name: formData.get('contact_name'),
            phone: formData.get('phone'),
            email: formData.get('email'),
            source: formData.get('source'),
            estimated_monthly_value: Number(formData.get('estimated_monthly_value')),
            notes: formData.get('notes'),
        };
        try {
            await api.post('/crm/leads', newLead);
            setIsNewLeadModalOpen(false);
            fetchLeads();
        } catch (error) {
            console.error("Failed to create lead", error);
        }
    };

    const handleGoogleSync = async () => {
        try {
            const res = await api.get('/auth/google/sync');
            if (res.data.auth_url) {
                window.location.href = res.data.auth_url;
            }
        } catch (error) {
            console.error("Failed to initiate Google Sync", error);
        }
    };

    if (isLoading) {
        return <div className="h-screen w-full flex items-center justify-center bg-[#020617]"><LoadingSpinner size="lg" text="טוען לידים..." /></div>;
    }

    return (
        <div className={styles.pageWrapper} dir="rtl">
            <header className={styles.headerGlass}>
                <div>
                    <h1 className={styles.headerTitle}>CRM & מכירות</h1>
                    <p className={styles.headerSubtitle}>ניהול לידים ויצירת קשר עם לקוחות פוטנציאלים</p>
                </div>
                <div className="flex items-center gap-4">
                    <Button
                        onClick={handleGoogleSync}
                        variant="outline"
                        className="gap-2 border-slate-700 hover:bg-slate-800 text-slate-300 h-10 rounded-xl"
                    >
                        <CalendarIcon className="w-4 h-4 text-blue-400" />
                        סנכרון יומן גוגל
                    </Button>
                    <div className={styles.viewToggle}>
                        <button
                            className={styles.toggleBtn}
                            data-active={viewMode === 'kanban'}
                            onClick={() => setViewMode('kanban')}
                        >
                            <LayoutGrid className="w-4 h-4 inline-block mr-1" /> לוח תצוגה
                        </button>
                        <button
                            className={styles.toggleBtn}
                            data-active={viewMode === 'agenda'}
                            onClick={() => setViewMode('agenda')}
                        >
                            <CalendarIcon className="w-4 h-4 inline-block mr-1" /> יומן שיחות
                        </button>
                    </div>
                    <Button onClick={() => setIsNewLeadModalOpen(true)} className="gap-2 bg-brand text-white hover:bg-blue-600 rounded-xl px-5 h-10 shadow-lg shadow-brand/20">
                        <Plus className="w-4 h-4" /> ליד חדש
                    </Button>
                </div>
            </header>

            {viewMode === 'kanban' ? (
                <div className={styles.kanbanBoard}>
                    {STATUS_COLUMNS.map(column => (
                        <div key={column.key} className={styles.kanbanColumn}>
                            <div className={styles.columnHeader}>
                                <h3 className={styles.columnTitle}>{column.label}</h3>
                                <div className={styles.columnBadge}>
                                    {groupedLeads[column.key]?.length || 0}
                                </div>
                            </div>
                            <div className={styles.cardList}>
                                {groupedLeads[column.key]?.map(lead => (
                                    <div
                                        key={lead.id}
                                        className={styles.leadCard}
                                        onClick={() => { fetchLeadDetails(lead.id); setIsModalOpen(true); }}
                                    >
                                        <div className={styles.leadCardTitle}>{lead.company_name || lead.contact_name}</div>
                                        <div className={styles.leadCardSubtitle}>{lead.contact_name}</div>

                                        {lead.next_follow_up && (
                                            <div className="flex items-center gap-1.5 text-xs text-blue-400 mt-2 font-medium bg-blue-400/10 w-fit px-2 py-1 rounded border border-blue-400/20">
                                                <Clock className="w-3 h-3" />
                                                לפולו-אפ: {format(parseISO(lead.next_follow_up), "dd/MM/yy")}
                                            </div>
                                        )}

                                        <div className={styles.leadCardMeta}>
                                            <TrendingUp className="w-3.5 h-3.5" />
                                            ₪{lead.estimated_monthly_value.toLocaleString()} / חודש
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className={styles.agendaContainer}>
                    {Object.keys(groupedAgenda).length === 0 ? (
                        <div className="text-center text-slate-500 py-10">אין שיחות או פגישות מתוזמנות.</div>
                    ) : (
                        Object.entries(groupedAgenda).map(([date, dayLeads]) => (
                            <div key={date} className={styles.agendaDay}>
                                <div className={styles.agendaDateHeader}>
                                    {format(parseISO(date), "EEEE, d בMMMM yyyy", { locale: he })}
                                </div>
                                <div className={styles.agendaGrid}>
                                    {dayLeads.map(lead => (
                                        <div
                                            key={lead.id}
                                            className={styles.leadCard}
                                            onClick={() => { fetchLeadDetails(lead.id); setIsModalOpen(true); }}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className={styles.leadCardTitle}>{lead.company_name || lead.contact_name}</div>
                                                    <div className={styles.leadCardSubtitle}>{lead.phone} • {lead.contact_name}</div>
                                                </div>
                                                <div className="text-xs bg-brand/20 text-brand px-2 py-1 rounded-md border border-brand/20">
                                                    {format(parseISO(lead.next_follow_up!), "HH:mm")}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Lead Details Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-2xl bg-[#0f172a] border border-white/10 text-slate-100" dir="rtl">
                    {selectedLead && (
                        <>
                            <DialogHeader className="border-b border-white/5 pb-4">
                                <DialogTitle className="text-right text-xl font-bold flex items-center justify-between">
                                    {selectedLead.company_name || selectedLead.contact_name}
                                    <Select
                                        value={selectedLead.status}
                                        onValueChange={(val) => handleStatusChange(selectedLead.id, val)}
                                    >
                                        <SelectTrigger className="w-40 bg-black/30 border-white/10 h-8 text-xs font-semibold text-white">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-900 border-white/10 text-white">
                                            {STATUS_COLUMNS.map(col => (
                                                <SelectItem key={col.key} value={col.key}>{col.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </DialogTitle>
                            </DialogHeader>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4">
                                {/* Lead Info */}
                                <div className="space-y-4 text-right border-l border-white/5 pl-6">
                                    <div className="flex flex-col gap-1">
                                        <Label className="text-slate-400 text-xs shadow-none">איש קשר</Label>
                                        <p className="font-semibold">{selectedLead.contact_name}</p>
                                    </div>
                                    <div className="flex items-center gap-3 bg-black/20 p-2.5 rounded-lg border border-white/5">
                                        <div className="w-8 h-8 rounded-full bg-brand/20 flex items-center justify-center">
                                            <Phone className="w-4 h-4 text-brand" />
                                        </div>
                                        <span className="text-sm font-medium" dir="ltr">{selectedLead.phone}</span>
                                    </div>

                                    {selectedLead.email && (
                                        <div className="flex items-center gap-3 bg-black/20 p-2.5 rounded-lg border border-white/5">
                                            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                                                <Mail className="w-4 h-4 text-blue-500" />
                                            </div>
                                            <span className="text-sm font-medium">{selectedLead.email}</span>
                                        </div>
                                    )}

                                    {selectedLead.notes && (
                                        <div className="mt-4 bg-white/5 p-3 rounded-lg border border-white/5">
                                            <Label className="text-slate-400 text-xs shadow-none">הערות בסיסיות</Label>
                                            <p className="text-sm text-slate-300 mt-1 whitespace-pre-wrap">{selectedLead.notes}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Activity & Calendar */}
                                <div className="space-y-5 text-right flex flex-col h-full">
                                    {/* Action Logger */}
                                    <div className="bg-black/30 p-4 rounded-xl border border-white/10 flex-col gap-3">
                                        <Label className="text-slate-300 font-bold mb-2 flex items-center gap-2"><MessageSquare className="w-4 h-4" /> תיעוד ופעולות המשך</Label>

                                        <div className="flex gap-2 mt-3">
                                            <Select value={activityType} onValueChange={setActivityType}>
                                                <SelectTrigger className="w-[110px] bg-black/50 border-white/10 h-9 font-medium text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="bg-slate-900 border-white/10 text-white font-medium text-xs">
                                                    <SelectItem value="call">☎️ שיחה</SelectItem>
                                                    <SelectItem value="meeting">🤝 מפגש</SelectItem>
                                                    <SelectItem value="note">📝 הערה</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <Input
                                                className="h-9 text-xs bg-black/50 border-white/10 text-white flex-1"
                                                placeholder="תיאור השיחה..."
                                                value={activityDesc}
                                                onChange={e => setActivityDesc(e.target.value)}
                                            />
                                        </div>

                                        <div className="mt-4">
                                            <Label className="text-slate-400 text-xs mb-1.5 flex items-center gap-1.5"><CalendarIcon className="w-3.5 h-3.5" /> תזמון יומן ושעה (אופציונלי)</Label>
                                            <div className="flex gap-2 mb-2 items-center text-slate-300">
                                                <Label className="text-xs">שעה:</Label>
                                                <Input
                                                    type="time"
                                                    value={followUpTime}
                                                    onChange={e => setFollowUpTime(e.target.value)}
                                                    className="h-8 bg-black/40 border-white/10 text-white flex-1 text-center"
                                                    dir="ltr"
                                                />
                                            </div>
                                            <div dir="ltr" className="w-full flex justify-center bg-black/20 rounded-md border border-white/10 mt-2 p-1">
                                                <Calendar
                                                    mode="single"
                                                    selected={followUpDate}
                                                    onSelect={setFollowUpDate}
                                                    className="pointer-events-auto"
                                                />
                                            </div>
                                        </div>

                                        <Button
                                            className="w-full mt-4 bg-brand text-white text-xs font-bold shadow-lg shadow-brand/20 active:scale-95 transition-transform"
                                            onClick={() => handleAddActivity(selectedLead.id)}
                                            disabled={!activityDesc}
                                        >
                                            תעד ושמור שינויים ביומן
                                        </Button>
                                    </div>

                                </div>
                            </div>

                            {/* Activity History Log */}
                            {selectedLead.activities && selectedLead.activities.length > 0 && (
                                <div className="mt-2 pt-4 border-t border-white/5 space-y-3">
                                    <Label className="text-slate-400 text-xs">היסטוריית פעולות</Label>
                                    <div className="max-h-32 overflow-y-auto space-y-2 custom-scrollbar pr-2">
                                        {selectedLead.activities.map(act => (
                                            <div key={act.id} className="text-xs bg-black/20 border border-white/5 p-2 rounded-md flex justify-between items-start">
                                                <span className="text-slate-300">{act.description}</span>
                                                <span className="text-slate-500 flex-shrink-0 text-[10px] bg-black/40 px-1.5 rounded">{act.created_at.split(' ')[0]} {act.activity_type === 'call' ? '☎️' : act.activity_type === 'meeting' ? '🤝' : '📝'}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <DialogFooter className="border-t border-white/5 pt-4 flex gap-3 sm:justify-between items-center w-full">
                                {selectedLead.status !== 'won' && selectedLead.status !== 'lost' ? (
                                    <Button onClick={() => handleConvert(selectedLead.id)} className="bg-emerald-600 hover:bg-emerald-500 text-white">
                                        <CheckCircle className="w-4 h-4 mr-2" /> המר ללקוח רשום במערכת
                                    </Button>
                                ) : (
                                    <div />
                                )}
                                <Button variant="outline" onClick={() => setIsModalOpen(false)} className="bg-transparent border-white/10 text-white hover:bg-white/10">סגור</Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* New Lead Modal */}
            <Dialog open={isNewLeadModalOpen} onOpenChange={setIsNewLeadModalOpen}>
                <DialogContent className="sm:max-w-md bg-[#0f172a] border border-white/10 text-slate-100" dir="rtl">
                    <DialogHeader>
                        <DialogTitle className="text-right">הוספת ליד פוטנציאלי</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateLead} className="space-y-4">
                        <div>
                            <Label htmlFor="contact_name" className="text-slate-300">שם מלא (חובה)</Label>
                            <Input id="contact_name" name="contact_name" required className="bg-black/30 border-white/10 focus-visible:ring-brand text-white" />
                        </div>
                        <div>
                            <Label htmlFor="phone" className="text-slate-300">טלפון (חובה)</Label>
                            <Input id="phone" name="phone" type="tel" required className="bg-black/30 border-white/10 focus-visible:ring-brand text-white" dir="ltr" />
                        </div>
                        <div>
                            <Label htmlFor="company_name" className="text-slate-400">שם חברה (אופציונלי)</Label>
                            <Input id="company_name" name="company_name" className="bg-black/30 border-white/10 focus-visible:ring-brand text-white placeholder-slate-600" placeholder="יושלם אוטומטית לשם אם ריק..." />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="email" className="text-slate-300">אימייל</Label>
                                <Input id="email" name="email" type="email" className="bg-black/30 border-white/10 focus-visible:ring-brand text-white" />
                            </div>
                            <div>
                                <Label htmlFor="source" className="text-slate-300">מקור הגעה</Label>
                                <Select name="source" defaultValue="other">
                                    <SelectTrigger className="bg-black/30 border-white/10 focus-visible:ring-brand text-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-white/10 text-white">
                                        <SelectItem value="website">אתר</SelectItem>
                                        <SelectItem value="facebook">פייסבוק / אינסטגרם</SelectItem>
                                        <SelectItem value="referral">הפניה</SelectItem>
                                        <SelectItem value="cold_call">שיחה קרה</SelectItem>
                                        <SelectItem value="other">אחר</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="estimated_monthly_value" className="text-slate-300">צפי הכנסה (₪ בחודש)</Label>
                            <Input id="estimated_monthly_value" name="estimated_monthly_value" type="number" defaultValue={0} className="bg-black/30 border-white/10 focus-visible:ring-brand text-white" />
                        </div>
                        <div>
                            <Label htmlFor="notes" className="text-slate-300">הערות כלליות</Label>
                            <Textarea id="notes" name="notes" className="bg-black/30 border-white/10 focus-visible:ring-brand text-white resize-none" />
                        </div>
                        <DialogFooter className="pt-2 border-t border-white/5">
                            <Button type="button" variant="outline" onClick={() => setIsNewLeadModalOpen(false)} className="bg-transparent border-white/10 text-white hover:bg-white/10">ביטול</Button>
                            <Button type="submit" className="bg-brand text-white hover:bg-blue-600">צור ליד</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
