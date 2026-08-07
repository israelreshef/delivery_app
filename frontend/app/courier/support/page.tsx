"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { useSocket } from "@/lib/socket";
import { useAuth } from "@/context/AuthContext";
import { auth } from "@/lib/auth";
import { MessageSquare, Send, Image as ImageIcon, Camera, Loader2, ChevronRight, ArrowRight, Clock, CheckCheck, Plus, X, AlertTriangle, Info } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import styles from "./support.module.css";

const OFFLINE_TICKETS_KEY = "tzir_offline_tickets";
const OFFLINE_MESSAGES_PREFIX = "tzir_offline_messages_";

interface TicketMessage {
    id: number;
    sender_id: number;
    sender_name: string;
    message: string;
    is_internal: boolean;
    attachments: string[];
    created_at: string;
    is_staff: boolean;
    is_read?: boolean;
}

interface Ticket {
    id: number;
    ticket_number: string;
    subject: string;
    status: string;
    priority: string;
    created_at: string;
    user_name: string;
    first_message: string;
    message_count: number;
}

function getOfflineTickets(): Ticket[] {
    try {
        const data = localStorage.getItem(OFFLINE_TICKETS_KEY);
        return data ? JSON.parse(data) : [];
    } catch { return []; }
}

function saveOfflineTickets(tickets: Ticket[]) {
    try { localStorage.setItem(OFFLINE_TICKETS_KEY, JSON.stringify(tickets)); } catch {}
}

function getOfflineMessages(ticketId: number): TicketMessage[] {
    try {
        const data = localStorage.getItem(OFFLINE_MESSAGES_PREFIX + ticketId);
        return data ? JSON.parse(data) : [];
    } catch { return []; }
}

function saveOfflineMessages(ticketId: number, messages: TicketMessage[]) {
    try { localStorage.setItem(OFFLINE_MESSAGES_PREFIX + ticketId, JSON.stringify(messages)); } catch {}
}

