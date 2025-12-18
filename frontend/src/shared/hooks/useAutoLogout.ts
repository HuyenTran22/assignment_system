import { useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { useLocation } from 'react-router-dom';

// Inactivity timeout in milliseconds (2 minutes = 120000ms)
const INACTIVITY_TIMEOUT = 2 * 60 * 1000;

// Events that reset the inactivity timer
const ACTIVITY_EVENTS = [
    'mousedown',
    'mousemove',
    'keydown',
    'scroll',
    'touchstart',
    'click',
    'focus'
];

/**
 * Hook to automatically logout user after inactivity period
 * EXCEPTION: Does not logout if user is in a live class session
 */
export const useAutoLogout = () => {
    const { isAuthenticated, logout } = useAuthStore();
    const location = useLocation();
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastActivityRef = useRef<number>(Date.now());

    // Check if user is currently in a live class
    const isInLiveClass = useCallback(() => {
        // Check if current route is a live class or video call
        const liveClassPatterns = [
            '/courses/*/live',
            '/live-class',
            '/video-call',
            '/meeting'
        ];

        const currentPath = location.pathname;

        // Check URL patterns
        const isLiveClassRoute = liveClassPatterns.some(pattern => {
            const regex = new RegExp(pattern.replace('*', '[^/]+'));
            return regex.test(currentPath);
        });

        // Also check if there's an active WebRTC/video session
        // This can be extended to check actual video call state
        const hasActiveSession = localStorage.getItem('active_live_session') === 'true';

        return isLiveClassRoute || hasActiveSession;
    }, [location.pathname]);

    // Perform logout
    const performLogout = useCallback(() => {
        // Don't logout if in live class
        if (isInLiveClass()) {
            console.log('[AutoLogout] Skipping auto-logout: user is in live class');
            return;
        }

        console.log('[AutoLogout] Auto-logging out due to inactivity');

        // Clear all auth data
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        localStorage.removeItem('last_activity');

        // Call logout from store
        logout();

        // Redirect to login with message
        window.location.href = '/login?reason=inactivity';
    }, [logout, isInLiveClass]);

    // Reset the inactivity timer
    const resetTimer = useCallback(() => {
        const now = Date.now();
        lastActivityRef.current = now;
        localStorage.setItem('last_activity', now.toString());

        // Clear existing timeouts
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        if (warningTimeoutRef.current) {
            clearTimeout(warningTimeoutRef.current);
        }

        // Don't set new timer if not authenticated or in live class
        if (!isAuthenticated || isInLiveClass()) {
            return;
        }

        // Set new logout timer
        timeoutRef.current = setTimeout(() => {
            performLogout();
        }, INACTIVITY_TIMEOUT);

        // Optional: Show warning 30 seconds before logout
        // warningTimeoutRef.current = setTimeout(() => {
        //     console.log('[AutoLogout] Warning: You will be logged out in 30 seconds due to inactivity');
        // }, INACTIVITY_TIMEOUT - 30000);
    }, [isAuthenticated, isInLiveClass, performLogout]);

    // Handle visibility change (tab becomes visible)
    const handleVisibilityChange = useCallback(() => {
        if (document.visibilityState === 'visible' && isAuthenticated) {
            // Check if session should have expired while tab was hidden
            const lastActivity = localStorage.getItem('last_activity');
            if (lastActivity) {
                const elapsed = Date.now() - parseInt(lastActivity, 10);
                if (elapsed > INACTIVITY_TIMEOUT && !isInLiveClass()) {
                    console.log('[AutoLogout] Session expired while tab was hidden');
                    performLogout();
                    return;
                }
            }
            // Reset timer on tab focus
            resetTimer();
        }
    }, [isAuthenticated, isInLiveClass, performLogout, resetTimer]);

    // Set up event listeners
    useEffect(() => {
        if (!isAuthenticated) {
            // Clear timers when not authenticated
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
            return;
        }

        // Handler for activity events
        const handleActivity = () => {
            resetTimer();
        };

        // Add activity event listeners
        ACTIVITY_EVENTS.forEach(event => {
            window.addEventListener(event, handleActivity, { passive: true });
        });

        // Add visibility change listener
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Initialize timer
        resetTimer();

        // Cleanup
        return () => {
            ACTIVITY_EVENTS.forEach(event => {
                window.removeEventListener(event, handleActivity);
            });
            document.removeEventListener('visibilitychange', handleVisibilityChange);

            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
        };
    }, [isAuthenticated, resetTimer, handleVisibilityChange]);

    // Check session on mount and when returning to tab
    useEffect(() => {
        if (isAuthenticated) {
            const lastActivity = localStorage.getItem('last_activity');
            if (lastActivity) {
                const elapsed = Date.now() - parseInt(lastActivity, 10);
                if (elapsed > INACTIVITY_TIMEOUT && !isInLiveClass()) {
                    console.log('[AutoLogout] Session already expired on mount');
                    performLogout();
                }
            }
        }
    }, [isAuthenticated, isInLiveClass, performLogout]);

    return {
        resetTimer,
        isInLiveClass: isInLiveClass()
    };
};

export default useAutoLogout;
