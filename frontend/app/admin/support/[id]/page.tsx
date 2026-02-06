"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Send, ArrowRight, Clock, CheckCircle2, AlertCircle, User as UserIcon } from "lucide-react";
import { supportApi } from "@/lib/api/support";
import { TicketDetails, TicketStatus, TicketPriority } from "@/types/support";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function TicketDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const ticketId = parseInt(params.id as string);
    const [data, setData] = useState<TicketDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [newMessage, setNewMessage] = useState("");
    const [isInternal, setIsInternal] = useState(false);
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const fetchTicket = async () => {
        try {
            const ticketData = await supportApi.getTicketDetails(ticketId);
            setData(ticketData);
        } catch (error) {
            toast.error("שגיאה בטעינת הקריאה");
            router.push("/admin/support");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTicket();
    }, [ticketId]);

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [data?.messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        setSending(true);
        try {
            await supportApi.addMessage(ticketId, {
                message: newMessage,
                is_internal: isInternal
            });
            setNewMessage("");
            fetchTicket(); // Refresh to show new message
        } catch (error) {
            toast.error("שגיאה בשליחת ההודעה");
        } finally {
            setSending(false);
        }
    };

    const handleStatusChange = async (newStatus: string) => {
        try {
            await supportApi.updateTicket(ticketId, { status: newStatus as TicketStatus });
            toast.success("הסטטוס עודכן");
            fetchTicket();
        } catch (error) {
            toast.error("שגיאה בעדכון הסטטוס");
        }
    };

    const handlePriorityChange = async (newPriority: string) => {
        try {
            await supportApi.updateTicket(ticketId, { priority: newPriority as TicketPriority });
            toast.success("הדחיפות עודכנה");
            fetchTicket();
        } catch (error) {
            toast.error("שגיאה בעדכון הדחיפות");
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden" dir="rtl">
            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col min-w-0">
                <div className="flex items-center p-4 border-b bg-white shadow-sm gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/admin/support">
                            <ArrowRight className="h-5 w-5" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-xl font-bold flex items-center gap-2">
                            {data.ticket.subject}
                            <Badge variant="outline">#{data.ticket.id}</Badge>
                        </h1>
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                            נוצר על ידי {data.ticket.user_name} ב-{data.ticket.created_at}
                        </p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
                    {data.messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={cn(
                                "flex gap-3 max-w-[80%]",
                                msg.is_staff && !msg.is_internal ? "mr-auto flex-row-reverse" : "",
                                msg.is_internal ? "mx-auto max-w-[90%] w-full bg-yellow-50 border-yellow-200 border p-2 rounded-lg" : ""
                            )}
                        >
                            {!msg.is_internal && (
                                <Avatar className="h-8 w-8">
                                    <AvatarFallback className={msg.is_staff ? "bg-primary text-primary-foreground" : "bg-slate-200"}>
                                        {msg.sender_name[0]}
                                    </AvatarFallback>
                                </Avatar>
                            )}

                            <div className={cn(
                                "flex flex-col",
                                msg.is_internal ? "w-full" : ""
                            )}>
                                {!msg.is_internal && (
                                    <div className={cn(
                                        "rounded-lg p-3 text-sm shadow-sm",
                                        msg.is_staff
                                            ? "bg-primary text-primary-foreground rounded-tl-none"
                                            : "bg-white border rounded-tr-none"
                                    )}>
                                        {msg.message}
                                    </div>
                                )}
                                {msg.is_internal && (
                                    <div className="text-sm text-yellow-800 flex items-start gap-2">
                                        <AlertCircle className="h-4 w-4 mt-0.5" />
                                        <div>
                                            <span className="font-semibold block mb-1">הערה פנימית ({msg.sender_name})</span>
                                            {msg.message}
                                        </div>
                                    </div>
                                )}
                                <span className="text-xs text-muted-foreground mt-1 px-1">
                                    {msg.created_at}
                                </span>
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                <div className="p-4 bg-white border-t">
                    <form onSubmit={handleSendMessage} className="space-y-4">
                        <Textarea
                            placeholder="כתוב תגובה..."
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            className="min-h-[100px]"
                        />
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={isInternal}
                                        onChange={(e) => setIsInternal(e.target.checked)}
                                        className="rounded border-gray-300"
                                    />
                                    הערה פנימית (לא גלויה ללקוח)
                                </label>
                            </div>
                            <Button type="submit" disabled={sending || !newMessage.trim()}>
                                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                <span className="mr-2">שלח תגובה</span>
                            </Button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Sidebar Details */}
            <div className="w-80 border-r bg-white p-6 space-y-6 overflow-y-auto">
                <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-4">סטטוס וטיפול</h3>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">סטטוס</label>
                            <Select value={data.ticket.status} onValueChange={handleStatusChange}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="open">פתוח</SelectItem>
                                    <SelectItem value="in_progress">בטיפול</SelectItem>
                                    <SelectItem value="waiting_for_customer">ממתין ללקוח</SelectItem>
                                    <SelectItem value="resolved">נפתר</SelectItem>
                                    <SelectItem value="closed">סגור</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">דחיפות</label>
                            <Select value={data.ticket.priority} onValueChange={handlePriorityChange}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="low">נמוכה</SelectItem>
                                    <SelectItem value="medium">רגילה</SelectItem>
                                    <SelectItem value="high">גבוהה</SelectItem>
                                    <SelectItem value="urgent">דחופה</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                <div className="pt-6 border-t">
                    <h3 className="text-sm font-medium text-muted-foreground mb-4">פרטי לקוח</h3>
                    <div className="flex items-center gap-3 mb-4">
                        <Avatar className="h-10 w-10">
                            <AvatarFallback><UserIcon className="h-5 w-5" /></AvatarFallback>
                        </Avatar>
                        <div>
                            <div className="font-medium">{data.ticket.user_name}</div>
                            <div className="text-xs text-muted-foreground">ID: {data.ticket.user_id}</div>
                        </div>
                    </div>
                    {data.ticket.order_id && (
                        <div className="bg-slate-50 p-3 rounded-lg border text-sm">
                            <span className="text-muted-foreground block mb-1">הזמנה מקושרת</span>
                            <Link href={`/orders`} className="font-medium text-primary hover:underline">
                                #{data.ticket.order_id}
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
