import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Delivery } from '@/types/orders'; // Assuming types exist or will be inferred
import { api } from '@/lib/api';

type CourierStatus = 'idle' | 'busy' | 'offline';

interface CourierState {
    status: CourierStatus;
    activeOrder: any | null; // TODO: Strict typing
    incomingOrder: any | null; // The order "ringing" right now

    setStatus: (status: CourierStatus) => void;
    setIncomingOrder: (order: any) => void;
    setActiveOrder: (order: any) => void;

    acceptOrder: (orderId: number) => Promise<void>;
    rejectOrder: (orderId: number) => Promise<void>;
    updateDeliveryStatus: (orderId: number, status: string) => Promise<void>;
    clearState: () => void;
}

export const useCourierStore = create<CourierState>()(
    persist(
        (set, get) => ({
            status: 'idle',
            activeOrder: null,
            incomingOrder: null,

            setStatus: (status) => set({ status }),
            setIncomingOrder: (order) => set({ incomingOrder: order }),
            setActiveOrder: (order) => set({ activeOrder: order }),

            acceptOrder: async (orderId) => {
                try {
                    await api.post(`/couriers/orders/${orderId}/accept`);
                    // Move incoming to active
                    set((state) => ({
                        activeOrder: { ...state.incomingOrder, status: 'accepted' },
                        incomingOrder: null,
                        status: 'busy'
                    }));
                } catch (error) {
                    console.error("Failed to accept order:", error);
                    throw error;
                }
            },

            rejectOrder: async (orderId) => {
                try {
                    await api.post(`/couriers/orders/${orderId}/reject`);
                    set({ incomingOrder: null });
                } catch (error) {
                    console.error("Failed to reject order:", error);
                    throw error;
                }
            },

            updateDeliveryStatus: async (orderId, status) => {
                try {
                    await api.post(`/couriers/orders/${orderId}/status`, { status });
                    // Update local state
                    set((state) => ({
                        activeOrder: state.activeOrder ? { ...state.activeOrder, status } : null
                    }));
                } catch (error) {
                    console.error("Failed to update status:", error);
                    throw error;
                }
            },

            clearState: () => set({ activeOrder: null, incomingOrder: null, status: 'idle' })
        }),
        {
            name: 'courier-storage',
        }
    )
);
