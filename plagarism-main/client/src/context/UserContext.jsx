import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

const UserContext = createContext();

export const useUser = () => useContext(UserContext);

export const UserProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const initAuth = async () => {
            try {
                const token = localStorage.getItem('synabl_token');
                if (token) {
                    const userData = await authService.getCurrentUser(token);
                    setUser(userData);
                }
            } catch (err) {
                console.error("Auth error:", err);
                localStorage.removeItem('synabl_token');
            } finally {
                setLoading(false);
            }
        };

        initAuth();
    }, []);

    const login = async (email, password) => {
        try {
            setError(null);
            const { token, user: userData } = await authService.login(email, password);
            localStorage.setItem('synabl_token', token);
            setUser(userData);
            return userData;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };

    const register = async (name, email, password) => {
        try {
            setError(null);
            const { token, user: userData } = await authService.register(name, email, password);
            localStorage.setItem('synabl_token', token);
            setUser(userData);
            return userData;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };

    const logout = () => {
        localStorage.removeItem('synabl_token');
        setUser(null);
    };

    const incrementTrial = () => {
        if (user) {
            setUser((prev) => ({
                ...prev,
                trialsUsed: prev.trialsUsed + 1
            }));
        }
    };

    const trialsRemaining = user ? user.trialLimit - user.trialsUsed : 0;

    return (
        <UserContext.Provider value={{ user, loading, error, login, register, logout, trialsRemaining, incrementTrial }}>
            {children}
        </UserContext.Provider>
    );
};
