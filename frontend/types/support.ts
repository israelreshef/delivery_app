export type TicketStatus = 'open' | 'in_progress' | 'waiting_for_customer' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface TicketMessage {
    id: number;
    sender_id: number;
    sender_name: string;
    message: string;
    is_internal: boolean;
    created_at: string;
    is_staff: boolean;
}

export interface SupportTicket {
    id: number;
    subject: string;
    status: TicketStatus;
    priority: TicketPriority;
    created_at: string;
    user_id: number;
    user_name: string;
    assigned_to?: number;
    order_id?: number;
}

export interface TicketDetails {
    ticket: SupportTicket;
    messages: TicketMessage[];
}

export interface CreateTicketDTO {
    subject: string;
    message?: string;
    priority?: TicketPriority;
    order_id?: number;
}

export interface AddMessageDTO {
    message: string;
    is_internal?: boolean;
}

export interface UpdateTicketDTO {
    status?: TicketStatus;
    priority?: TicketPriority;
    assigned_to?: number;
}
