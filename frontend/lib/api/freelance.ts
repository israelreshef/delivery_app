import { CourierDocument, Payout, PayoutCalculation, CreatePayoutDTO } from '@/types/freelance';
import { api } from "../api";

export const freelanceApi = {
    uploadDocument: async (formData: FormData): Promise<void> => {
        try {
            await api.post('/freelance/documents', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
        } catch (error: any) {
            throw new Error(error.response?.data?.error || 'Failed to upload document');
        }
    },

    getDocuments: async (filters?: { courier_id?: number; status?: string }): Promise<CourierDocument[]> => {
        const queryParams = new URLSearchParams();
        if (filters?.courier_id) queryParams.append('courier_id', filters.courier_id.toString());
        if (filters?.status) queryParams.append('status', filters.status);

        const res = await api.get(`/freelance/documents?${queryParams.toString()}`);
        return res.data;
    },

    verifyDocument: async (docId: number, status: 'approved' | 'rejected'): Promise<void> => {
        try {
            await api.put(`/freelance/documents/${docId}/verify`, { status });
        } catch (error: any) {
            throw new Error(error.response?.data?.error || 'Failed to verify document');
        }
    },

    getDocumentFile: (docId: number): string => {
        // Since this is used for direct image source, we might need a token in the URL if the backend doesn't check cookies/session for GET /file
        const token = typeof window !== 'undefined' ? (sessionStorage.getItem('tzir_auth_token') || localStorage.getItem('tzir_auth_token') || localStorage.getItem('token')) : '';
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        return `${API_URL}/api/freelance/documents/${docId}/file?token=${token}`;
    },

    calculatePayout: async (courierId: number, periodStart: string, periodEnd: string): Promise<PayoutCalculation> => {
        try {
            const res = await api.post('/freelance/payouts/calculate', {
                courier_id: courierId,
                period_start: periodStart,
                period_end: periodEnd
            });
            return res.data;
        } catch (error: any) {
            throw new Error(error.response?.data?.error || 'Failed to calculate payout');
        }
    },

    createPayout: async (data: CreatePayoutDTO): Promise<{ message: string; id: number }> => {
        try {
            const res = await api.post('/freelance/payouts', data);
            return res.data;
        } catch (error: any) {
            throw new Error(error.response?.data?.error || 'Failed to create payout');
        }
    },

    getPayouts: async (courierId?: number): Promise<Payout[]> => {
        const queryParams = new URLSearchParams();
        if (courierId) queryParams.append('courier_id', courierId.toString());

        const res = await api.get(`/freelance/payouts?${queryParams.toString()}`);
        return res.data;
    },

    approvePayout: async (payoutId: number): Promise<void> => {
        try {
            await api.put(`/freelance/payouts/${payoutId}/approve`);
        } catch (error: any) {
            throw new Error(error.response?.data?.error || 'Failed to approve payout');
        }
    }
};
