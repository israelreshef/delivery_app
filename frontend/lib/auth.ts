import Cookies from 'js-cookie';
import { jwtDecode } from 'jwt-decode';
import { api } from './api';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const TOKEN_KEY = 'tzir_auth_token';
const USER_KEY = 'tzir_user_data';

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
            // Save to both sessionStorage (safety) and localStorage (persistence)
            sessionStorage.setItem(TOKEN_KEY, token);
            localStorage.setItem(TOKEN_KEY, token);
            localStorage.setItem('token', token); // Legacy key support

            sessionStorage.setItem(USER_KEY, JSON.stringify(user));
            localStorage.setItem(USER_KEY, JSON.stringify(user));

            // Sync to Cookies for Middleware
            Cookies.set('token', token, { expires: 7 }); // Keep for 7 days
            Cookies.set('role', user.role || user.user_type, { expires: 7 });

            // עדכון ה-Header של Axios כדי שכל הבקשות הבאות יהיו מזוהות
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }
    },

    // ניקוי המידע בהתנתקות
    clearSession: () => {
        if (typeof window !== 'undefined') {
            sessionStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem('token');

            sessionStorage.removeItem(USER_KEY);
            localStorage.removeItem(USER_KEY);

            // Clear Cookies
            Cookies.remove('token');
            Cookies.remove('role');

            delete api.defaults.headers.common['Authorization'];
        }
    },

    // שליפת הטוקן הנוכחי
    getToken: (): string | null => {
        if (typeof window !== 'undefined') {
            return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY) || localStorage.getItem('token');
        }
        return null;
    },

    // שליפת המשתמש הנוכחי
    getUser: (): User | null => {
        if (typeof window !== 'undefined') {
            const userStr = sessionStorage.getItem(USER_KEY) || localStorage.getItem(USER_KEY);
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
    const token = auth.getToken();
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

