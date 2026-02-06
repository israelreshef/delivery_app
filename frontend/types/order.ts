export type DeliveryStatus = 'pending' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';
export type DeliveryType = 'standard' | 'legal_document' | 'valuable';
export type Urgency = 'express' | 'standard' | 'economy';
export type PackageSize = 'envelope' | 'small' | 'medium' | 'large' | 'xlarge';

export interface Address {
    street: string;
    city: string;
    building_number: string;
    floor?: string;
    apartment?: string;
    entrance?: string;
    latitude?: number;
    longitude?: number;
    notes?: string;
}

export interface Delivery {
    id: number;
    order_number: string;
    customer_name: string;
    phone: string;
    address: string;
    pickup_address: string;
    delivery_address: string;
    status: DeliveryStatus;
    total: number;
    items: string;
    created_at: string;

    // Detailed fields
    delivery_type?: DeliveryType;
    urgency?: Urgency;
    package_size?: PackageSize;
    package_weight?: number;
    distance_km?: number;
    insurance_required?: boolean;
    insurance_value?: number;
    tracking_number?: string;

    // POD
    pod_signature_path?: string;
    pod_image_path?: string;
    pod_recipient_id?: string;
}

export interface CreateOrderDTO {
    sender: {
        senderName: string;
        senderPhone: string;
        senderAddress: Address;
    };
    recipient: {
        recipientName: string;
        recipientPhone: string;
        recipientAddress: Address;
    };
    package: {
        packageSize: PackageSize;
        packageWeight: number;
        packageContent: string;
    };
    service: {
        serviceType: 'regular' | 'express' | 'same_day'; // Legacy mapping
        deliveryType: DeliveryType;
        urgency: Urgency;
        insuranceRequired: boolean;
        insuranceValue: number;
    };
    payment: {
        paymentMethod: 'credit_card' | 'bank_transfer' | 'cash';
    };
}
