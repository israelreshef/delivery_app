"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { MessageSquare, X, Send, User, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { cn } from "@/lib/utils"; // Assuming utils exists, if not I'll just use class names
import { toast } from "sonner";

interface Message {
    id: number;
    sender_id: number;
    message: string;
    timestamp: string;
    is_me: boolean;
}

import { useChatStore } from "@/lib/stores/chatStore";

import { useSocket } from "@/lib/socket"; // Import hook
import { api } from "@/lib/api";

export default function ChatWindow() {
    const { isOpen, setIsOpen, toggle } = useChatStore();
    // socket is now derived from hook
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [sessionId, setSessionId] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [token, setToken] = useState<string | null>(null);

    // Initialize Auth
    useEffect(() => {
        const userStr = localStorage.getItem('user');
        const tokenStr = localStorage.getItem('token');
        if (userStr) {
            setCurrentUser(JSON.parse(userStr));
        }
        if (tokenStr) {
            setToken(tokenStr);
        }
    }, []);

    // Use shared socket hook - only connects if token & role exist
    // We pass 'customer_support' or user role as needed
    const socket = useSocket(token, currentUser?.role);

    // Scroll to bottom on new message
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isOpen]);

    // Initialize Chat Session
    const initSession = async () => {
        if (!socket || !currentUser) return;
        setLoading(true);

        try {
            // 1. Get or Create Session via API
            const res = await api.post('/chat/start');
            const data = res.data;

            if (data.id) {
                setSessionId(data.id);

                // 2. Load History
                const histRes = await api.get(`/chat/history/${data.id}`);
                const history = histRes.data;
                if (Array.isArray(history)) {
                    setMessages(history);
                }

                // 3. Join Socket Room
                socket.emit('join_chat', {
                    user_id: currentUser.id,
                    role: currentUser.role,
                    session_id: data.id
                });

                // 4. Listen for incoming
                socket.off('new_message'); // Remove listeners to avoid duplicates
                socket.on('new_message', (msg: any) => {
                    setMessages(prev => [...prev, {
                        id: msg.id,
                        sender_id: msg.sender_id,
                        message: msg.message,
                        timestamp: msg.timestamp,
                        is_me: msg.sender_id === currentUser.id
                    }]);
                });
            }
        } catch (error) {
            console.error(error);
            toast.error("שגיאה בחיבור לצ'אט");
        } finally {
            setLoading(false);
        }
    };

    const toggleChat = () => {
        if (!isOpen && !sessionId) {
            initSession();
        }
        toggle(); // use store toggle
    };

    const sendMessage = () => {
        if (!inputValue.trim() || !socket || !sessionId || !currentUser) return;

        socket.emit('send_message', {
            session_id: sessionId,
            sender_id: currentUser.id,
            message: inputValue
        });

        setInputValue("");
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    };

    if (!currentUser) return null; // Don't show if not logged in

    return (
        <div className="fixed bottom-6 left-6 z-50 flex flex-col items-end pointer-events-none" dir="rtl">
            {/* Chat Window */}
            <div className={cn(
                "bg-white w-[350px] h-[500px] rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transition-all duration-300 pointer-events-auto flex flex-col mb-4 origin-bottom-left",
                isOpen ? "opacity-100 scale-100" : "opacity-0 scale-95 translate-y-10 invisible"
            )}>
                {/* Header */}
                <div className="bg-blue-600 p-4 text-white flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                            <User className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="font-bold">תמיכת לקוחות</div>
                            <div className="text-xs text-blue-100 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
                                מחוברים כעת
                            </div>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={toggleChat}>
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                {/* Messages Area */}
                <div className="flex-1 bg-slate-50 p-4 overflow-y-auto space-y-4">
                    {loading ? (
                        <div className="flex justify-center py-4">
                            <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="text-center text-slate-400 mt-10 space-y-4">
                            <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">איך אפשר לעזור היום?</p>
                            <div className="grid grid-cols-2 gap-2 px-4">
                                <Button variant="outline" size="sm" onClick={() => setInputValue("איפה המשלוח שלי?")} className="text-xs">
                                    📦 איפה המשלוח?
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => setInputValue("דווח על תקלה")} className="text-xs">
                                    ⚠️ דיווח תקלה
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => setInputValue("שאלות על חיוב")} className="text-xs">
                                    💳 בעיה בחיוב
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => setInputValue("נציג אנושי")} className="text-xs">
                                    👨‍💼 נציג אנושי
                                </Button>
                            </div>
                        </div>
                    ) : (
                        messages.map((msg, idx) => (
                            <div key={idx} className={cn("flex", msg.is_me ? "justify-end" : "justify-start")}>
                                <div className={cn(
                                    "max-w-[80%] p-3 rounded-2xl text-sm shadow-sm",
                                    msg.is_me
                                        ? "bg-blue-600 text-white rounded-tr-none"
                                        : "bg-white text-slate-800 border border-slate-100 rounded-tl-none"
                                )}>
                                    <div>{msg.message}</div>
                                    <div className={cn("text-[10px] mt-1 opacity-70 text-right", msg.is_me ? "text-blue-100" : "text-slate-400")}>
                                        {format(new Date(msg.timestamp), "HH:mm")}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-3 bg-white border-t border-slate-100 flex gap-2">
                    <Input
                        placeholder="כתוב הודעה..."
                        className="bg-slate-50 border-0 focus-visible:ring-1 focus-visible:ring-blue-200"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyPress}
                    />
                    <Button size="icon" className="bg-blue-600 hover:bg-blue-700" onClick={sendMessage}>
                        <Send className="w-4 h-4 ml-1" />
                    </Button>
                </div>
            </div>

            {/* Toggle Button */}
            <Button
                onClick={toggleChat}
                className={cn(
                    "h-14 w-14 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 text-white pointer-events-auto transition-transform active:scale-95",
                    isOpen && "rotate-90 scale-0 opacity-0"
                )}
            >
                <MessageSquare className="w-7 h-7" />
            </Button>

            {/* Open Close Button Placeholder if needed, but the main button hides on open */}
            {isOpen && (
                <Button
                    onClick={toggleChat}
                    className="h-14 w-14 rounded-full shadow-lg bg-slate-800 hover:bg-slate-900 text-white pointer-events-auto absolute bottom-0 right-0 z-50"
                >
                    <ChevronUp className="w-7 h-7 rotate-180" />
                </Button>
            )}
        </div>
    );
}
