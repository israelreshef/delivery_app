import { Lead, CreateLeadDTO, UpdateLeadDTO, SalesActivity } from "@/types/crm";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

function getHeaders() {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

export const crmApi = {
    getLeads: async (filters?: { status?: string; source?: string; assigned_to?: number }): Promise<Lead[]> => {
        const queryParams = new URLSearchParams();
        if (filters?.status) queryParams.append('status', filters.status);
        if (filters?.source) queryParams.append('source', filters.source);
        if (filters?.assigned_to) queryParams.append('assigned_to', filters.assigned_to.toString());

        const res = await fetch(`${API_URL}/api/crm/leads?${queryParams.toString()}`, {
            headers: getHeaders()
        });

        if (!res.ok) throw new Error('Failed to fetch leads');
        return res.json();
    },

    getLead: async (id: number): Promise<Lead> => {
        const res = await fetch(`${API_URL}/api/crm/leads/${id}`, {
            headers: getHeaders()
        });

        if (!res.ok) throw new Error('Failed to fetch lead details');
        return res.json();
    },

    createLead: async (data: CreateLeadDTO): Promise<{ message: string; id: number }> => {
        const res = await fetch(`${API_URL}/api/crm/leads`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to create lead');
        }
        return res.json();
    },

    updateLead: async (id: number, data: UpdateLeadDTO): Promise<void> => {
        const res = await fetch(`${API_URL}/api/crm/leads/${id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to update lead');
        }
    },

    addActivity: async (id: number, activity: { type: string; summary: string; scheduled_at?: string; is_completed?: boolean }): Promise<void> => {
        const res = await fetch(`${API_URL}/api/crm/leads/${id}/activity`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(activity)
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to log activity');
        }
    },

    getPipelineStats: async (): Promise<Record<string, { count: number; value: number }>> => {
        const res = await fetch(`${API_URL}/api/crm/pipeline`, {
            headers: getHeaders()
        });

        if (!res.ok) throw new Error('Failed to fetch pipeline stats');
        return res.json();
    }
};
