// Shared TypeScript interfaces for API responses
// This replaces loose 'any' types throughout the application

export interface User {
    id: number;
    username: string;
    email: string;
    phone: string;
    user_type: 'admin' | 'courier' | 'customer';
    is_active: boolean;
    created_at?: string;
    admin_role?: string;
}

export interface Courier {
    id: number;
    user_id: number;
    full_name: string;
    vehicle_type: 'bike' | 'scooter' | 'car' | 'van';
    license_plate?: string;
    is_available: boolean;
    rating: number;
    total_deliveries: number;
    current_location_lat?: number;
    current_location_lng?: number;
}

export interface Customer {
    id: number;
    user_id: number;
    full_name: string;
    company_name?: string;
    balance: number;
    credit_limit?: number;
}

export interface Order {
    id: number;
    order_number: string;
    customer_id: number;
    courier_id?: number;
    status: 'pending' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';
    pickup_address: string;
    delivery_address: string;
    recipient_name: string;
    recipient_phone: string;
    package_description: string;
    package_size: 'small' | 'medium' | 'large';
    total: number;
    created_at: string;
    updated_at?: string;
}

export interface DashboardStats {
    active_orders: number;
    active_couriers: number;
    orders_today: number;
    revenue_today: number;
    new_customers: number;
    available_couriers?: number;
}

export interface RevenueData {
    date: string;
    amount: number;
}

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    pages: number;
    current_page: number;
}
