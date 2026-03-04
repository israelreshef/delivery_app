import { api } from '../api';

export interface ItemLocationPath {
    bin_id: number;
    path: string;
    quantity: number;
}

export interface InventoryItem {
    id: number;
    sku: string;
    name: string;
    barcode: string;
    quantity_on_hand: number;
    quantity_available: number;
    volume_per_unit_cm3: number;
    unit_value: string;
    physical_locations: ItemLocationPath[];
}

export interface BinItem {
    item_name: string;
    sku: string;
    quantity: number;
}

export interface StorageBin {
    id: number;
    bin_index: string;
    max_volume: number;
    current_volume: number;
    percent_full: number;
    items_count: number;
    items: BinItem[];
}

export interface StorageZone {
    id: number;
    name: string;
    type: string;
    bins: StorageBin[];
}

export interface WarehouseTopology {
    id: number;
    name: string;
    address: string;
    zones: StorageZone[];
}

export const wmsApi = {
    getTopology: async (): Promise<WarehouseTopology[]> => {
        const response = await api.get('/wms/topology');
        return response.data;
    },

    getInventory: async (): Promise<InventoryItem[]> => {
        const response = await api.get('/wms/inventory');
        return response.data;
    },

    checkIn: async (data: { sku: string; quantity: number; bin_id: number; name?: string; volume_per_unit_cm3?: number; notes?: string }) => {
        const response = await api.post('/wms/inventory/check-in', data);
        return response.data;
    },

    checkOut: async (data: { sku: string; quantity: number; bin_id: number; notes?: string }) => {
        const response = await api.post('/wms/inventory/check-out', data);
        return response.data;
    },

    createWarehouse: async (data: { name: string; address?: string }) => {
        const response = await api.post('/wms/warehouses', data);
        return response.data;
    },

    checkInOrder: async (data: { order_number: string; bin_id: number }) => {
        const response = await api.post('/wms/orders/check-in', data);
        return response.data;
    },

    checkOutOrder: async (data: { order_number: string }) => {
        const response = await api.post('/wms/orders/check-out', data);
        return response.data;
    },

    getOrderLocations: async (): Promise<any[]> => {
        const response = await api.get('/wms/orders/locations');
        return response.data;
    }
};
