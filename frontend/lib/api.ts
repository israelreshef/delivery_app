import axios from 'axios';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Create a configured axios instance
export const api = axios.create({
    baseURL: `${API_URL}/api`,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add request interceptor to attach token from various storage locations
api.interceptors.request.use(
    (config) => {
        if (typeof window === 'undefined') return config;

        // Try to get token from multiple sources for robustness
        const token = sessionStorage.getItem('tzir_auth_token') ||
            localStorage.getItem('tzir_auth_token') ||
            sessionStorage.getItem('token') ||
            localStorage.getItem('token') ||
            Cookies.get('token'); // Fallback to cookie for middleware compatibility

        if (token && token !== 'undefined' && token !== 'null') {
            config.headers.Authorization = `Bearer ${token}`;
        } else {
            // Only warn on non-auth routes if needed
            const isAuthRoute = config.url?.includes('/auth/login') || config.url?.includes('/auth/register');
            if (!isAuthRoute) {
                console.warn(`[API] Request to ${config.url} missing token`);
            }
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
            onlineCouriers: data.active_couriers,
            activeOrders: data.active_orders,
            completedOrders: data.orders_today,
            totalRevenue: data.revenue_today,
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
