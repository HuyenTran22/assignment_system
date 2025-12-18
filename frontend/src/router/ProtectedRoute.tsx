import React from 'react';
import { Navigate } from 'react-router-dom';
import { Box, CircularProgress, Alert } from '@mui/material';
import { useAuthStore } from '@/shared/store/authStore';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

/**
 * Check if JWT token is expired
 * Returns true if token exists and is NOT expired (valid)
 */
const isTokenValid = (): boolean => {
    const token = localStorage.getItem('access_token');
    if (!token) return false;

    try {
        // Decode JWT payload (base64)
        const parts = token.split('.');
        if (parts.length !== 3) return false;

        const payload = JSON.parse(atob(parts[1]));
        const exp = payload.exp;

        if (!exp) return false;

        // Check if expired (exp is in seconds, Date.now() is in ms)
        const now = Math.floor(Date.now() / 1000);
        const isValid = exp > now;

        if (!isValid) {
            console.log('[ProtectedRoute] Token expired, clearing auth data');
            // Token expired - clear auth data
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('user');
        }

        return isValid;
    } catch (e) {
        console.error('[ProtectedRoute] Error parsing token:', e);
        return false;
    }
};

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
    const { isAuthenticated, isLoading, error, loadUser, logout } = useAuthStore();
    const [isValidating, setIsValidating] = React.useState(true);

    // Validate token on mount and try to load user
    React.useEffect(() => {
        const validateAndLoad = async () => {
            setIsValidating(true);

            // First check if token is valid (not expired)
            const tokenValid = isTokenValid();

            if (!tokenValid) {
                // Token invalid/expired - redirect will happen via !isAuthenticated check
                setIsValidating(false);
                return;
            }

            // Token valid, try to load user if not authenticated
            if (!isAuthenticated && !isLoading) {
                await loadUser();
            }

            setIsValidating(false);
        };

        validateAndLoad();
    }, [isAuthenticated, isLoading, loadUser]);

    // Show loading while validating token or checking authentication
    if (isValidating || isLoading) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: '100vh',
                    flexDirection: 'column',
                    gap: 2,
                }}
            >
                <CircularProgress />
            </Box>
        );
    }

    // Show error if authentication check failed
    if (error) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: '100vh',
                    p: 2,
                }}
            >
                <Alert severity="error" sx={{ maxWidth: 400 }}>
                    {error}
                </Alert>
            </Box>
        );
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
}

