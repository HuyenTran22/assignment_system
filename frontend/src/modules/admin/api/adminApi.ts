import api from '@/shared/api/client';
import { User, UserListResponse, CSVImportResponse, PasswordResetLinkResponse, UserRole } from '../types/admin.types';

export const adminApi = {
    // User Management
    getUsers: async (params: { skip?: number; limit?: number; search?: string; role?: UserRole }) => {
        const response = await api.get<UserListResponse>('/api/admin/users', { params });
        return response.data;
    },

    getUser: async (id: string) => {
        const response = await api.get<User>(`/api/admin/users/${id}`);
        return response.data;
    },

    updateUser: async (id: string, data: Partial<User>) => {
        const response = await api.put<User>(`/api/admin/users/${id}`, data);
        return response.data;
    },

    deleteUser: async (id: string) => {
        const response = await api.delete(`/api/admin/users/${id}`);
        return response.data;
    },

    changeUserRole: async (id: string, role: UserRole) => {
        const response = await api.put(`/api/admin/users/${id}/role`, null, { params: { new_role: role } });
        return response.data;
    },

    generateResetLink: async (id: string, sendEmail: boolean = true) => {
        const response = await api.post<PasswordResetLinkResponse>(`/api/admin/users/${id}/reset-password`, null, {
            params: { send_email: sendEmail }
        });
        return response.data;
    },

    // CSV Import
    downloadTemplate: async () => {
        const response = await api.get('/api/admin/users/template', { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'user_import_template.csv');
        document.body.appendChild(link);
        link.click();
        link.remove();
    },

    importUsers: async (file: File, sendEmails: boolean = false) => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await api.post<CSVImportResponse>('/api/admin/users/import', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            params: { send_emails: sendEmails }
        });
        return response.data;
    }
};
