import { useState } from 'react';
import { authService } from '../api/authService';

const useAuth = () => {
    // In a real app, you might initialize the user from localStorage or a cookie
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleAuthAction = async (action, credentials) => {
        setLoading(true);
        try {
            const userData = await action(credentials);
            setUser(userData);
            return userData;
        } catch (error) {
            setUser(null);
            throw error; // Re-throw error to be caught by the component
        } finally {
            setLoading(false);
        }
    };
    
    const login = (credentials) => handleAuthAction(authService.login, credentials);
    const register = (credentials) => handleAuthAction(authService.register, credentials);
    
    const logout = async () => {
        setLoading(true);
        await authService.logout();
        setUser(null);
        setLoading(false);
    };

    return { user, loading, login, register, logout };
};

export default useAuth;