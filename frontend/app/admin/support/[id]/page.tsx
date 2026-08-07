"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, Send, ArrowRight, AlertCircle, User as UserIcon, Image as ImageIcon, Camera, CheckCheck } from "lucide-react";
import { supportApi } from "@/lib/api/support";
import { api } from "@/lib/api";
import { useSocket } from "@/lib/socket";
import { auth } from "@/lib/auth";
import { TicketDetails, TicketStatus, TicketPriority } from "@/types/support";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Link from "next/link";
import styles from './ticket.module.css';

export default function TicketDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const ticketId = parseInt(params.id as string);
    const [data, setData] = useState<TicketDetails | null>(null);
    const [loading, setLoading] = useState(true);

    const token = typeof window !== "undefined" ? auth.getToken() : null;
    const user = typeof window !== "undefined" ? auth.getUser() : null;
    const socket = useSocket(token, user?.user_type || user?.role || null);
    const [newMessage, setNewMessage] = useState("");
    const [isInternal, setIsInternal] = useState(false);
    const [sending, setSending] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [couriers, setCouriers] = useState<Array<{id:number; full_name:string; user_id:number}>>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    const fetchCouriers = async () => {
        try {
            const res = await api.get('/couriers');
            if (res.data?.data && Array.isArray(res.data.data)) {
                setCouriers(res.data.data);
            } else if (Array.isArray(res.data)) {
                setCouriers(res.data);
            } else {
                setCouriers([]);
            }
        } catch (error) {
            console.error('Failed to fetch couriers', error);
        }
    };

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
        fetchCouriers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ticketId]);

    // Realtime: when a new message arrives for THIS ticket (from the mobile app
    // or another agent), reload so the conversation stays in sync.
    useEffect(() => {
        if (!socket) return;
        const handleMessageAdded = (event: any) => {
            if (Number(event.ticket_id) === ticketId) {
                fetchTicket();
            }
        };
        const handleTicketUpdated = (event: any) => {
            if (Number(event.id) === ticketId) {
                fetchTicket();
            }
        };
        socket.on("ticket_message_added", handleMessageAdded);
        socket.on("ticket_updated", handleTicketUpdated);
        return () => {
            socket.off("ticket_message_added", handleMessageAdded);
            socket.off("ticket_updated", handleTicketUpdated);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [socket, ticketId]);

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [data?.messages]);

    const handleImageUpload = async (file: File) => {
        if (!file) return;
        const formData = new FormData();
        formData.append("file", file);
        setUploading(true);
        try {
            const res = await api.post("/support/upload", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            const url = res.data.url;
            await supportApi.addMessage(ticketId, {
                message: "📷 תמונה",
                is_internal: false,
                attachments: [url]
            });
            setNewMessage("");
            fetchTicket();
            toast.success("התמונה נשלחה");
        } catch (error) {
            toast.error("שגיאה בהעלאת התמונה");
        } finally {
            setUploading(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleImageUpload(file);
        if (e.target) e.target.value = "";
    };

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
            fetchTicket();
        } catch (error) {
            toast.error("שגיאה בשליחת ההודעה");
        } finally {
            setSending(false);
        }
    };

    const handleAssignTo = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newAssignee = Number(e.target.value) || undefined;

        try {
            await supportApi.updateTicket(ticketId, { assigned_to: newAssignee });
            toast.success("הוקצה משתמש לקריאה");
            fetchTicket();
        } catch (error) {
            toast.error("שגיאה בהקצאת הקריאה");
        }
    };

    const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newStatus = e.target.value;
        try {
            await supportApi.updateTicket(ticketId, { status: newStatus as TicketStatus });
            toast.success("הסטטוס עודכן");
            fetchTicket();
        } catch (error) {
            toast.error("שגיאה בעדכון הסטטוס");
        }
    };

    const handlePriorityChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newPriority = e.target.value;
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
            <div className="flex h-screen items-center justify-center bg-[#0B0E14]">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className={styles.ticketContainer}>
            {/* Main Chat Area */}
            <div className={styles.chatArea}>
                <div className={styles.chatHeader}>
                    <Link href="/admin/support" className={styles.btnGhost}>
                        <ArrowRight className="h-5 w-5" />
                    </Link>
                    <div>
                        <div className={styles.headerTitle}>
                            {data.ticket.subject}
                            <span className={styles.badge}>#{data.ticket.ticket_number || data.ticket.id}</span>
                        </div>
                        <div className={styles.headerSubtitle}>
                            נוצר על ידי {data.ticket.user_name} ב-{data.ticket.created_at}
                        </div>
                    </div>
                </div>

                <div className={styles.messagesList}>
                    {data.messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={cn(
                                styles.messageWrapper,
                                msg.is_staff && !msg.is_internal ? styles.messageStaff : "",
                                msg.is_internal ? styles.messageInternal : ""
                            )}
                        >
                            {!msg.is_internal && (
                                <div className={cn(styles.avatar, msg.is_staff ? styles.avatarStaff : styles.avatarClient)}>
                                    {msg.sender_name[0]}
                                </div>
                            )}

                            <div className={cn(
                                "flex flex-col",
                                msg.is_internal ? "w-full" : ""
                            )}>
                                {!msg.is_internal && (
                                    <div className={cn(
                                        styles.messageBubble,
                                        msg.is_staff ? styles.bubbleStaff : styles.bubbleClient
                                    )}>
                                        {msg.message}
                                        {msg.attachments && msg.attachments.length > 0 && (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                                                {msg.attachments.map((url: string, i: number) => (
                                                    <img
                                                        key={i}
                                                        src={url}
                                                        alt="קובץ מצורף"
                                                        style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '8px', cursor: 'pointer' }}
                                                        onClick={() => window.open(url, '_blank')}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                                {msg.is_internal && (
                                    <div className={cn(styles.messageBubble, styles.bubbleInternal)}>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                                            <AlertCircle style={{ width: '1rem', height: '1rem', marginTop: '0.125rem' }} />
                                            <div>
                                                <span style={{ fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>הערה פנימית ({msg.sender_name})</span>
                                                {msg.message}
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div className={styles.messageTime}>
                                    {msg.is_staff && msg.is_read && <CheckCheck size={12} style={{ marginLeft: '0.25rem', opacity: 0.7 }} />}
                                    {msg.created_at}
                                </div>
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                <div className={styles.replyBox}>
                    <form onSubmit={handleSendMessage}>
                        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleFileSelect} />
                        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileSelect} />
                        <textarea
                            placeholder="כתוב תגובה..."
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            className={styles.textarea}
                        />
                        <div className={styles.replyActions}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <button type="button" className={styles.btnGhost} onClick={() => fileInputRef.current?.click()} disabled={uploading} title="גלריה">
                                    <ImageIcon size={18} />
                                </button>
                                <button type="button" className={styles.btnGhost} onClick={() => cameraInputRef.current?.click()} disabled={uploading} title="מצלמה">
                                    <Camera size={18} />
                                </button>
                                {uploading && <Loader2 size={16} className="animate-spin" />}
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', color: '#94A3B8' }}>
                                    <input
                                        type="checkbox"
                                        checked={isInternal}
                                        onChange={(e) => setIsInternal(e.target.checked)}
                                    />
                                    הערה פנימית
                                </label>
                            </div>
                            <button type="submit" className={styles.btnPrimary} disabled={sending || !newMessage.trim()}>
                                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                שלח תגובה
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Sidebar Details */}
            <div className={styles.sidebar}>
                <div>
                    <div className={styles.sidebarSectionTitle}>סטטוס וטיפול</div>

                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>סטטוס</label>
                        <select
                            className={styles.selectInput}
                            value={data.ticket.status}
                            onChange={handleStatusChange}
                        >
                            <option value="open">פתוח</option>
                            <option value="in_progress">בטיפול</option>
                            <option value="waiting_for_customer">ממתין ללקוח</option>
                            <option value="resolved">נפתר</option>
                            <option value="closed">סגור</option>
                        </select>
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>דחיפות</label>
                        <select
                            className={styles.selectInput}
                            value={data.ticket.priority}
                            onChange={handlePriorityChange}
                        >
                            <option value="low">נמוכה</option>
                            <option value="medium">רגילה</option>
                            <option value="high">גבוהה</option>
                            <option value="urgent">דחופה</option>
                        </select>
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>הקצה למשתמש</label>
                        <select
                            className={styles.selectInput}
                            value={data.ticket.assigned_to ?? ''}
                            onChange={handleAssignTo}
                        >
                            <option value="">ללא הקצאה</option>
                            {couriers.map((courier) => (
                                <option key={courier.id} value={courier.user_id}>
                                    {courier.full_name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div style={{ paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    <div className={styles.sidebarSectionTitle}>פרטי לקוח</div>
                    <div className={styles.customerCard}>
                        <div className={styles.avatar} style={{ width: '40px', height: '40px', background: 'rgba(59, 130, 246, 0.2)', color: '#60A5FA' }}>
                            <UserIcon size={20} />
                        </div>
                        <div>
                            <div style={{ fontWeight: 500, color: '#F8FAFC' }}>{data.ticket.user_name}</div>
                            <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>ID: {data.ticket.user_id}</div>
                        </div>
                    </div>
                    {data.ticket.order_id && (
                        <div className={styles.orderLink}>
                            <span>הזמנה מקושרת</span>
                            <Link href="/orders" style={{ textDecoration: 'none', color: '#60A5FA', fontWeight: 500 }}>
                                #{data.ticket.order_id}
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
