import { api } from '../api';

export interface InventoryItem {
    id: number;
    sku: string;
    name: string;
    barcode: string;
    quantity_on_hand: number;
    quantity_available: number;
    unit_value: number;
}

export const wmsApi = {
    getInventory: async () => {
        const response = await api.get('/wms/inventory');
        return response.data;
    },

    checkIn: async (data: { sku: string; quantity: number; warehouse_id?: number; name?: string; unit_value?: number }) => {
        const response = await api.post('/wms/inventory/check-in', data);
        return response.data;
    },

    checkOut: async (data: { sku: string; quantity: number; warehouse_id?: number; notes?: string }) => {
        const response = await api.post('/wms/inventory/check-out', data);
        return response.data;
    }
};
