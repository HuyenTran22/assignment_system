import { useState, useEffect } from 'react';
import { Box, Typography, List, ListItem, ListItemText, ListItemAvatar, Avatar, Chip, CircularProgress, Alert, Button } from '@mui/material';
import { Notifications as NotificationsIcon, Assignment, Grade, CheckCircle, NotificationsActive } from '@mui/icons-material';
import AppLayout from '@/shared/components/Layout/AppLayout';
import apiClient from '@/shared/api/client';
import { useSnackbar } from 'notistack';

interface Notification {
    id: string;
    type: string;
    title: string;
    message: string;
    is_read: boolean;
    created_at: string;
}

export default function NotificationsPage() {
    const { enqueueSnackbar } = useSnackbar();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [browserNotificationsEnabled, setBrowserNotificationsEnabled] = useState(false);

    // Request browser notification permission
    useEffect(() => {
        const requestNotificationPermission = async () => {
            if ('Notification' in window) {
                if (Notification.permission === 'granted') {
                    setBrowserNotificationsEnabled(true);
                } else if (Notification.permission !== 'denied') {
                    try {
                        const permission = await Notification.requestPermission();
                        if (permission === 'granted') {
                            setBrowserNotificationsEnabled(true);
                            enqueueSnackbar('Browser notifications enabled!', { variant: 'success' });
                        }
                    } catch (error) {
                        console.error('Failed to request notification permission:', error);
                    }
                }
            }
        };

        requestNotificationPermission();
    }, [enqueueSnackbar]);

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const response = await apiClient.get('/api/notifications?limit=100');
                // Handle both response formats: {items: []} or direct array
                const items = response?.data?.items || response?.data || [];
                setNotifications(Array.isArray(items) ? items : []);
                
                // Show browser notification for unread items
                if (browserNotificationsEnabled && Notification.permission === 'granted') {
                    const unreadItems = Array.isArray(items) ? items.filter((n: Notification) => !n.is_read) : [];
                    if (unreadItems.length > 0) {
                        const latestNotif = unreadItems[0];
                        new Notification(latestNotif.title, {
                            body: latestNotif.message,
                            icon: '/favicon.ico',
                            badge: '/favicon.ico'
                        });
                    }
                }
            } catch (err: any) {
                console.error('Failed to fetch notifications:', err);
                const errorMessage = err?.response?.data?.detail || err?.message || 'Failed to load notifications. Please try again later.';
                setError(errorMessage);
                setNotifications([]);
            } finally {
                setLoading(false);
            }
        };

        fetchNotifications();
        
        // Poll for new notifications every 30 seconds
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, [browserNotificationsEnabled]);

    const markAsRead = async (id: string) => {
        try {
            await apiClient.put(`/api/notifications/${id}/read`);
            setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
        } catch (err) {
            enqueueSnackbar('Failed to mark notification as read', { variant: 'error' });
        }
    };

    const markAllAsRead = async () => {
        try {
            await apiClient.put('/api/notifications/read-all');
            setNotifications(notifications.map(n => ({ ...n, is_read: true })));
            enqueueSnackbar('All notifications marked as read', { variant: 'success' });
        } catch (err) {
            enqueueSnackbar('Failed to mark all as read', { variant: 'error' });
        }
    };

    const enableBrowserNotifications = async () => {
        if ('Notification' in window && Notification.permission !== 'granted') {
            try {
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    setBrowserNotificationsEnabled(true);
                    enqueueSnackbar('Browser notifications enabled!', { variant: 'success' });
                } else {
                    enqueueSnackbar('Notification permission denied', { variant: 'warning' });
                }
            } catch (error) {
                enqueueSnackbar('Failed to enable notifications', { variant: 'error' });
            }
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'GRADE': return <Grade />;
            case 'ASSIGNMENT_CREATED': return <Assignment />;
            default: return <NotificationsIcon />;
        }
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        return date.toLocaleDateString();
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return (
        <AppLayout>
            <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography variant="h4" fontWeight="bold">
                            Notifications
                        </Typography>
                        {unreadCount > 0 && (
                            <Chip label={`${unreadCount} unread`} color="error" size="small" />
                        )}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        {!browserNotificationsEnabled && (
                            <Button 
                                variant="outlined" 
                                startIcon={<NotificationsActive />}
                                onClick={enableBrowserNotifications}
                                size="small"
                            >
                                Enable Browser Alerts
                            </Button>
                        )}
                        {unreadCount > 0 && (
                            <Button
                                variant="contained"
                                startIcon={<CheckCircle />}
                                onClick={markAllAsRead}
                                size="small"
                            >
                                Mark All Read
                            </Button>
                        )}
                    </Box>
                </Box>

                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : error ? (
                    <Alert severity="error">{error}</Alert>
                ) : (
                    <List>
                        {notifications.map((notification) => (
                            <ListItem
                                key={notification.id}
                                sx={{
                                    bgcolor: notification.is_read ? 'transparent' : 'action.hover',
                                    borderRadius: 1,
                                    mb: 1,
                                    cursor: notification.is_read ? 'default' : 'pointer',
                                }}
                                onClick={() => !notification.is_read && markAsRead(notification.id)}
                                secondaryAction={
                                    !notification.is_read && (
                                        <Chip label="New" color="primary" size="small" />
                                    )
                                }
                            >
                                <ListItemAvatar>
                                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                                        {getIcon(notification.type)}
                                    </Avatar>
                                </ListItemAvatar>
                                <ListItemText
                                    primary={notification.title}
                                    secondary={
                                        <>
                                            <Typography variant="body2" component="span">
                                                {notification.message}
                                            </Typography>
                                            <br />
                                            <Typography variant="caption" color="text.secondary">
                                                {formatTime(notification.created_at)}
                                            </Typography>
                                        </>
                                    }
                                />
                            </ListItem>
                        ))}
                        {notifications.length === 0 && (
                            <Alert severity="info">No notifications yet.</Alert>
                        )}
                    </List>
                )}
            </Box>
        </AppLayout>
    );
}
