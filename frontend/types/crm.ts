export type LeadStatus = 'new' | 'contacted' | 'meeting' | 'proposal' | 'negotiation' | 'won' | 'lost';
export type LeadSource = 'website' | 'facebook' | 'referral' | 'cold_call' | 'other';
export type ActivityType = 'call' | 'email' | 'meeting' | 'note' | 'whatsapp';

export interface SalesActivity {
    id: number;
    type: ActivityType;
    summary: string;
    scheduled_at: string;
    is_completed: boolean;
    created_by: number;
    created_at: string;
}

export interface Lead {
    id: number;
    first_name: string;
    last_name: string;
    company_name?: string;
    email?: string;
    phone: string;
    status: LeadStatus;
    source: LeadSource;
    estimated_value: number;
    assigned_to?: number;
    created_at: string;
    activities?: SalesActivity[];
}

export interface CreateLeadDTO {
    first_name: string;
    last_name: string;
    phone: string;
    email?: string;
    company_name?: string;
    source?: LeadSource;
    status?: LeadStatus;
    estimated_value?: number;
    assigned_to?: number;
}

export interface UpdateLeadDTO {
    first_name?: string;
    last_name?: string;
    phone?: string;
    email?: string;
    company_name?: string;
    source?: LeadSource;
    status?: LeadStatus;
    estimated_value?: number;
    assigned_to?: number;
}
