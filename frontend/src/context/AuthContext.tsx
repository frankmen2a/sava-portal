// /home/ubuntu/sava_portal/frontend/src/context/AuthContext.tsx
import React, { createContext, useState, useEffect, ReactNode, useCallback, useContext } from 'react';

interface User {
    id: string;
    name: string;
    email: string;
    paymentStatus: string; // Added payment status
}

interface AuthContextType {
    token: string | null;
    user: User | null;
    isLoading: boolean;
    login: (newToken: string, userData: User) => void;
    logout: () => void;
    updatePaymentStatus: (status: string) => void; // Function to update status locally
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [token, setToken] = useState<string | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        try {
            const storedToken = localStorage.getItem('authToken');
            const storedUser = localStorage.getItem('authUser');
            if (storedToken && storedUser) {
                const parsedUser = JSON.parse(storedUser);
                // TODO: Add token validation logic here
                setToken(storedToken);
                setUser(parsedUser);
            }
        } catch (error) {
            console.error("Failed to load auth state from local storage:", error);
            localStorage.removeItem('authToken');
            localStorage.removeItem('authUser');
        }
        setIsLoading(false);
    }, []);

    const login = useCallback((newToken: string, userData: User) => {
        try {
            localStorage.setItem('authToken', newToken);
            localStorage.setItem('authUser', JSON.stringify(userData));
            setToken(newToken);
            setUser(userData);
        } catch (error) {
            console.error("Failed to save auth state to local storage:", error);
        }
    }, []);

    const logout = useCallback(() => {
        try {
            localStorage.removeItem('authToken');
            localStorage.removeItem('authUser');
            setToken(null);
            setUser(null);
        } catch (error) {
            console.error("Failed to clear auth state from local storage:", error);
        }
    }, []);

    // Function to update payment status locally (e.g., after successful payment confirmation)
    const updatePaymentStatus = useCallback((status: string) => {
        setUser(currentUser => {
            if (currentUser) {
                const updatedUser = { ...currentUser, paymentStatus: status };
                try {
                    localStorage.setItem('authUser', JSON.stringify(updatedUser));
                } catch (error) {
                    console.error("Failed to update payment status in local storage:", error);
                }
                return updatedUser;
            }
            return null;
        });
    }, []);

    const contextValue = {
        token,
        user,
        isLoading,
        login,
        logout,
        updatePaymentStatus,
    };

    // Show loading indicator until auth state is loaded
    if (isLoading) {
        return <div>Loading application...</div>; // Or a proper spinner component
    }

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};

// Custom hook to use the auth context
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};

