import api from '@/shared/api/client';

export const passwordApi = {
    changePassword: async (data: any) => {
        const response = await api.put('/api/password/change', data);
        return response.data;
    },

    forgotPassword: async (email: string) => {
        const response = await api.post('/api/password/forgot', { email });
        return response.data;
    },

    resetPassword: async (data: any) => {
        const response = await api.post('/api/password/reset', data);
        return response.data;
    }
};
