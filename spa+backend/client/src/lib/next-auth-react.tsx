'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import api from './api';

interface User {
    id: string;
    email: string;
    name: string;
    role: 'athlete' | 'trainer' | 'admin';
    avatarUrl?: string;
}

interface Session {
    user: User;
    token: string;
}

interface AuthContextType {
    session: Session | null;
    status: 'loading' | 'authenticated' | 'unauthenticated';
    signIn: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
    signOut: () => void;
    register: (data: { email: string; password: string; name: string; role?: string }) => Promise<{ ok: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');

    // Check for existing session on mount
    useEffect(() => {
        const token = localStorage.getItem('auth_token');
        if (token) {
            api.getMe()
                .then((user) => {
                    setSession({ user, token });
                    setStatus('authenticated');
                })
                .catch(() => {
                    localStorage.removeItem('auth_token');
                    setStatus('unauthenticated');
                });
        } else {
            setStatus('unauthenticated');
        }
    }, []);

    const signIn = useCallback(async (email: string, password: string) => {
        try {
            const result = await api.login(email, password);
            localStorage.setItem('auth_token', result.token);
            setSession({ user: result.user, token: result.token });
            setStatus('authenticated');
            return { ok: true };
        } catch (error: any) {
            return { ok: false, error: error.message || 'Login failed' };
        }
    }, []);

    const signOut = useCallback(() => {
        localStorage.removeItem('auth_token');
        setSession(null);
        setStatus('unauthenticated');
    }, []);

    const register = useCallback(async (data: { email: string; password: string; name: string; role?: string }) => {
        try {
            const result = await api.register(data);
            localStorage.setItem('auth_token', result.token);
            setSession({ user: result.user, token: result.token });
            setStatus('authenticated');
            return { ok: true };
        } catch (error: any) {
            return { ok: false, error: error.message || 'Registration failed' };
        }
    }, []);

    return (
        <AuthContext.Provider value={{ session, status, signIn, signOut, register }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useSession() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        // Return a safe default for components outside SessionProvider
        return {
            data: null,
            status: 'unauthenticated' as const,
        };
    }
    return {
        data: context.session,
        status: context.status,
    };
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within a SessionProvider');
    }
    return context;
}

// Compatibility exports for next-auth patterns
export function signIn(provider?: string, options?: { email?: string; password?: string; redirect?: boolean }) {
    // This is a redirect-based signIn for compatibility
    // Real implementation should use useAuth().signIn()
    console.warn('signIn() called without context. Use useAuth().signIn() instead.');
    if (options?.email && options?.password) {
        return api.login(options.email, options.password)
            .then((result) => {
                localStorage.setItem('auth_token', result.token);
                if (options.redirect !== false) {
                    window.location.href = '/';
                }
                return { ok: true };
            })
            .catch((error) => ({ ok: false, error: error.message }));
    }
    return Promise.resolve({ ok: false, error: 'No credentials provided' });
}

export function signOut(options?: { redirect?: boolean }) {
    localStorage.removeItem('auth_token');
    if (options?.redirect !== false) {
        window.location.href = '/';
    }
}
