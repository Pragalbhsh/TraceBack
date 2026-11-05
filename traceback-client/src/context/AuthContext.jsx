import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, setUnauthorizedHandler, tokenStore } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(Boolean(tokenStore.get()));

    const logout = useCallback(() => {
        tokenStore.clear();
        setUser(null);
    }, []);

    useEffect(() => {
        setUnauthorizedHandler(logout);
        if (!tokenStore.get()) return;
        api('/auth/me')
            .then(({ user }) => setUser(user))
            .catch((err) => {
                if (err.status === 401) logout();
            })
            .finally(() => setLoading(false));
    }, [logout]);

    const finish = ({ token, user }) => {
        tokenStore.set(token);
        setUser(user);
        return user;
    };

    const value = useMemo(
        () => ({
            user,
            loading,
            login: (email, password) => api('/auth/login', { method: 'POST', body: { email, password } }).then(finish),
            register: (name, email, password) =>
                api('/auth/register', { method: 'POST', body: { name, email, password } }).then(finish),
            updateMe: (changes) => api('/auth/me', { method: 'PATCH', body: changes }).then(({ user }) => setUser(user)),
            logout,
        }),
        [user, loading, logout]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
