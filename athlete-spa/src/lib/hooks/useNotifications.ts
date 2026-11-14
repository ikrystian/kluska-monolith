import { useState, useCallback, useEffect, useRef } from 'react';
import { useUser } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/api-client';

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

const PAGE_SIZE = 20;
/** Upper bound for the periodic refresh, so a long-scrolled list stays cheap to poll. */
const MAX_REFRESH = 100;

const idOf = (n: Notification) => n._id || n.id!;

export function useNotifications() {
    const { user } = useUser();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [total, setTotal] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasError, setHasError] = useState(false);

    // How many rows are on screen, so a refresh doesn't drop pages loaded with "show older".
    const loadedRef = useRef(0);
    loadedRef.current = notifications.length;

    const fetchNotifications = useCallback(async () => {
        if (!user) return;

        try {
            const limit = Math.min(MAX_REFRESH, Math.max(PAGE_SIZE, loadedRef.current));
            const res = await apiFetch(`/api/notifications?limit=${limit}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setNotifications(data.data);
            setUnreadCount(data.meta.unreadCount);
            setTotal(data.meta.total);
            setHasError(false);
        } catch (error) {
            console.error('Failed to fetch notifications', error);
            setHasError(true);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    const loadMore = useCallback(async () => {
        if (!user) return;
        setIsLoadingMore(true);
        try {
            const res = await apiFetch(`/api/notifications?limit=${PAGE_SIZE}&skip=${loadedRef.current}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setNotifications(prev => {
                const seen = new Set(prev.map(idOf));
                return [...prev, ...(data.data as Notification[]).filter(n => !seen.has(idOf(n)))];
            });
            setUnreadCount(data.meta.unreadCount);
            setTotal(data.meta.total);
        } catch (error) {
            console.error('Failed to load older notifications', error);
        } finally {
            setIsLoadingMore(false);
        }
    }, [user]);

    const patchRead = (id: string) =>
        apiFetch(`/api/notifications/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isRead: true }),
        });

    const markAsRead = async (id: string) => {
        const target = notifications.find(n => idOf(n) === id);
        if (!target || target.isRead) return;

        // Optimistic update
        setNotifications(prev => prev.map(n => (idOf(n) === id ? { ...n, isRead: true } : n)));
        setUnreadCount(prev => Math.max(0, prev - 1));

        try {
            await patchRead(id);
        } catch (error) {
            console.error('Failed to mark notification as read', error);
        }
        fetchNotifications(); // Sync, and revert on error
    };

    const markAllAsRead = async () => {
        const unreadIds = notifications.filter(n => !n.isRead).map(idOf);
        if (unreadCount === 0 && unreadIds.length === 0) return;

        setNotifications(prev => prev.map(n => (n.isRead ? n : { ...n, isRead: true })));
        setUnreadCount(0);

        try {
            const res = await apiFetch('/api/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isRead: true }),
            });
            // A backend without the bulk endpoint: fall back to marking the loaded ones one by one.
            if (!res.ok) await Promise.all(unreadIds.map(patchRead));
        } catch (error) {
            console.error('Failed to mark all notifications as read', error);
        }
        fetchNotifications();
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
        isLoadingMore,
        hasError,
        hasMore: notifications.length < total,
        markAsRead,
        markAllAsRead,
        loadMore,
        refetch: fetchNotifications,
    };
}
