import { create } from 'zustand';
import type { User } from '../types';

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    setAuth: (user: User, token: string) => void;
    setUser: (user: User | null) => void;
    logout: () => void;
}

// Rehydrate from localStorage on load
const storedUser = localStorage.getItem('erp_user');
const storedToken = localStorage.getItem('erp_token');

export const useAuthStore = create<AuthState>((set) => ({
    user: storedUser ? JSON.parse(storedUser) : null,
    token: storedToken || null,
    isAuthenticated: !!storedToken,
    setAuth: (user, token) => {
        localStorage.setItem('erp_user', JSON.stringify(user));
        localStorage.setItem('erp_token', token);
        set({ user, token, isAuthenticated: true });
    },
    setUser: (user) => {
        if (user) {
            localStorage.setItem('erp_user', JSON.stringify(user));
        } else {
            localStorage.removeItem('erp_user');
            localStorage.removeItem('erp_token');
        }
        set({ user, isAuthenticated: !!user });
    },
    logout: () => {
        localStorage.removeItem('erp_user');
        localStorage.removeItem('erp_token');
        set({ user: null, token: null, isAuthenticated: false });
    },
}));
