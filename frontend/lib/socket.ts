"use client";

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

export const useSocket = (token: string | null, role: string | null) => {
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        if (!token || !role) return;

        // Initialize socket connection with auth
        const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';
        socketRef.current = io(SOCKET_URL, {
            transports: ['websocket'],
            autoConnect: true,
            auth: { token },
            query: { token } // Fallback for some backends
        });

        const socket = socketRef.current;

        socket.on('connect', () => {
            console.log('✅ Connected to WebSocket Server');
            socket.emit('join', { role, token });
        });

        socket.on('disconnect', () => {
            console.log('❌ Disconnected from WebSocket Server');
        });

        socket.on('error', (err: any) => {
            console.error('Socket error:', err);
        });

        return () => {
            if (socket) socket.disconnect();
        };
    }, [token, role]);

    return socketRef.current;
};

// Singleton removed to prevent unauthorized global connections
// Components should use the hook or manage their own connection
export const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000', {
    transports: ['websocket'],
    autoConnect: false
});
