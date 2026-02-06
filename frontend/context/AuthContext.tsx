"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, User } from '@/lib/auth';
import { useRouter, usePathname } from 'next/navigation';
import { api } from '@/lib/api';

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    login: (token: string, userData: User) => void;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    isAuthenticated: false,
    login: () => { },
    logout: () => { },
    isLoading: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    // בדיקה ראשונית בטעינה
    useEffect(() => {
        const initAuth = async () => {
            auth.initialize();
            if (auth.isAuthenticated()) {
                // Load from storage first for immediate UI
                const storedUser = auth.getUser();
                setUser(storedUser);

                // Fetch fresh data from API to get latest fields (like privacy_policy_accepted_at)
                try {
                    const response = await api.get('/auth/me');
                    const freshUser = response.data;

                    console.log("Updated user from API", freshUser); // Debug log

                    // Update user in state and storage
                    auth.setSession(auth.getToken()!, freshUser);
                    setUser(freshUser);
                } catch (error) {
                    console.error("Failed to refresh user data", error);
                    // If 401, maybe logout? For now just keep stored user or do nothing
                }
            }
            setIsLoading(false);
        };
        initAuth();
    }, []);

    // פונקציית התחברות
    const login = (token: string, userData: User) => {
        auth.setSession(token, userData);
        setUser(userData);

        // הפניה לדף המתאים לפי התפקיד
        if (userData.role === 'admin') router.push('/admin/dashboard');
        else if (userData.role === 'courier') router.push('/courier/dashboard');
        else router.push('/customer/dashboard');
    };

    // פונקציית התנתקות
    const logout = () => {
        auth.clearSession();
        setUser(null);
        router.push('/');
    };

    // Inactivity Timer
    useEffect(() => {
        if (!user) return;

        let timer: NodeJS.Timeout;
        const TIMEOUT_DURATION = 30 * 60 * 1000; // 30 minutes

        const resetTimer = () => {
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => {
                console.log("User inactive for 30 minutes - auto logging out");
                logout();
            }, TIMEOUT_DURATION);
        };

        // Events to detect activity
        const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];

        // Initial start
        resetTimer();

        // Attach listeners
        events.forEach(event => document.addEventListener(event, resetTimer));

        return () => {
            if (timer) clearTimeout(timer);
            events.forEach(event => document.removeEventListener(event, resetTimer));
        };
    }, [user]);

    return (
        <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
