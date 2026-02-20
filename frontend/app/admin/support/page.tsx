"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { LifeBuoy, Search, Filter, Loader2, Plus } from "lucide-react";
import Link from "next/link";
import { supportApi } from "@/lib/api/support";
import { SupportTicket, TicketStatus, TicketPriority } from "@/types/support";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";

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
        const styles = {
            open: "bg-blue-100 text-blue-800 hover:bg-blue-100",
            in_progress: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
            waiting_for_customer: "bg-purple-100 text-purple-800 hover:bg-purple-100",
            resolved: "bg-green-100 text-green-800 hover:bg-green-100",
            closed: "bg-gray-100 text-gray-800 hover:bg-gray-100",
        };

        const labels = {
            open: "פתוח",
            in_progress: "בטיפול",
            waiting_for_customer: "ממתין ללקוח",
            resolved: "נפתר",
            closed: "סגור",
        };

        return <Badge className={styles[status]}>{labels[status]}</Badge>;
    };

    const getPriorityBadge = (priority: TicketPriority) => {
        const styles = {
            low: "bg-slate-100 text-slate-700",
            medium: "bg-blue-50 text-blue-700",
            high: "bg-orange-100 text-orange-800",
            urgent: "bg-red-100 text-red-800",
        };
        const labels = {
            low: "נמוכה",
            medium: "רגילה",
            high: "גבוהה",
            urgent: "דחופה"
        };
        return <Badge variant="outline" className={styles[priority]}>{labels[priority]}</Badge>;
    };

    return (
        <div className="p-8 space-y-6 bg-slate-50 min-h-screen" dir="rtl">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <LifeBuoy className="h-8 w-8 text-primary" />
                        מרכז תמיכה
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        ניהול פניות שירות ותקלות
                    </p>
                </div>

                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2">
                            <Plus className="h-4 w-4" />
                            קריאה חדשה
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>פתיחת קריאת שירות</DialogTitle>
                        </DialogHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onCreateTicket)} className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="subject"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>נושא</FormLabel>
                                            <FormControl>
                                                <Input placeholder="תיאור קצר של הבעיה" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="priority"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>דחיפות</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="low">נמוכה</SelectItem>
                                                    <SelectItem value="medium">רגילה</SelectItem>
                                                    <SelectItem value="high">גבוהה</SelectItem>
                                                    <SelectItem value="urgent">דחופה</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="message"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>פירוט</FormLabel>
                                            <FormControl>
                                                <Textarea placeholder="תאר את הבעיה בהרחבה..." {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <Button type="submit" className="w-full">צור קריאה</Button>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>קריאות שירות</CardTitle>
                        <div className="flex gap-2">
                            <div className="relative w-64">
                                <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="חיפוש לפי נושא או לקוח..."
                                    className="pr-9"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-[180px]">
                                    <Filter className="w-4 h-4 ml-2" />
                                    <SelectValue placeholder="סינון לפי סטטוס" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">כל הסטטוסים</SelectItem>
                                    <SelectItem value="open">פתוח</SelectItem>
                                    <SelectItem value="in_progress">בטיפול</SelectItem>
                                    <SelectItem value="waiting_for_customer">ממתין ללקוח</SelectItem>
                                    <SelectItem value="resolved">נפתר</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[100px]">מס' קריאה</TableHead>
                                <TableHead>נושא</TableHead>
                                <TableHead>לקוח</TableHead>
                                <TableHead>סטטוס</TableHead>
                                <TableHead>דחיפות</TableHead>
                                <TableHead>תאריך פתיחה</TableHead>
                                <TableHead className="text-left">פעולות</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                                    </TableCell>
                                </TableRow>
                            ) : filteredTickets.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                        לא נמצאו קריאות שירות
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredTickets.map((ticket) => (
                                    <TableRow key={ticket.id}>
                                        <TableCell>#{ticket.id}</TableCell>
                                        <TableCell className="font-medium">{ticket.subject}</TableCell>
                                        <TableCell>{ticket.user_name}</TableCell>
                                        <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                                        <TableCell>{getPriorityBadge(ticket.priority)}</TableCell>
                                        <TableCell dir="ltr" className="text-right">{ticket.created_at}</TableCell>
                                        <TableCell className="text-left">
                                            <Button variant="ghost" size="sm" asChild>
                                                <Link href={`/admin/support/${ticket.id}`}>
                                                    צפה בפרטים
                                                </Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
