'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export interface Notification {
    _id: string; // Changed from id to _id to match API/Model
    id?: string; // For backward compatibility if needed in UI
    userId: string;
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message: string;
    link?: string;
    isRead: boolean;
    createdAt: string;
}

export function useNotifications() {
    const { data: session } = useSession();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    const fetchNotifications = useCallback(async () => {
        if (!session?.user) return;

        try {
            // Fetch unread count specifically or all relevant ones?
            // Let's fetch recent 20 + unread count
            const res = await fetch('/api/notifications?limit=20');
            if (res.ok) {
                const data = await res.json();
                setNotifications(data.data);
                setUnreadCount(data.meta.unreadCount);
            }
        } catch (error) {
            console.error('Failed to fetch notifications', error);
        }
    }, [session]);

    const markAsRead = async (id: string) => {
        try {
            // Optimistic update
            setNotifications(prev =>
                prev.map(n => (n._id === id || n.id === id) ? { ...n, isRead: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));

            await fetch(`/api/notifications/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isRead: true }),
            });
            // Re-fetch to ensure sync? Not strictly needed if optimistic works
            fetchNotifications();
        } catch (error) {
            console.error('Failed to mark notification as read', error);
            fetchNotifications(); // Revert on error
        }
    };

    const markAllAsRead = async () => {
        // TODO: Implement endpoint for bulk update if needed, for now iterate or simple loop
        // Implementation for later optimization
    };

    useEffect(() => {
        fetchNotifications();
        // Poll every 60 seconds
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    return {
        notifications,
        unreadCount,
        isLoading,
        markAsRead,
        refetch: fetchNotifications
    };
}
