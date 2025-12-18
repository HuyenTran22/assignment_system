import apiClient from '@/shared/api/client';
import { CourseCreate, CourseUpdate, EnrollmentCreate } from '@/modules/courses/types/course.types';

export const adminCoursesApi = {
    // Course CRUD
    getAllCourses: async (params?: { page?: number; limit?: number; search?: string }) => {
        const response = await apiClient.get('/api/courses', { params });
        return response.data;
    },

    getCourse: async (id: string) => {
        const response = await apiClient.get(`/api/courses/${id}`);
        return response.data;
    },

    createCourse: async (data: CourseCreate) => {
        const response = await apiClient.post('/api/courses', data);
        return response.data;
    },

    updateCourse: async (id: string, data: CourseUpdate) => {
        const response = await apiClient.put(`/api/courses/${id}`, data);
        return response.data;
    },

    deleteCourse: async (id: string) => {
        // Handle 204 No Content response
        const response = await apiClient.delete(`/api/courses/${id}`);
        // 204 responses have no body, return success
        return response.status === 204 ? {} : response.data;
    },

    // Enrollment Management
    getEnrollments: async (courseId: string) => {
        const response = await apiClient.get(`/api/courses/${courseId}/enrollments`);
        return response.data;
    },

    enrollUser: async (courseId: string, data: EnrollmentCreate) => {
        const response = await apiClient.post(`/api/courses/${courseId}/enroll`, data);
        return response.data;
    },

    unenrollUser: async (courseId: string, enrollmentId: string) => {
        // Handle 204 No Content response
        const response = await apiClient.delete(`/api/courses/${courseId}/enrollments/${enrollmentId}`);
        // 204 responses have no body, return success
        return response.status === 204 ? {} : response.data;
    },
};
