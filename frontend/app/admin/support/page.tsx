"use client";

import { useEffect, useState } from "react";
import { LifeBuoy, Search, Filter, Loader2, Plus } from "lucide-react";
import Link from "next/link";
import { supportApi } from "@/lib/api/support";
import { SupportTicket, TicketStatus, TicketPriority } from "@/types/support";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import styles from './support.module.css';

const ticketSchema = z.object({
    subject: z.string().min(3, "נושא קצר מדי"),
    message: z.string().min(10, "הודעה קצרה מדי"),
    priority: z.enum(["low", "medium", "high", "urgent"] as const),
});

export default function SupportPage() {
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    const form = useForm<z.infer<typeof ticketSchema>>({
        resolver: zodResolver(ticketSchema),
        defaultValues: {
            subject: "",
            message: "",
            priority: "medium",
        },
    });

    const fetchTickets = async () => {
        setLoading(true);
        try {
            const data = await supportApi.getTickets({
                status: statusFilter === "all" ? undefined : statusFilter,
            });
            setTickets(data);
        } catch (error) {
            console.error("Failed to fetch tickets", error);
            toast.error("שגיאה בטעינת הקריאות");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTickets();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statusFilter]);

    async function onCreateTicket(values: z.infer<typeof ticketSchema>) {
        try {
            await supportApi.createTicket(values);
            toast.success("הקריאה נפתחה בהצלחה");
            setIsCreateOpen(false);
            form.reset();
            fetchTickets();
        } catch (error) {
            toast.error("שגיאה ביצירת הקריאה");
        }
    }

    const filteredTickets = tickets.filter(ticket =>
        ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.id.toString().includes(searchQuery) ||
        ticket.user_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getStatusBadge = (status: TicketStatus) => {
        const statusClassMap: Record<TicketStatus, string> = {
            open: styles.badgeOpen,
            in_progress: styles.badgeInProgress,
            waiting_for_customer: styles.badgeWaiting,
            resolved: styles.badgeResolved,
            closed: styles.badgeClosed,
        };

        const labels: Record<TicketStatus, string> = {
            open: "פתוח",
            in_progress: "בטיפול",
            waiting_for_customer: "ממתין ללקוח",
            resolved: "נפתר",
            closed: "סגור",
        };

        return <span className={`${styles.badge} ${statusClassMap[status]}`}>{labels[status]}</span>;
    };

    const getPriorityBadge = (priority: TicketPriority) => {
        const priorityClassMap: Record<TicketPriority, string> = {
            low: styles.priLow,
            medium: styles.priMed,
            high: styles.priHigh,
            urgent: styles.priUrg,
        };
        const labels: Record<TicketPriority, string> = {
            low: "נמוכה",
            medium: "רגילה",
            high: "גבוהה",
            urgent: "דחופה"
        };
        return <span className={`${styles.badge} ${priorityClassMap[priority]}`}>{labels[priority]}</span>;
    };

    return (
        <div className={styles.supportContainer}>
            <div className={styles.headerArea}>
                <div className={styles.titleWrapper}>
                    <LifeBuoy className="h-8 w-8 text-brand" style={{ color: '#3B82F6' }} />
                    <div>
                        <h1 className={styles.title}>מרכז תמיכה</h1>
                        <p className={styles.subtitle}>ניהול פניות שירות ותקלות</p>
                    </div>
                </div>

                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <button className={styles.btnPrimary}>
                            <Plus className="h-4 w-4" />
                            קריאה חדשה
                        </button>
                    </DialogTrigger>
                    <DialogContent style={{ backgroundColor: '#0F172A', color: '#F8FAFC', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <DialogHeader>
                            <DialogTitle style={{ color: '#fff' }}>פתיחת קריאת שירות</DialogTitle>
                        </DialogHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onCreateTicket)} className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="subject"
                                    render={({ field }) => (
                                        <FormItem className={styles.formGroup}>
                                            <FormLabel className={styles.formLabel}>נושא</FormLabel>
                                            <FormControl>
                                                <input className={styles.formInput} placeholder="תיאור קצר של הבעיה" {...field} />
                                            </FormControl>
                                            <FormMessage style={{ color: '#F87171' }} />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="priority"
                                    render={({ field }) => (
                                        <FormItem className={styles.formGroup}>
                                            <FormLabel className={styles.formLabel}>דחיפות</FormLabel>
                                            <select
                                                className={styles.formInput}
                                                value={field.value}
                                                onChange={field.onChange}
                                            >
                                                <option value="low">נמוכה</option>
                                                <option value="medium">רגילה</option>
                                                <option value="high">גבוהה</option>
                                                <option value="urgent">דחופה</option>
                                            </select>
                                            <FormMessage style={{ color: '#F87171' }} />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="message"
                                    render={({ field }) => (
                                        <FormItem className={styles.formGroup}>
                                            <FormLabel className={styles.formLabel}>פירוט</FormLabel>
                                            <FormControl>
                                                <textarea className={styles.formTextarea} placeholder="תאר את הבעיה בהרחבה..." {...field} />
                                            </FormControl>
                                            <FormMessage style={{ color: '#F87171' }} />
                                        </FormItem>
                                    )}
                                />
                                <button type="submit" className={styles.btnPrimary} style={{ width: '100%', marginTop: '1rem' }}>צור קריאה</button>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className={styles.panelCard}>
                <div className={styles.panelHeader}>
                    <div className={styles.panelTitle}>קריאות שירות</div>
                    <div className={styles.filtersRow}>
                        <div className={styles.searchInputContainer}>
                            <Search className={styles.searchIcon} size={18} />
                            <input
                                placeholder="חיפוש לפי נושא או לקוח..."
                                className={styles.searchInput}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <select
                            className={styles.selectInput}
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="all">כל הסטטוסים</option>
                            <option value="open">פתוח</option>
                            <option value="in_progress">בטיפול</option>
                            <option value="waiting_for_customer">ממתין ללקוח</option>
                            <option value="resolved">נפתר</option>
                        </select>
                    </div>
                </div>
                <div className={styles.panelContent} style={{ padding: 0, overflowX: 'auto' }}>
                    <table className={styles.customTable}>
                        <thead>
                            <tr>
                                <th>מס' קריאה</th>
                                <th style={{ textAlign: 'center' }}>נושא</th>
                                <th style={{ textAlign: 'center' }}>לקוח</th>
                                <th style={{ textAlign: 'center' }}>סטטוס</th>
                                <th style={{ textAlign: 'center' }}>דחיפות</th>
                                <th style={{ textAlign: 'center' }}>תאריך פתיחה</th>
                                <th style={{ textAlign: 'center' }}>פעולות</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={7} style={{ height: '6rem', textAlign: 'center' }}>
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-500" />
                                    </td>
                                </tr>
                            ) : filteredTickets.length === 0 ? (
                                <tr>
                                    <td colSpan={7} style={{ height: '6rem', textAlign: 'center', color: '#94A3B8' }}>
                                        לא נמצאו קריאות שירות
                                    </td>
                                </tr>
                            ) : (
                                filteredTickets.map((ticket) => (
                                    <tr key={ticket.id}>
                                        <td className={styles.cellId}>#{ticket.id}</td>
                                        <td style={{ fontWeight: 500, textAlign: 'center' }}>{ticket.subject}</td>
                                        <td style={{ textAlign: 'center' }}>{ticket.user_name}</td>
                                        <td style={{ textAlign: 'center' }}>{getStatusBadge(ticket.status)}</td>
                                        <td style={{ textAlign: 'center' }}>{getPriorityBadge(ticket.priority)}</td>
                                        <td dir="ltr" style={{ textAlign: 'center', color: '#94A3B8', fontSize: '0.875rem' }}>{ticket.created_at}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <Link href={`/admin/support/${ticket.id}`} style={{ textDecoration: 'none' }}>
                                                <button className={styles.btnGhost}>
                                                    צפה בפרטים
                                                </button>
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
