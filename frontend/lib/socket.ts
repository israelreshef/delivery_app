"use client";

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

/**
 * Hook to manage Socket.IO connection with authentication
 * ensures that token is sent during handshake to prevent rejections.
 */
export const useSocket = (token: string | null, role: string | null) => {
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        if (!token || !role) {
            console.log('⏳ Socket postponed: Missing token or role');
            return;
        }

        const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

        console.log(`🔌 Attempting socket connection to ${SOCKET_URL} with role: ${role}`);

        // Initialize socket connection with explicit auth and query
        // We use both to ensure the backend gets it no matter how it looks (auth object vs query param)
        socketRef.current = io(SOCKET_URL, {
            autoConnect: true,
            auth: { token },
            query: { token, role },
            reconnectionAttempts: 10,
            reconnectionDelay: 2000,
            // Allow polling as initial transport for reliability on varied environments
            transports: ['polling', 'websocket']
        });

        const socket = socketRef.current;

        socket.on('connect', () => {
            console.log('✅ Socket connected successfully! SID:', socket.id);
            console.log('✨ Transport:', socket.io.engine.transport.name);

            // Join relevant rooms based on role
            // Important: backend handle_join might need these fields
            socket.emit('join', { role, token, id: 'admin' });
        });

        socket.on('connect_error', (err) => {
            console.error('❌ Socket connection error:', err.message);
            if (err.message === 'xhr poll error') {
                console.warn('⚠️ Network or CORS issue may be blocking socket polling');
            }
        });

        socket.on('disconnect', (reason) => {
            console.log('❌ Socket disconnected:', reason);
        });

        socket.on('error', (err: any) => {
            console.error('⚠️ Socket internal error:', err);
        });

        return () => {
            if (socket) {
                console.log('🧹 Cleaning up socket connection...');
                socket.disconnect();
            }
        };
    }, [token, role]);

    return socketRef.current;
};

// Global unauthenticated instance removed to prevent background connection spam
// and "No token provided" errors on the backend.
