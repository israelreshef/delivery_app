import { getHeaders, API_URL } from '@/lib/auth';
import { SupportTicket, TicketDetails, CreateTicketDTO, AddMessageDTO, UpdateTicketDTO } from '@/types/support';

export const supportApi = {
    getTickets: async (filters?: { status?: string; priority?: string; assigned_to?: string }): Promise<SupportTicket[]> => {
        const queryParams = new URLSearchParams();
        if (filters?.status) queryParams.append('status', filters.status);
        if (filters?.priority) queryParams.append('priority', filters.priority);
        if (filters?.assigned_to) queryParams.append('assigned_to', filters.assigned_to);

        const res = await fetch(`${API_URL}/api/support/tickets?${queryParams.toString()}`, {
            headers: getHeaders()
        });

        if (!res.ok) throw new Error('Failed to fetch tickets');
        return res.json();
    },

    getTicketDetails: async (id: number): Promise<TicketDetails> => {
        const res = await fetch(`${API_URL}/api/support/tickets/${id}`, {
            headers: getHeaders()
        });

        if (!res.ok) throw new Error('Failed to fetch ticket details');
        return res.json();
    },

    createTicket: async (data: CreateTicketDTO): Promise<{ message: string; id: number }> => {
        const res = await fetch(`${API_URL}/api/support/tickets`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });

        if (!res.ok) throw new Error('Failed to create ticket');
        return res.json();
    },

    addMessage: async (ticketId: number, data: AddMessageDTO): Promise<void> => {
        const res = await fetch(`${API_URL}/api/support/tickets/${ticketId}/messages`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });

        if (!res.ok) throw new Error('Failed to add message');
    },

    updateTicket: async (ticketId: number, data: UpdateTicketDTO): Promise<void> => {
        const res = await fetch(`${API_URL}/api/support/tickets/${ticketId}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });

        if (!res.ok) throw new Error('Failed to update ticket');
    }
};
