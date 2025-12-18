import axios from 'axios';

// Simple base URL for local development
// Use VITE_API_BASE_URL env var if set, otherwise use relative URL (goes through Vite proxy)
const getBaseURL = () => {
    const envUrl = import.meta.env.VITE_API_BASE_URL;
    if (envUrl && envUrl.trim() !== '') {
        return envUrl;
    }
    // Use empty string to use relative URLs (will go through Vite proxy)
    // Vite proxy will forward /auth/* and /api/* to http://127.0.0.1:8000
    return '';
};

// Track token refresh state to prevent multiple refresh attempts
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const subscribeTokenRefresh = (callback: (token: string) => void) => {
    refreshSubscribers.push(callback);
};

const onTokenRefreshed = (token: string) => {
    refreshSubscribers.forEach(callback => callback(token));
    refreshSubscribers = [];
};

const apiClient = axios.create({
    baseURL: getBaseURL(),
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
    // Handle 204 No Content responses - don't try to parse empty body as JSON
    validateStatus: (status) => {
        return status >= 200 && status < 300; // Accept 2xx status codes including 204
    },
    transformResponse: [(data) => {
        // If response is empty string (204 No Content), return null
        if (data === '' || data === null || data === undefined) {
            return null;
        }
        // Try to parse JSON, but handle empty strings gracefully
        try {
            return JSON.parse(data);
        } catch (e) {
            // If parsing fails and data is empty, return null (for 204 responses)
            if (!data || data.trim() === '') {
                return null;
            }
            // Otherwise, return the raw data
            return data;
        }
    }],
});

// Request interceptor - Add auth token
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        // Debug logging
        const fullURL = config.baseURL ? `${config.baseURL}${config.url}` : config.url;
        console.log('[API Request]', {
            method: config.method?.toUpperCase(),
            url: config.url,
            baseURL: config.baseURL || '(relative)',
            fullURL: fullURL,
            hasAuth: !!config.headers.Authorization,
        });
        return config;
    },
    (error) => {
        console.error('[API Request Error]', error);
        return Promise.reject(error);
    }
);

// Helper function to clear auth and redirect to login
const clearAuthAndRedirect = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    // Only redirect if not already on login page
    if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
    }
};

// Response interceptor - Handle errors, refresh token
apiClient.interceptors.response.use(
    (response) => {
        // Handle 204 No Content - empty response body
        // Ensure data is null for 204 responses to prevent JSON parsing errors
        if (response.status === 204) {
            response.data = null;
        }
        // Also handle case where data might be empty string or invalid JSON
        if (response.data === '' || response.data === undefined) {
            response.data = null;
        }
        // Debug logging
        console.log('[API Response]', {
            status: response.status,
            url: response.config.url,
            data: response.data
        });
        return response;
    },
    async (error) => {
        // Handle JSON parsing errors specifically
        if (error.message && error.message.includes('JSON') && error.message.includes('parse')) {
            // This is a JSON parsing error, likely from 204 response
            // Check if it's a 204 response that was incorrectly parsed
            if (error.response?.status === 204 || error.config?.method?.toLowerCase() === 'delete') {
                // Return a successful response with null data
                console.log('[API] Handling JSON parse error for 204/delete response');
                return {
                    status: 204,
                    statusText: 'No Content',
                    data: null,
                    headers: error.response?.headers || {},
                    config: error.config
                };
            }
        }

        // Debug logging
        console.error('[API Error]', {
            message: error.message,
            status: error.response?.status,
            statusText: error.response?.statusText,
            url: error.config?.url,
            baseURL: error.config?.baseURL || '(relative)',
            fullURL: error.config ? (error.config.baseURL ? `${error.config.baseURL}${error.config.url}` : error.config.url) : 'N/A',
            response: error.response?.data
        });
        const originalRequest = error.config;

        // Enhanced error handling
        if (error.response) {
            // Server responded with error status
            const { status, data } = error.response;

            // Prevent infinite retry loops - don't retry on certain status codes
            if (originalRequest._retry && (status === 503 || status === 500 || status === 404)) {
                // Already retried, don't retry again
                error.message = data?.detail || data?.message || `Request failed with status ${status}`;
                return Promise.reject(error);
            }

            switch (status) {
                case 400:
                    error.message = data?.detail || data?.message || 'Bad request. Please check your input.';
                    break;
                case 401:
                    // IMPORTANT: Don't try to refresh if this IS the refresh request
                    // This prevents infinite loop
                    const isRefreshRequest = originalRequest.url?.includes('/auth/refresh');

                    if (isRefreshRequest) {
                        // Refresh token failed - clear auth and redirect
                        console.log('[API] Refresh token failed, clearing auth and redirecting to login');
                        clearAuthAndRedirect();
                        error.message = 'Session expired. Please log in again.';
                        return Promise.reject(error);
                    }

                    // If 401 and not already retried, try refresh token
                    if (!originalRequest._retry) {
                        originalRequest._retry = true;

                        // If already refreshing, wait for the refresh to complete
                        if (isRefreshing) {
                            return new Promise((resolve) => {
                                subscribeTokenRefresh((token: string) => {
                                    originalRequest.headers.Authorization = `Bearer ${token}`;
                                    resolve(apiClient(originalRequest));
                                });
                            });
                        }

                        isRefreshing = true;

                        try {
                            const refreshToken = localStorage.getItem('refresh_token');
                            if (!refreshToken) {
                                // No refresh token available - redirect to login
                                console.log('[API] No refresh token available, redirecting to login');
                                clearAuthAndRedirect();
                                return Promise.reject(error);
                            }

                            // Use axios directly to avoid interceptor loop
                            const response = await axios.post(
                                `${getBaseURL()}/auth/refresh`,
                                { refresh_token: refreshToken },
                                { headers: { 'Content-Type': 'application/json' } }
                            );

                            const { access_token } = response.data;
                            localStorage.setItem('access_token', access_token);

                            // Notify all waiting requests
                            onTokenRefreshed(access_token);
                            isRefreshing = false;

                            // Retry original request
                            originalRequest.headers.Authorization = `Bearer ${access_token}`;
                            return apiClient(originalRequest);
                        } catch (refreshError: any) {
                            isRefreshing = false;
                            refreshSubscribers = [];

                            // Refresh failed, logout user
                            console.log('[API] Token refresh failed, clearing auth');
                            clearAuthAndRedirect();
                            return Promise.reject(refreshError);
                        }
                    }
                    error.message = 'Authentication required. Please log in again.';
                    break;
                case 403:
                    error.message = data?.detail || data?.message || 'You do not have permission to perform this action.';
                    break;
                case 404:
                    error.message = data?.detail || data?.message || 'The requested resource was not found.';
                    break;
                case 422:
                    error.message = data?.detail || data?.message || 'Invalid data provided.';
                    break;
                case 503:
                    error.message = data?.detail || data?.message || 'Service temporarily unavailable. Please try again later.';
                    break;
                case 500:
                    error.message = 'Server error. Please try again later.';
                    break;
                default:
                    error.message = data?.detail || data?.message || `Request failed with status ${status}`;
            }
        } else if (error.request) {
            // Network error
            error.message = 'Network error. Please check your internet connection.';
        } else {
            // Other error
            error.message = error.message || 'An unexpected error occurred.';
        }

        return Promise.reject(error);
    }
);

export default apiClient;
