import axios from 'axios';

// Create a configured axios instance
export const api = axios.create({
    baseURL: 'http://localhost:5000/api', // Flask Backend URL
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add request interceptor to attach token from sessionStorage
api.interceptors.request.use(
    (config) => {
        // Get token from sessionStorage (same key used in auth.ts)
        const token = typeof window !== 'undefined' ? sessionStorage.getItem('tzir_auth_token') : null;

        if (token && token !== 'undefined' && token !== 'null') {
            config.headers.Authorization = `Bearer ${token}`;
        } else {
            console.warn(`[API] Request to ${config.url} missing token`);
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Fetch real stats from backend
export const fetchDashboardStats = async () => {
    try {
        const response = await api.get('/stats/dashboard');

        // Transform backend format to frontend format
        const data = response.data;
        return {
            onlineCouriers: data.couriers.active,
            activeOrders: data.orders.active,
            completedOrders: data.orders.delivered,
            totalRevenue: data.performance.revenue_today,
            recentActivity: data.recent_activity || []
        };
    } catch (error) {
        console.error("Failed to fetch dashboard stats", error);
        return {
            onlineCouriers: 0,
            activeOrders: 0,
            completedOrders: 0,
            totalRevenue: 0,
            recentActivity: []
        };
    }
};

// E2EE: Fetch Server Public Key
export const getPublicKey = async () => {
    try {
        const response = await api.get('/auth/public-key');
        return response.data.public_key;
    } catch (error) {
        console.error("Failed to fetch public key", error);
        return null;
    }
};
