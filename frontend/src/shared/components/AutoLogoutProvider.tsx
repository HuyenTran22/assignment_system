import { useAutoLogout } from '@/shared/hooks/useAutoLogout';

/**
 * Component wrapper that enables auto-logout functionality
 * Must be used inside a Router component
 */
export const AutoLogoutProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // This hook handles all the auto-logout logic
    useAutoLogout();

    return <>{children}</>;
};

export default AutoLogoutProvider;
