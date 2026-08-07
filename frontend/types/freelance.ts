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

export type TaxFormKind = 'auto' | 'blank';
export type TaxFormPeriod = 'month' | 'year' | null;

export interface TaxForm {
    id: string;
    title: string;
    description: string;
    kind: TaxFormKind;
    period: TaxFormPeriod;
    available: boolean;
}

export interface GenerateTaxFormDTO {
    month?: number;
    year: number;
}

export type ReportRefreshStatus = 'up_to_date' | 'needs_refresh';

export interface CourierReportHistory {
    id: number;
    form_id: string;
    title: string;
    period: 'month' | 'year';
    period_label: string;
    period_year: number;
    period_month: number | null;
    status: ReportRefreshStatus;
    filename: string;
    created_at: string;
}