export default function CourierSupportPage() {
    const { user } = useAuth();
    const token = auth.getToken();
    const socket = useSocket(token, user?.role || null);

    const [activeView, setActiveView] = useState<"list" | "chat">("list");
    const [showNewModal, setShowNewModal] = useState(false);
    const [modalStep, setModalStep] = useState<"warning" | "form">("form");
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [messages, setMessages] = useState<TicketMessage[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [newTicketText, setNewTicketText] = useState("");
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const newFileInputRef = useRef<HTMLInputElement>(null);
    const newCameraInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const newTicketInputRef = useRef<HTMLInputElement>(null);
    const modalInputRef = useRef<HTMLTextAreaElement>(null);

    const activeTickets = tickets.filter(t => t.status === "open" || t.status === "in_progress");

    const fetchTickets = useCallback(async () => {
        try {
            const res = await api.get("/support/tickets");
            const data = res.data || [];
            setTickets(data);
            saveOfflineTickets(data);
        } catch (err) {
            const offline = getOfflineTickets();
            if (offline.length > 0) {
                setTickets(offline);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchMessages = useCallback(async (ticketId: number) => {
        try {
            const res = await api.get(`/support/tickets/${ticketId}`);
            const data = res.data;
            if (data.messages) {
                setMessages(data.messages);
                saveOfflineMessages(ticketId, data.messages);
            }
        } catch (err) {
            const offline = getOfflineMessages(ticketId);
            if (offline.length > 0) {
                setMessages(offline);
            } else {
                toast.error("שגיאה בטעינת ההודעות");
            }
        }
    }, []);

    useEffect(() => {
        if (user) fetchTickets();
    }, [user, fetchTickets]);

    useEffect(() => {
        if (selectedTicket) {
            fetchMessages(selectedTicket.id);
        }
    }, [selectedTicket?.id, fetchMessages]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (!socket) return;
        const handleNewMessage = (data: any) => {
            fetchTickets();
            if (selectedTicket && data.ticket_id === selectedTicket.id) {
                const newMsg: TicketMessage = {
                    id: data.message_id || Date.now(),
                    sender_id: data.sender_id,
                    sender_name: data.sender_name || "תמיכה",
                    message: data.message,
                    is_internal: false,
                    attachments: data.attachments || [],
                    created_at: data.created_at || new Date().toISOString(),
                    is_staff: data.is_staff || false
                };
                setMessages(prev => {
                    const updated = [...prev, newMsg];
                    saveOfflineMessages(selectedTicket.id, updated);
                    return updated;
                });
            }
        };
        socket.on("ticket_message_added", handleNewMessage);
        socket.on("ticket_updated", () => fetchTickets());
        return () => {
            socket.off("ticket_message_added", handleNewMessage);
            socket.off("ticket_updated");
        };
    }, [socket, selectedTicket, fetchTickets]);

    const createTicketAndSend = async (text: string, attachments: string[] = []) => {
        if (!text.trim() && attachments.length === 0) return;
        setSending(true);
        try {
            const res = await api.post("/support/tickets", {
                subject: text.trim().slice(0, 200) || "פנייה חדשה לתמיכה",
                message: text.trim() || "פנייה עם תמונה",
                attachments: attachments,
                priority: "medium"
            });
            const ticketId = res.data.id;
            const ticketNumber = res.data.ticket_number || "001";

            const newTicketEntry: Ticket = {
                id: ticketId,
                ticket_number: ticketNumber,
                subject: text.trim().slice(0, 200) || "פנייה חדשה לתמיכה",
                status: "open",
                priority: "medium",
                created_at: new Date().toISOString(),
                user_name: user?.username || "",
                first_message: text.trim().slice(0, 100) || "פנייה עם תמונה",
                message_count: 1
            };

            setTickets(prev => {
                const exists = prev.find(t => t.id === ticketId);
                if (exists) return prev;
                const updated = [newTicketEntry, ...prev];
                saveOfflineTickets(updated);
                return updated;
            });

            setNewTicketText("");
            setShowNewModal(false);

            const createdTicket = (await api.get(`/support/tickets/${ticketId}`)).data;
            if (createdTicket && createdTicket.ticket) {
                setSelectedTicket(createdTicket.ticket);
                setMessages(createdTicket.messages || []);
                saveOfflineMessages(ticketId, createdTicket.messages || []);
                setActiveView("chat");
            }

            toast.success("ההודעה נשלחה לתמיכה");
        } catch (err) {
            toast.error("שגיאה בשליחת ההודעה");
        } finally {
            setSending(false);
        }
    };

    const sendMessage = async () => {
        if (!inputValue.trim() || !selectedTicket) return;
        setSending(true);
        try {
            await api.post(`/support/tickets/${selectedTicket.id}/messages`, {
                message: inputValue,
                attachments: []
            });
            const newMsg: TicketMessage = {
                id: Date.now(),
                sender_id: user?.id || 0,
                sender_name: user?.username || "אתה",
                message: inputValue,
                is_internal: false,
                attachments: [],
                created_at: new Date().toISOString(),
                is_staff: false
            };
            setMessages(prev => {
                const updated = [...prev, newMsg];
                saveOfflineMessages(selectedTicket.id, updated);
                return updated;
            });
            setInputValue("");
            fetchMessages(selectedTicket.id);
            fetchTickets();
        } catch (err) {
            toast.error("שגיאה בשליחת ההודעה");
        } finally {
            setSending(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (selectedTicket) sendMessage();
        }
    };

    const handleNewTicketKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            createTicketAndSend(newTicketText);
        }
    };

    const handleImageUpload = async (file: File, isNewTicket: boolean = false) => {
        if (!file) return;
        const formData = new FormData();
        formData.append("file", file);
        setUploading(true);
        try {
            const res = await api.post("/support/upload", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            const url = res.data.url;
            if (isNewTicket) {
                await createTicketAndSend("", [url]);
            } else if (selectedTicket) {
                await api.post(`/support/tickets/${selectedTicket.id}/messages`, {
                    message: "📷 תמונה",
                    attachments: [url]
                });
                fetchMessages(selectedTicket.id);
                fetchTickets();
            }
        } catch (err) {
            toast.error("שגיאה בהעלאת התמונה");
        } finally {
            setUploading(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, isNewTicket: boolean = false) => {
        const file = e.target.files?.[0];
        if (file) handleImageUpload(file, isNewTicket);
        if (e.target) e.target.value = "";
    };

    const getStatusLabel = (status: string) => {
        const map: Record<string, string> = {
            open: "פתוח", in_progress: "בטיפול",
            waiting_for_customer: "ממתין לך", resolved: "נפתר", closed: "סגור"
        };
        return map[status] || status;
    };

    const getStatusClass = (status: string) => {
        const map: Record<string, string> = {
            open: styles.statusOpen, in_progress: styles.statusInProgress,
            waiting_for_customer: styles.statusWaiting, resolved: styles.statusResolved, closed: styles.statusClosed
        };
        return map[status] || "";
    };

    const openTicket = (ticket: Ticket) => {
        setSelectedTicket(ticket);
        setActiveView("chat");
    };

    const goBackToList = () => {
        setSelectedTicket(null);
        setActiveView("list");
    };

    const openNewTicketModal = () => {
        if (activeTickets.length >= 2) {
            toast.error("לא ניתן לפתוח יותר משני פניות במקביל");
            return;
        }
        setNewTicketText("");
        if (activeTickets.length === 0) {
            setModalStep("form");
            setShowNewModal(true);
            setTimeout(() => modalInputRef.current?.focus(), 200);
        } else {
            setModalStep("warning");
            setShowNewModal(true);
        }
    };

    if (!user) return null;

    return (
        <div className={styles.container} dir="rtl">
            {activeView === "list" ? (
                <div className={styles.listScreen}>
                    <div className={styles.listHeader}>
                        <MessageSquare size={22} className={styles.listHeaderIcon} />
                        <h1 className={styles.listHeaderTitle}>צאט ותמיכה</h1>
                    </div>

                    <div className={styles.newChatBar}>
                        <button className={styles.newChatPlus} onClick={openNewTicketModal}>
                            <Plus size={22} />
                        </button>
                        <div className={styles.newChatInputWrap}>
                            <input
                                ref={newTicketInputRef}
                                type="text"
                                placeholder="כתוב הודעה חדשה..."
                                className={styles.newChatTextInput}
                                value={newTicketText}
                                onChange={(e) => setNewTicketText(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        createTicketAndSend(newTicketText);
                                    }
                                }}
                            />
                        </div>
                        {newTicketText.trim() && (
                            <button
                                className={styles.newChatSendBtn}
                                onClick={() => createTicketAndSend(newTicketText)}
                                disabled={sending}
                            >
                                {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                            </button>
                        )}
                        <div className={styles.newChatAttach}>
                            <input ref={newFileInputRef} type="file" accept="image/*" className={styles.hiddenInput} onChange={(e) => handleFileSelect(e, true)} />
                            <input ref={newCameraInputRef} type="file" accept="image/*" capture="environment" className={styles.hiddenInput} onChange={(e) => handleFileSelect(e, true)} />
                            <button className={styles.newChatAttachBtn} onClick={() => newFileInputRef.current?.click()} disabled={uploading} title="צרף תמונה">
                                <ImageIcon size={18} />
                            </button>
                            {uploading && <Loader2 size={16} className="animate-spin" />}
                        </div>
                    </div>

                    <div className={styles.ticketList}>
                        {loading ? (
                            <div className={styles.loadingState}><Loader2 className="animate-spin" size={24} /></div>
                        ) : tickets.length === 0 ? (
                            <div className={styles.emptyState}>
                                <MessageSquare size={48} className={styles.emptyIcon} />
                                <p>אין פניות קודמות</p>
                                <p className={styles.emptySub}>השתמש בשדה למעלה לפתיחת קריאה חדשה</p>
                            </div>
                        ) : (
                            tickets.map(ticket => (
                                <button key={ticket.id} className={styles.chtItem} onClick={() => openTicket(ticket)}>
                                    <div className={styles.chtItemRow}>
                                        <span className={styles.chtNumber}>#{ticket.ticket_number}</span>
                                        <span className={cn(styles.chtStatus, getStatusClass(ticket.status))}>
                                            {getStatusLabel(ticket.status)}
                                        </span>
                                    </div>
                                    <div className={styles.chtPreview}>{ticket.first_message || ticket.subject}</div>
                                    <div className={styles.chtMeta}>
                                        <span>{format(new Date(ticket.created_at), "dd/MM/yy HH:mm")}</span>
                                        <span className={cn(styles.chtCount, {
                                            [styles.chtCountActive]: ticket.status === "open" || ticket.status === "in_progress"
                                        })}>{ticket.message_count} הודעות</span>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            ) : selectedTicket && (
                <div className={styles.chatArea}>
                    <div className={styles.topBar}>
                        <button className={styles.backBtn} onClick={goBackToList}>
                            <ArrowRight size={20} />
                        </button>
                        <div className={styles.topBarInfo}>
                            <span className={styles.topBarTitle}>פנייה #{selectedTicket.ticket_number}</span>
                            <span className={cn(styles.chtStatusSm, getStatusClass(selectedTicket.status))}>
                                {getStatusLabel(selectedTicket.status)}
                            </span>
                        </div>
                    </div>

                    <div className={styles.messagesArea}>
                        {messages.length === 0 ? (
                            <div className={styles.emptyChat}>
                                <MessageSquare size={40} className={styles.emptyIcon} />
                                <p>אין הודעות בקריאה זו</p>
                            </div>
                        ) : (
                            messages.map((msg, idx) => (
                                <div key={msg.id || idx} className={cn(styles.msgRow, msg.is_staff ? styles.msgStaff : styles.msgMe)}>
                                    <div className={cn(styles.msgBubble, msg.is_staff ? styles.bubbleStaff : styles.bubbleMe)}>
                                        {msg.is_staff && <div className={styles.msgSender}>{msg.sender_name}</div>}
                                        <div className={styles.msgText}>{msg.message}</div>
                                        {msg.attachments && msg.attachments.length > 0 && (
                                            <div className={styles.attachments}>
                                                {msg.attachments.map((url, i) => (
                                                    <img key={i} src={url} alt="תמונה" className={styles.attImg} onClick={() => window.open(url, "_blank")} />
                                                ))}
                                            </div>
                                        )}
                                        <div className={styles.msgTime}>
                                            {!msg.is_staff && msg.is_read && <CheckCheck size={12} className={styles.readIcon} />}
                                            {format(new Date(msg.created_at), "HH:mm")}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {selectedTicket.status !== "resolved" && selectedTicket.status !== "closed" ? (
                        <div className={styles.inputArea}>
                            <div className={styles.inputRow}>
                                <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className={styles.hiddenInput} onChange={(e) => handleFileSelect(e)} />
                                <input ref={fileInputRef} type="file" accept="image/*" className={styles.hiddenInput} onChange={(e) => handleFileSelect(e)} />
                                <button className={styles.attachBtn} onClick={() => fileInputRef.current?.click()} disabled={uploading} title="גלריה">
                                    <ImageIcon size={20} />
                                </button>
                                <textarea placeholder="כתוב הודעה..." className={styles.msgInput} value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)} onKeyDown={handleKeyPress} rows={1} />
                                <button className={styles.sendBtn} onClick={sendMessage} disabled={sending || !inputValue.trim()}>
                                    {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className={styles.closedNotice}>
                            <CheckCheck size={16} />
                            קריאה זו {getStatusLabel(selectedTicket.status)}ה
                        </div>
                    )}
                </div>
            )}

            {showNewModal && (
                <div className={styles.modalOverlay} onClick={() => { setShowNewModal(false); setModalStep("form"); }}>
                    <div className={styles.newTicketModal} onClick={(e) => e.stopPropagation()}>
                        <button className={styles.modalClose} onClick={() => { setShowNewModal(false); setModalStep("form"); }}>
                            <X size={20} />
                        </button>

                        {modalStep === "form" ? (
                            <div className={styles.modalBody}>
                                <div className={styles.modalIconWrap}>
                                    <MessageSquare size={32} className={styles.modalIcon} />
                                </div>
                                <h2 className={styles.modalTitle}>קריאה חדשה</h2>
                                <p className={styles.modalSub}>תאר את הבעיה או השאלה שלך</p>

                                <textarea
                                    ref={modalInputRef}
                                    placeholder="כתוב הודעה..."
                                    className={styles.modalInput}
                                    value={newTicketText}
                                    onChange={(e) => setNewTicketText(e.target.value)}
                                    onKeyDown={handleNewTicketKeyPress}
                                    rows={3}
                                />
                                <div className={styles.modalActions}>
                                    <div className={styles.modalAttach}>
                                        <input ref={newFileInputRef} type="file" accept="image/*" className={styles.hiddenInput} onChange={(e) => handleFileSelect(e, true)} />
                                        <button className={styles.attachBtn} onClick={() => newFileInputRef.current?.click()} disabled={uploading} title="צרף תמונה">
                                            <ImageIcon size={20} />
                                        </button>
                                        {uploading && <Loader2 size={18} className="animate-spin" />}
                                    </div>
                                    <button className={styles.sendBtnLarge} onClick={() => createTicketAndSend(newTicketText)} disabled={sending || !newTicketText.trim()}>
                                        {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                                        שלח הודעה
                                    </button>
                                </div>
                            </div>
                        ) : activeTickets.length === 1 ? (
                            <div className={styles.modalBody}>
                                <div className={styles.modalIconWrapWarning}>
                                    <Info size={32} />
                                </div>
                                <h2 className={styles.modalTitle}>יש לך כבר צאט פתוח</h2>
                                <p className={styles.modalSub}>ניתן לפתוח עד 2 קריאות במקביל. תוכל לפתוח קריאה נוספת בנושא אחר.</p>
                                <button className={styles.modalProceedBtn} onClick={() => {
                                    setModalStep("form");
                                    setTimeout(() => modalInputRef.current?.focus(), 200);
                                }}>
                                    <Plus size={18} />
                                    פתיחת צאט בנושא אחר
                                </button>
                            </div>
                        ) : (
                            <div className={styles.modalBody}>
                                <div className={styles.modalIconWrapError}>
                                    <AlertTriangle size={32} />
                                </div>
                                <h2 className={styles.modalTitle}>לא ניתן לפתוח יותר משני פניות במקביל</h2>
                                <p className={styles.modalSub}>המתן עד שאחת הקריאות הנוכחיות תטופל או תיסגר.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
