import { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, Button, Card, CardContent, CardActions,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField,
    IconButton, CircularProgress, Alert, Chip, Avatar
} from '@mui/material';
import {
    Add, Edit, Delete, Forum, Pin, Lock, LockOpen, Visibility,
    Message, Person
} from '@mui/icons-material';
import AppLayout from '@/shared/components/Layout/AppLayout';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '@/shared/api/client';
import { useSnackbar } from 'notistack';
import { useAuthStore } from '@/shared/store/authStore';
import { DiscussionThread, DiscussionThreadCreate } from '../types/discussion.types';

export default function DiscussionForumPage() {
    const { courseId } = useParams<{ courseId: string }>();
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();
    const { user } = useAuthStore();

    const [threads, setThreads] = useState<DiscussionThread[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [formData, setFormData] = useState<DiscussionThreadCreate>({
        course_id: courseId || '',
        title: '',
        content: ''
    });

    useEffect(() => {
        if (courseId) {
            fetchThreads();
        }
    }, [courseId]);

    const fetchThreads = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get(`/api/courses/${courseId}/discussions`);
            setThreads(response.data);
        } catch (error: any) {
            console.error('Failed to fetch threads:', error);
            enqueueSnackbar(error.message || 'Failed to load discussions', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = () => {
        setFormData({
            course_id: courseId || '',
            title: '',
            content: ''
        });
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
    };

    const handleSubmit = async () => {
        try {
            await apiClient.post(`/api/courses/${courseId}/discussions`, formData);
            enqueueSnackbar('Thread created successfully', { variant: 'success' });
            handleCloseDialog();
            fetchThreads();
        } catch (error: any) {
            console.error('Failed to create thread:', error);
            enqueueSnackbar(error.message || 'Failed to create thread', { variant: 'error' });
        }
    };

    const handleDelete = async (threadId: string) => {
        if (!window.confirm('Are you sure you want to delete this thread?')) {
            return;
        }

        // Optimistic update
        const previousThreads = [...threads];
        setThreads(threads.filter(t => t.id !== threadId));

        try {
            await apiClient.delete(`/api/courses/discussions/${threadId}`);
            enqueueSnackbar('Thread deleted successfully', { variant: 'success' });
            fetchThreads(); // Refresh to ensure consistency
        } catch (error: any) {
            console.error('Failed to delete thread:', error);
            // Revert optimistic update
            setThreads(previousThreads);
            enqueueSnackbar(error.response?.data?.detail || error.message || 'Failed to delete thread', { variant: 'error' });
        }
    };

    const handleTogglePin = async (thread: DiscussionThread) => {
        try {
            await apiClient.put(`/api/courses/discussions/${thread.id}`, {
                is_pinned: !thread.is_pinned
            });
            enqueueSnackbar(`Thread ${thread.is_pinned ? 'unpinned' : 'pinned'}`, { variant: 'success' });
            fetchThreads();
        } catch (error: any) {
            console.error('Failed to toggle pin:', error);
            enqueueSnackbar(error.message || 'Failed to update thread', { variant: 'error' });
        }
    };

    const handleToggleLock = async (thread: DiscussionThread) => {
        try {
            await apiClient.put(`/api/courses/discussions/${thread.id}`, {
                is_locked: !thread.is_locked
            });
            enqueueSnackbar(`Thread ${thread.is_locked ? 'unlocked' : 'locked'}`, { variant: 'success' });
            fetchThreads();
        } catch (error: any) {
            console.error('Failed to toggle lock:', error);
            enqueueSnackbar(error.message || 'Failed to update thread', { variant: 'error' });
        }
    };

    const isTeacher = user?.role === 'TEACHER' || user?.role === 'MANAGER' || user?.role === 'ADMIN';

    if (loading) {
        return (
            <AppLayout>
                <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                    <CircularProgress />
                </Box>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <Box p={3}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                    <Typography variant="h4" component="h1">
                        Discussion Forum
                    </Typography>
                    <Button
                        variant="contained"
                        startIcon={<Add />}
                        onClick={handleOpenDialog}
                    >
                        New Thread
                    </Button>
                </Box>

                {threads.length === 0 ? (
                    <Paper sx={{ p: 4, textAlign: 'center' }}>
                        <Forum sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                        <Typography variant="h6" color="text.secondary" gutterBottom>
                            No discussions yet
                        </Typography>
                        <Typography variant="body2" color="text.secondary" mb={2}>
                            Start a new discussion thread
                        </Typography>
                    </Paper>
                ) : (
                    <Box>
                        {threads.map((thread) => (
                            <Card key={thread.id} sx={{ mb: 2 }}>
                                <CardContent>
                                    <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                                        <Box display="flex" alignItems="center" gap={1} flex={1}>
                                            {thread.is_pinned && (
                                                <Pin color="primary" fontSize="small" />
                                            )}
                                            {thread.is_locked && (
                                                <Lock color="error" fontSize="small" />
                                            )}
                                            <Typography
                                                variant="h6"
                                                component="h2"
                                                sx={{
                                                    cursor: 'pointer',
                                                    '&:hover': { textDecoration: 'underline' }
                                                }}
                                                onClick={() => navigate(`/courses/${courseId}/discussions/${thread.id}`)}
                                            >
                                                {thread.title}
                                            </Typography>
                                        </Box>
                                        {(isTeacher || thread.user_id === user?.id) && (
                                            <Box>
                                                {isTeacher && (
                                                    <>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleTogglePin(thread)}
                                                            color={thread.is_pinned ? 'primary' : 'default'}
                                                        >
                                                            <Pin />
                                                        </IconButton>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleToggleLock(thread)}
                                                            color={thread.is_locked ? 'error' : 'default'}
                                                        >
                                                            {thread.is_locked ? <Lock /> : <LockOpen />}
                                                        </IconButton>
                                                    </>
                                                )}
                                                {thread.user_id === user?.id && (
                                                    <IconButton
                                                        size="small"
                                                        color="error"
                                                        onClick={() => handleDelete(thread.id)}
                                                    >
                                                        <Delete />
                                                    </IconButton>
                                                )}
                                            </Box>
                                        )}
                                    </Box>

                                    <Typography
                                        variant="body2"
                                        color="text.secondary"
                                        paragraph
                                        sx={{
                                            display: '-webkit-box',
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical',
                                            overflow: 'hidden'
                                        }}
                                    >
                                        {thread.content}
                                    </Typography>

                                    <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
                                        <Box display="flex" alignItems="center" gap={0.5}>
                                            <Avatar sx={{ width: 24, height: 24 }}>
                                                <Person fontSize="small" />
                                            </Avatar>
                                            <Typography variant="caption" color="text.secondary">
                                                {thread.author_name || 'Unknown'}
                                            </Typography>
                                        </Box>
                                        <Chip
                                            icon={<Message />}
                                            label={thread.reply_count}
                                            size="small"
                                        />
                                        <Chip
                                            icon={<Visibility />}
                                            label={thread.view_count}
                                            size="small"
                                        />
                                        <Typography variant="caption" color="text.secondary">
                                            {new Date(thread.created_at).toLocaleString()}
                                        </Typography>
                                    </Box>
                                </CardContent>
                                <CardActions>
                                    <Button
                                        size="small"
                                        onClick={() => navigate(`/courses/${courseId}/discussions/${thread.id}`)}
                                    >
                                        View Thread
                                    </Button>
                                </CardActions>
                            </Card>
                        ))}
                    </Box>
                )}

                {/* Create Thread Dialog */}
                <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
                    <DialogTitle>Create New Thread</DialogTitle>
                    <DialogContent>
                        <Box sx={{ pt: 2 }}>
                            <TextField
                                fullWidth
                                label="Title"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                margin="normal"
                                required
                            />
                            <TextField
                                fullWidth
                                label="Content"
                                value={formData.content}
                                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                margin="normal"
                                required
                                multiline
                                rows={6}
                            />
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseDialog}>Cancel</Button>
                        <Button onClick={handleSubmit} variant="contained" disabled={!formData.title || !formData.content}>
                            Create
                        </Button>
                    </DialogActions>
                </Dialog>
            </Box>
        </AppLayout>
    );
}

