export interface Delivery {
    id: number;
    order_id?: number; // legacy alias
    order_number: string;
    status: 'pending' | 'assigned' | 'accepted' | 'in_transit_to_pickup' | 'picked_up' | 'in_transit_to_delivery' | 'delivered' | 'cancelled';
    pickup_address: string;
    delivery_address: string;
    package_size?: string;
    notes?: string;
    created_at?: string;
    price?: number;
    delivery_type?: 'standard' | 'legal_document' | 'valuable';
    is_legal?: boolean;
}
