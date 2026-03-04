import { Lead, CreateLeadDTO, UpdateLeadDTO } from "@/types/crm";
import { api } from "../api";

export const crmApi = {
    getLeads: async (filters?: { status?: string; source?: string; assigned_to?: number }): Promise<Lead[]> => {
        const queryParams = new URLSearchParams();
        if (filters?.status) queryParams.append('status', filters.status);
        if (filters?.source) queryParams.append('source', filters.source);
        if (filters?.assigned_to) queryParams.append('assigned_to', filters.assigned_to.toString());

        const res = await api.get(`/crm/leads?${queryParams.toString()}`);
        return res.data;
    },

    getLead: async (id: number): Promise<Lead> => {
        const res = await api.get(`/crm/leads/${id}`);
        return res.data;
    },

    createLead: async (data: CreateLeadDTO): Promise<{ message: string; id: number }> => {
        try {
            const res = await api.post('/crm/leads', data);
            return res.data;
        } catch (error: any) {
            throw new Error(error.response?.data?.error || 'Failed to create lead');
        }
    },

    updateLead: async (id: number, data: UpdateLeadDTO): Promise<void> => {
        try {
            await api.put(`/crm/leads/${id}`, data);
        } catch (error: any) {
            throw new Error(error.response?.data?.error || 'Failed to update lead');
        }
    },

    addActivity: async (id: number, activity: { type: string; summary: string; scheduled_at?: string; is_completed?: boolean }): Promise<void> => {
        try {
            await api.post(`/crm/leads/${id}/activity`, activity);
        } catch (error: any) {
            throw new Error(error.response?.data?.error || 'Failed to log activity');
        }
    },

    getPipelineStats: async (): Promise<Record<string, { count: number; value: number }>> => {
        const res = await api.get('/crm/pipeline');
        return res.data;
    }
};
