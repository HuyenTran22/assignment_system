import apiClient from '@/shared/api/client';
import { LoginRequest, RegisterRequest, AuthResponse, User } from '../types/auth.types';

export const authService = {
    login: async (data: LoginRequest): Promise<AuthResponse> => {
        const response = await apiClient.post('/auth/login', data);
        return response.data;
    },

    register: async (data: RegisterRequest): Promise<AuthResponse> => {
        const response = await apiClient.post('/auth/register', data);
        return response.data;
    },

    getCurrentUser: async (): Promise<User> => {
        const response = await apiClient.get('/auth/me');
        return response.data;
    },

    refreshToken: async (refreshToken: string): Promise<{ access_token: string }> => {
        const response = await apiClient.post('/auth/refresh', { refresh_token: refreshToken });
        return response.data;
    },

    logout: () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
    },
};
