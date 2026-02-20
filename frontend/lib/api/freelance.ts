import { getHeaders, API_URL } from '@/lib/auth';
import { CourierDocument, Payout, PayoutCalculation, CreatePayoutDTO } from '@/types/freelance';

export const freelanceApi = {
    uploadDocument: async (formData: FormData): Promise<void> => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('tzir_auth_token') : '';

        const res = await fetch(`${API_URL}/api/freelance/documents`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
                // Don't set Content-Type for FormData, browser will set it with boundary
            },
            body: formData
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to upload document');
        }
    },

    getDocuments: async (filters?: { courier_id?: number; status?: string }): Promise<CourierDocument[]> => {
        const queryParams = new URLSearchParams();
        if (filters?.courier_id) queryParams.append('courier_id', filters.courier_id.toString());
        if (filters?.status) queryParams.append('status', filters.status);

        const res = await fetch(`${API_URL}/api/freelance/documents?${queryParams.toString()}`, {
            headers: getHeaders()
        });

        if (!res.ok) throw new Error('Failed to fetch documents');
        return res.json();
    },

    verifyDocument: async (docId: number, status: 'approved' | 'rejected'): Promise<void> => {
        const res = await fetch(`${API_URL}/api/freelance/documents/${docId}/verify`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify({ status })
        });

        if (!res.ok) throw new Error('Failed to verify document');
    },

    getDocumentFile: (docId: number): string => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('tzir_auth_token') : '';
        return `${API_URL}/api/freelance/documents/${docId}/file?token=${token}`;
    },

    calculatePayout: async (courierId: number, periodStart: string, periodEnd: string): Promise<PayoutCalculation> => {
        const res = await fetch(`${API_URL}/api/freelance/payouts/calculate`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({
                courier_id: courierId,
                period_start: periodStart,
                period_end: periodEnd
            })
        });

        if (!res.ok) throw new Error('Failed to calculate payout');
        return res.json();
    },

    createPayout: async (data: CreatePayoutDTO): Promise<{ message: string; id: number }> => {
        const res = await fetch(`${API_URL}/api/freelance/payouts`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });

        if (!res.ok) throw new Error('Failed to create payout');
        return res.json();
    },

    getPayouts: async (courierId?: number): Promise<Payout[]> => {
        const queryParams = new URLSearchParams();
        if (courierId) queryParams.append('courier_id', courierId.toString());

        const res = await fetch(`${API_URL}/api/freelance/payouts?${queryParams.toString()}`, {
            headers: getHeaders()
        });

        if (!res.ok) throw new Error('Failed to fetch payouts');
        return res.json();
    },

    approvePayout: async (payoutId: number): Promise<void> => {
        const res = await fetch(`${API_URL}/api/freelance/payouts/${payoutId}/approve`, {
            method: 'PUT',
            headers: getHeaders()
        });

        if (!res.ok) throw new Error('Failed to approve payout');
    }
};
