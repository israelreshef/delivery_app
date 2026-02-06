"use client";

import { useEffect, useState } from 'react';
import { useSocket } from '@/lib/socket';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Package, Truck, CheckCircle, AlertCircle } from "lucide-react";

interface FeedItem {
    id: string;
    type: 'new_order' | 'status_update' | 'alert';
    title: string;
    description: string;
    time: Date;
    orderId?: number;
}

export default function LiveFeed() {
    const socket = useSocket();
    const [events, setEvents] = useState<FeedItem[]>([]);

    const addEvent = (event: FeedItem) => {
        setEvents(prev => [event, ...prev].slice(0, 50)); // Keep last 50
    };

    useEffect(() => {
        if (!socket) return;

        socket.on('new_order', (data: any) => {
            addEvent({
                id: Math.random().toString(),
                type: 'new_order',
                title: 'הזמנה חדשה!',
                description: `הזמנה #${data.order_number} התקבלה מלקוח`,
                time: new Date(),
                orderId: data.id
            });
        });

        socket.on('order_update', (data: any) => {
            let title = 'עדכון סטטוס';
            let icon = Package;

            if (data.status === 'assigned') title = 'שליח שובץ';
            if (data.status === 'picked_up') title = 'חבילה נאספה';
            if (data.status === 'delivered') title = 'נמסר בהצלחה';
            if (data.status === 'pending' && data.alert) title = 'התראה חריגה';

            addEvent({
                id: Math.random().toString(),
                type: data.alert ? 'alert' : 'status_update',
                title: title,
                description: data.alert || `הזמנה #${data.id} -> ${data.status}`,
                time: new Date(),
                orderId: data.id
            });
        });

        return () => {
            socket.off('new_order');
            socket.off('order_update');
        };
    }, [socket]);

    return (
        <ScrollArea className="h-[350px] w-full pr-4">
            <div className="space-y-4">
                {events.length === 0 && (
                    <div className="text-center text-muted-foreground py-10">
                        ממתין לעדכונים בזמן אמת...
                    </div>
                )}
                {events.map((item) => (
                    <div key={item.id} className="flex items-start gap-4 border-b pb-3 last:border-0 hover:bg-slate-50 p-2 rounded-lg transition-colors">
                        <div className={`mt-1 p-2 rounded-full ${item.type === 'new_order' ? 'bg-blue-100 text-blue-600' :
                                item.type === 'alert' ? 'bg-red-100 text-red-600' :
                                    'bg-green-100 text-green-600'
                            }`}>
                            {item.type === 'new_order' ? <Package className="w-4 h-4" /> :
                                item.type === 'alert' ? <AlertCircle className="w-4 h-4" /> :
                                    <CheckCircle className="w-4 h-4" />}
                        </div>
                        <div className="flex-1 space-y-1">
                            <p className="text-sm font-medium leading-none flex justify-between">
                                {item.title}
                                <span className="text-xs text-muted-foreground font-normal">
                                    {item.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </p>
                            <p className="text-sm text-muted-foreground">{item.description}</p>
                        </div>
                    </div>
                ))}
            </div>
        </ScrollArea>
    );
}
