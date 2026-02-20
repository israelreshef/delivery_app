import { api } from '../api';
import { CreateOrderDTO } from '@/types/order';

interface PriceQuoteParams {
    distance_km: number;
    package_size: string;
    urgency: string;
    delivery_type: string;
    insurance_value: number;
    weight: number;
}

interface PriceQuoteResponse {
    success: true;
    price: number;
    breakdown: {
        base_price: number;
        distance_km: number;
        size_multiplier: number;
        urgency_multiplier: number;
        type_multiplier: number;
        weight_surcharge: number;
        insurance_cost: number;
    };
    currency: string;
}

export const ordersApi = {
    createOrder: async (data: CreateOrderDTO) => {
        const response = await api.post('/orders/create', data);
        return response.data;
    },

    getOrders: async () => {
        const response = await api.get('/orders');
        return response.data;
    },

    getOrder: async (id: number) => {
        const response = await api.get(`/orders/${id}`);
        return response.data;
    },

    calculatePrice: async (params: PriceQuoteParams): Promise<PriceQuoteResponse> => {
        const response = await api.post('/orders/calculate', params);
        return response.data;
    }
};
