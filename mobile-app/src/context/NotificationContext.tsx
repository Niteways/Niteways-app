import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import { authService } from '../services/auth';

interface Notification {
    id: string;
    title: string;
    message: string;
    type: string;
    isRead: boolean;
    createdAt: string;
}

interface NotificationContextType {
    notifications: Notification[];
    unreadCount: number;
    markAllAsRead: () => void;
    markAsRead: (id: string) => void;
    refreshNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const NOTIFICATIONS_CACHE_KEY = '@notifications_cache';

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);

    const loadNotifications = useCallback(async () => {
        try {
            // Get current user
            const user = await authService.getStoredUser();
            if (!user) {
                // No user logged in, clear notifications
                setNotifications([]);
                return;
            }

            // Fetch from API
            const response = await api.get(`/notifications/user/${user.id}`);
            const apiNotifications: Notification[] = response.data.map((n: any) => ({
                id: n.id,
                title: n.title,
                message: n.message,
                type: n.type || 'system',
                isRead: n.isRead || false,
                createdAt: n.createdAt,
            }));

            setNotifications(apiNotifications);

            // Cache locally
            await AsyncStorage.setItem(NOTIFICATIONS_CACHE_KEY, JSON.stringify(apiNotifications));
        } catch (error) {
            console.log('Could not load notifications from API, using cache:', error);
            // Fallback to local cache
            try {
                const cached = await AsyncStorage.getItem(NOTIFICATIONS_CACHE_KEY);
                if (cached) {
                    setNotifications(JSON.parse(cached));
                }
            } catch (cacheError) {
                console.error('Error loading notifications cache:', cacheError);
            }
        }
    }, []);

    useEffect(() => {
        loadNotifications();
    }, [loadNotifications]);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    const markAllAsRead = useCallback(async () => {
        // Optimistic update
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));

        // Call API for each unread notification
        const unread = notifications.filter(n => !n.isRead);
        try {
            await Promise.all(
                unread.map(n => api.patch(`/notifications/${n.id}/read`))
            );

            // Update cache
            const updated = notifications.map(n => ({ ...n, isRead: true }));
            await AsyncStorage.setItem(NOTIFICATIONS_CACHE_KEY, JSON.stringify(updated));
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    }, [notifications]);

    const markAsRead = useCallback(async (id: string) => {
        // Optimistic update
        setNotifications(prev =>
            prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
        );

        try {
            await api.patch(`/notifications/${id}/read`);

            // Update cache
            const updated = notifications.map(n =>
                n.id === id ? { ...n, isRead: true } : n
            );
            await AsyncStorage.setItem(NOTIFICATIONS_CACHE_KEY, JSON.stringify(updated));
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    }, [notifications]);

    return (
        <NotificationContext.Provider
            value={{
                notifications,
                unreadCount,
                markAllAsRead,
                markAsRead,
                refreshNotifications: loadNotifications,
            }}
        >
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};
