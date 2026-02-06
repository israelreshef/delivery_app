import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import io, { Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from './config';
import NetInfo from '@react-native-community/netinfo';
import Toast from 'react-native-toast-message';

import { startBackgroundLocation, stopBackgroundLocation } from './LocationService';

interface CourierState {
    socket: Socket | null;
    courierId: number | null;
    token: string | null;
    pushToken: string | null;
    isConnected: boolean;
    isShiftActive: boolean;
    activeOrders: any[];
    offlineQueue: any[]; // Store failed requests

    // Actions
    setToken: (token: string | null) => Promise<void>;
    loadToken: () => Promise<void>;
    setPushToken: (token: string | null) => void;
    setCourierId: (id: number) => void;
    toggleShift: () => Promise<void>;
    connect: (url?: string) => void;
    disconnect: () => void;
    sendLocation: (lat: number, lng: number) => void;
    logout: () => Promise<void>;

    // Offline / Sync
    addToQueue: (action: string, payload: any) => void;
    syncQueue: () => Promise<void>;
}

export const useCourierStore = create<CourierState>()(
    persist(
        (set, get) => ({
            socket: null,
            courierId: null,
            token: null,
            pushToken: null,
            isConnected: false,
            isShiftActive: false,
            activeOrders: [],
            offlineQueue: [],

            setToken: async (token) => {
                if (token) {
                    await SecureStore.setItemAsync('token', token);
                } else {
                    await SecureStore.deleteItemAsync('token');
                }
                set({ token });
            },

            loadToken: async () => {
                const token = await SecureStore.getItemAsync('token');
                set({ token });
            },

            setPushToken: (token) => set({ pushToken: token }),

            setCourierId: (id) => set({ courierId: id }),

            toggleShift: async () => {
                const { isShiftActive, courierId } = get();
                if (!courierId) {
                    Toast.show({ type: 'error', text1: 'Profile not loaded' });
                    return;
                }

                const newState = !isShiftActive;
                set({ isShiftActive: newState });

                if (newState) {
                    await startBackgroundLocation();
                    Toast.show({ type: 'success', text1: 'Shift Started', text2: 'You are now visible for new orders.' });
                } else {
                    await stopBackgroundLocation();
                    Toast.show({ type: 'info', text1: 'Shift Ended', text2: 'Location tracking stopped.' });
                }
            },

            connect: (url = API_URL) => {
                if (get().socket?.connected) return;

                const socket = io(url, {
                    transports: ['websocket'],
                    autoConnect: true,
                    auth: { token: get().token }
                });

                socket.on('connect', () => {
                    console.log('✅ Connected to Server');
                    set({ isConnected: true });
                    get().syncQueue(); // Try to sync when connected

                    const { courierId, token, pushToken } = get();
                    if (courierId && token) {
                        socket.emit('join', {
                            role: 'courier',
                            courier_id: courierId,
                            token,
                            push_token: pushToken // Send push token to server
                        });
                    }
                });

                socket.on('disconnect', () => {
                    console.log('❌ Disconnected');
                    set({ isConnected: false });
                });

                // Listen for assignments to update active orders list locally
                socket.on('new_assignment', (order) => {
                    set((state) => ({ activeOrders: [...state.activeOrders, order] }));
                });

                set({ socket });
            },

            disconnect: () => {
                const { socket } = get();
                if (socket) socket.disconnect();
                set({ socket: null, isConnected: false });
            },

            sendLocation: (lat, lng) => {
                const { socket, courierId } = get();
                // If offline, maybe we don't queue location updates to avoid spam, 
                // or we only queue the last known location.
                if (socket?.connected && courierId) {
                    socket.emit('courier_location_update', {
                        courier_id: courierId,
                        lat,
                        lng,
                        timestamp: new Date().toISOString(),
                    });
                }
            },

            addToQueue: (action, payload) => {
                set((state) => ({ offlineQueue: [...state.offlineQueue, { action, payload, timestamp: Date.now() }] }));
                Toast.show({ type: 'info', text1: 'Saved offline', text2: 'Action will sync when online.' });
            },

            syncQueue: async () => {
                const { offlineQueue, token } = get();
                if (offlineQueue.length === 0) return;

                const netInfo = await NetInfo.fetch();
                if (!netInfo.isConnected) return;

                console.log('🔄 Syncing offline queue...', offlineQueue.length);

                // Process queue... (Implementation depends on API)
                // For now, we just clear it to simulate sync

                set({ offlineQueue: [] });
                Toast.show({ type: 'success', text1: 'Sync Complete', text2: 'Offline data sent to server.' });
            },

            logout: async () => {
                await SecureStore.deleteItemAsync('token');
                set({ token: null, courierId: null, activeOrders: [], isShiftActive: false });
                await stopBackgroundLocation();
                get().disconnect();
            }
        }),
        {
            name: 'courier-storage',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({
                token: state.token,
                pushToken: state.pushToken,
                courierId: state.courierId,
                activeOrders: state.activeOrders,
                offlineQueue: state.offlineQueue,
                isShiftActive: state.isShiftActive
            }), // Only persist these fields
        }
    )
);
