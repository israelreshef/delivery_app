import Cookies from 'js-cookie';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const TOKEN_KEY = 'tzir_auth_token';
const USER_KEY = 'tzir_user_data';

export const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

export interface User {
    id: number;
    username: string;
    email: string;
    role: string;
    user_type: string;
    [key: string]: any;
}

interface JWTPayload {
    exp: number;
    sub: string;
    [key: string]: any;
}

export const auth = {

    // שמירת המידע לאחר התחברות מוצלחת
    setSession: (token: string, user: User) => {
        if (typeof window !== 'undefined') {
            sessionStorage.setItem(TOKEN_KEY, token);
            sessionStorage.setItem(USER_KEY, JSON.stringify(user));

            // Sync to Cookies for Middleware (Optional: Keep cookies for middleware but session storage is primary)
            Cookies.set('token', token, { expires: 1 / 48 }); // Expires in 30 mins (approx)
            Cookies.set('role', user.role || user.user_type, { expires: 1 / 48 });

            // עדכון ה-Header של Axios כדי שכל הבקשות הבאות יהיו מזוהות
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }
    },

    // ניקוי המידע בהתנתקות
    clearSession: () => {
        if (typeof window !== 'undefined') {
            sessionStorage.removeItem(TOKEN_KEY);
            sessionStorage.removeItem(USER_KEY);

            // Clear Cookies
            Cookies.remove('token');
            Cookies.remove('role');

            delete api.defaults.headers.common['Authorization'];
        }
    },

    // שליפת הטוקן הנוכחי
    getToken: (): string | null => {
        if (typeof window !== 'undefined') {
            return sessionStorage.getItem(TOKEN_KEY);
        }
        return null;
    },

    // שליפת המשתמש הנוכחי
    getUser: (): User | null => {
        if (typeof window !== 'undefined') {
            const userStr = sessionStorage.getItem(USER_KEY);
            if (userStr) {
                try {
                    return JSON.parse(userStr);
                } catch (e) {
                    return null;
                }
            }
        }
        return null;
    },

    // בדיקה האם המשתמש מחובר והטוקן בתוקף
    isAuthenticated: (): boolean => {
        const token = auth.getToken();
        if (!token) return false;

        try {
            const decoded = jwtDecode<JWTPayload>(token);
            const currentTime = Date.now() / 1000;
            if (decoded.exp < currentTime) {
                // טוקן פג תוקף
                auth.clearSession();
                return false;
            }
            return true;
        } catch (e) {
            return false;
        }
    },

    // אתחול האפליקציה (טעינת טוקן אם קיים)
    initialize: () => {
        const token = auth.getToken();
        if (token) {
            if (auth.isAuthenticated()) {
                api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            }
        }
    }
};

export function getHeaders() {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem(TOKEN_KEY) : '';
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

