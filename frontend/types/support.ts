export type TicketStatus = 'open' | 'in_progress' | 'waiting_for_customer' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TicketCategory = 'service' | 'courier' | 'customer';

export interface TicketMessage {
    id: number;
    sender_id: number;
    sender_name: string;
    message: string;
    is_internal: boolean;
    attachments?: string[];
    created_at: string;
    is_staff: boolean;
    is_read?: boolean;
}

export interface SupportTicket {
    id: number;
    ticket_number: string;
    subject: string;
    status: TicketStatus;
    priority: TicketPriority;
    category?: TicketCategory;
    created_at: string;
    user_id: number;
    user_name: string;
    assigned_to?: number;
    assigned_to_name?: string;
    order_id?: number;
    first_message?: string;
    message_count?: number;
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
    assigned_to?: number;
    attachments?: string[];
}

export interface AddMessageDTO {
    message: string;
    is_internal?: boolean;
    attachments?: string[];
}

export interface UpdateTicketDTO {
    status?: TicketStatus;
    priority?: TicketPriority;
    assigned_to?: number;
}
