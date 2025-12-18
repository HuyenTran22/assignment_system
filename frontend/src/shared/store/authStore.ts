import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/modules/auth/types/auth.types';
import { authService } from '@/modules/auth/services/authService';

interface AuthState {
    user: User | null;
    accessToken: string | null;
    refreshToken: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;

    login: (email: string, password: string) => Promise<void>;
    register: (email: string, fullName: string, password: string, role: 'STUDENT' | 'TEACHER') => Promise<void>;
    logout: () => void;
    clearError: () => void;
    loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,

            login: async (email: string, password: string) => {
                set({ isLoading: true, error: null });
                try {
                    const response = await authService.login({ email, password });

                    // Save tokens to localStorage
                    localStorage.setItem('access_token', response.access_token);
                    localStorage.setItem('refresh_token', response.refresh_token);

                    set({
                        user: response.user,
                        accessToken: response.access_token,
                        refreshToken: response.refresh_token,
                        isAuthenticated: true,
                        isLoading: false,
                    });
                } catch (error: any) {
                    let errorMessage = 'Login failed';
                    
                    if (error.response?.data) {
                        const data = error.response.data;
                        // Handle different error formats
                        if (typeof data.detail === 'string') {
                            errorMessage = data.detail;
                        } else if (data.detail?.message) {
                            errorMessage = data.detail.message;
                        } else if (data.message) {
                            errorMessage = data.message;
                        } else if (data.error) {
                            errorMessage = data.error;
                        }
                    } else if (error.message) {
                        errorMessage = error.message;
                    }
                    
                    set({
                        error: errorMessage,
                        isLoading: false,
                    });
                    throw error;
                }
            },

            register: async (email: string, fullName: string, password: string, role: 'STUDENT' | 'TEACHER') => {
                set({ isLoading: true, error: null });
                try {
                    const response = await authService.register({
                        email,
                        full_name: fullName,
                        password,
                        role,
                    });

                    // Save tokens to localStorage
                    localStorage.setItem('access_token', response.access_token);
                    localStorage.setItem('refresh_token', response.refresh_token);

                    set({
                        user: response.user,
                        accessToken: response.access_token,
                        refreshToken: response.refresh_token,
                        isAuthenticated: true,
                        isLoading: false,
                    });
                } catch (error: any) {
                    set({
                        error: error.response?.data?.detail || 'Registration failed',
                        isLoading: false,
                    });
                    throw error;
                }
            },

            logout: () => {
                authService.logout();
                set({
                    user: null,
                    accessToken: null,
                    refreshToken: null,
                    isAuthenticated: false,
                });
            },

            clearError: () => {
                set({ error: null });
            },

            loadUser: async () => {
                const token = localStorage.getItem('access_token');
                if (!token) {
                    set({ isAuthenticated: false });
                    return;
                }

                try {
                    const user = await authService.getCurrentUser();
                    set({
                        user,
                        accessToken: token,
                        isAuthenticated: true,
                    });
                } catch (error: any) {
                    // Only logout on 401 (unauthorized), not on network errors or 500
                    if (error.response?.status === 401) {
                        // Token invalid, logout
                        get().logout();
                    } else {
                        // For other errors (network, 500, etc.), keep user logged in
                        // but don't update user state
                        console.warn('[AuthStore] Failed to load user, but keeping session:', error.message);
                    }
                }
            },
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({
                user: state.user,
                accessToken: state.accessToken,
                refreshToken: state.refreshToken,
                isAuthenticated: state.isAuthenticated,
            }),
        }
    )
);
