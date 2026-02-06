export type DocumentStatus = 'pending' | 'approved' | 'rejected' | 'expired';
export type PayoutStatus = 'draft' | 'approved' | 'paid' | 'cancelled';

export interface CourierDocument {
    id: number;
    courier_id: number;
    document_type: string;
    status: DocumentStatus;
    expiry_date?: string;
    uploaded_at: string;
    reviewed_at?: string;
    is_expired: boolean;
}

export interface Payout {
    id: number;
    courier_id: number;
    period_start: string;
    period_end: string;
    total_deliveries: number;
    total_amount: number;
    status: PayoutStatus;
    invoice_number?: string;
    created_at: string;
}

export interface PayoutCalculation {
    courier_id: number;
    period_start: string;
    period_end: string;
    total_deliveries: number;
    total_amount: number;
}

export interface UploadDocumentDTO {
    document_type: string;
    expiry_date?: string;
    file: File;
}

export interface CreatePayoutDTO {
    courier_id: number;
    period_start: string;
    period_end: string;
    total_deliveries: number;
    total_amount: number;
}
