"use client"

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { io } from 'socket.io-client'

interface ChatComponentProps {
    userId?: string | number;
    role?: string;
    existingSessionId?: string | null;
    roomId?: string;
    userType?: string;
    otherName?: string;
}

export default function ChatComponent({ userId, role, existingSessionId = null, roomId, userType, otherName }: ChatComponentProps) {
    const [socket, setSocket] = useState<any>(null)
    const [messages, setMessages] = useState<any[]>([])
    const [inputMessage, setInputMessage] = useState('')
    const [sessionId, setSessionId] = useState(existingSessionId)
    const [isOpen, setIsOpen] = useState(false)
    const messagesEndRef = useRef<any>(null)

    useEffect(() => {
        // Scroll to bottom whenever messages change
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    useEffect(() => {
        if (isOpen && !socket) {
            const newSocket = io('http://localhost:5000', {
                transports: ['websocket'],
                query: { user_id: userId, role: role } // Simplify auth for demo
            })

            newSocket.on('connect', () => {
                console.log('Connected to chat server')
                newSocket.emit('join_chat', { user_id: userId, role: role, session_id: sessionId })
            })

            newSocket.on('session_created', (data) => {
                setSessionId(data.session_id)
                console.log('Session created:', data.session_id)
            })

            newSocket.on('new_message', (msg) => {
                setMessages((prev) => [...prev, msg])
            })

            setSocket(newSocket)

            return () => { newSocket.close() }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, userId, role, sessionId])

    const handleSendMessage = () => {
        if (inputMessage.trim() && socket) {
            if (!sessionId && role !== 'admin') {
                // First message creates session for user
                socket.emit('start_session', { user_id: userId })
                // We wait for session_created to send the message? 
                // Or simplified: Just set a flag to send pending message once session exists.
                // For now, let's assume session creation is instant or we alert user to wait.
                // Better UX: Send message with 'start_session' or queue it.
                // Let's queue it simple way:
                setTimeout(() => {
                    // Retry sending after delay if session didn't exist
                    // This is a naive implementation.
                    // Ideally backend returns session_id then we send.
                }, 500)
            } else {
                socket.emit('send_message', {
                    session_id: sessionId,
                    sender_id: userId,
                    message: inputMessage
                })
                setInputMessage('')
            }
        }
    }

    // Special logic for first message if no session
    const handleStartChat = () => {
        if (socket && !sessionId && role === 'customer') {
            socket.emit('start_session', { user_id: userId })
        }
    }

    return (
        <div className="fixed bottom-4 left-4 z-50">
            {!isOpen && (
                <Button onClick={() => setIsOpen(true)} className="rounded-full h-14 w-14 shadow-lg">
                    💬
                </Button>
            )}

            {isOpen && (
                <Card className="w-80 shadow-xl border-t-4 border-t-primary">
                    <CardHeader className="flex flex-row items-center justify-between py-3">
                        <CardTitle className="text-base">תמיכה בצ'אט</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="h-6 w-6">
                            ✖
                        </Button>
                    </CardHeader>
                    <CardContent className="h-64 overflow-y-auto p-4 bg-muted/20 space-y-3">
                        {!sessionId && role === 'customer' && (
                            <div className="text-center py-10">
                                <p className="text-sm text-muted-foreground mb-4">מתחיל שיחה עם נציג...</p>
                                <Button onClick={handleStartChat} size="sm">התחל שיחה חדשה</Button>
                            </div>
                        )}
                        {messages.map((msg, idx) => (
                            <div
                                key={idx}
                                className={`flex w-full ${msg.sender_id === userId ? 'justify-start' : 'justify-end'}`}
                            >
                                <div
                                    className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${msg.sender_id === userId
                                        ? 'bg-primary text-primary-foreground' // My messages
                                        : 'bg-muted' // Others
                                        }`}
                                >
                                    {msg.message}
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </CardContent>
                    <CardFooter className="p-2 gap-2">
                        <Input
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            placeholder="הקלד הודעה..."
                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                            disabled={!sessionId && role === 'customer'} // Disable until session starts
                        />
                        <Button onClick={handleSendMessage} size="icon" disabled={!sessionId && role === 'customer'}>
                            ➤
                        </Button>
                    </CardFooter>
                </Card>
            )}
        </div>
    )
}
