import { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, Button, TextField, IconButton,
    CircularProgress, Alert, Avatar, Card, CardContent, Divider,
    Dialog, DialogTitle, DialogContent, DialogActions, Chip
} from '@mui/material';
import {
    ArrowBack, Edit, Delete, Reply, Person, Lock, LockOpen, Pin
} from '@mui/icons-material';
import AppLayout from '@/shared/components/Layout/AppLayout';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '@/shared/api/client';
import { useSnackbar } from 'notistack';
import { useAuthStore } from '@/shared/store/authStore';
import { DiscussionThreadDetail, DiscussionReply, DiscussionReplyCreate } from '../types/discussion.types';

export default function DiscussionThreadPage() {
    const { courseId, threadId } = useParams<{ courseId: string; threadId: string }>();
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();
    const { user } = useAuthStore();

    const [thread, setThread] = useState<DiscussionThreadDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [replyDialogOpen, setReplyDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [parentReplyId, setParentReplyId] = useState<string | null>(null);
    const [editingReply, setEditingReply] = useState<DiscussionReply | null>(null);
    const [replyContent, setReplyContent] = useState('');
    const [editContent, setEditContent] = useState('');

    useEffect(() => {
        if (threadId) {
            fetchThread();
        }
    }, [threadId]);

    const fetchThread = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get(`/api/courses/discussions/${threadId}`);
            setThread(response.data);
        } catch (error: any) {
            console.error('Failed to fetch thread:', error);
            enqueueSnackbar(error.message || 'Failed to load thread', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleReply = (parentId?: string) => {
        setParentReplyId(parentId || null);
        setReplyContent('');
        setReplyDialogOpen(true);
    };

    const handleSubmitReply = async () => {
        if (!thread) return;

        try {
            const replyData: DiscussionReplyCreate = {
                thread_id: thread.id,
                parent_reply_id: parentReplyId || undefined,
                content: replyContent
            };
            await apiClient.post(`/api/courses/discussions/${thread.id}/replies`, replyData);
            enqueueSnackbar('Reply posted successfully', { variant: 'success' });
            setReplyDialogOpen(false);
            setReplyContent('');
            setParentReplyId(null);
            fetchThread();
        } catch (error: any) {
            console.error('Failed to post reply:', error);
            enqueueSnackbar(error.message || 'Failed to post reply', { variant: 'error' });
        }
    };

    const handleEditReply = (reply: DiscussionReply) => {
        setEditingReply(reply);
        setEditContent(reply.content);
        setEditDialogOpen(true);
    };

    const handleUpdateReply = async () => {
        if (!editingReply) return;

        try {
            await apiClient.put(`/api/courses/replies/${editingReply.id}`, {
                content: editContent
            });
            enqueueSnackbar('Reply updated successfully', { variant: 'success' });
            setEditDialogOpen(false);
            setEditingReply(null);
            setEditContent('');
            fetchThread();
        } catch (error: any) {
            console.error('Failed to update reply:', error);
            enqueueSnackbar(error.message || 'Failed to update reply', { variant: 'error' });
        }
    };

    const handleDeleteReply = async (replyId: string) => {
        if (!window.confirm('Are you sure you want to delete this reply?')) {
            return;
        }

        if (!thread) return;
        
        // Optimistic update
        const previousReplies = [...thread.replies];
        thread.replies = thread.replies.filter(r => r.id !== replyId);

        try {
            await apiClient.delete(`/api/courses/replies/${replyId}`);
            enqueueSnackbar('Reply deleted successfully', { variant: 'success' });
            fetchThread(); // Refresh to ensure consistency
        } catch (error: any) {
            console.error('Failed to delete reply:', error);
            // Revert optimistic update
            if (thread) {
                thread.replies = previousReplies;
            }
            enqueueSnackbar(error.response?.data?.detail || error.message || 'Failed to delete reply', { variant: 'error' });
        }
    };

    const handleEditThread = async () => {
        if (!thread) return;

        try {
            await apiClient.put(`/api/courses/discussions/${thread.id}`, {
                title: thread.title,
                content: thread.content
            });
            enqueueSnackbar('Thread updated successfully', { variant: 'success' });
            fetchThread();
        } catch (error: any) {
            console.error('Failed to update thread:', error);
            enqueueSnackbar(error.message || 'Failed to update thread', { variant: 'error' });
        }
    };

    const handleDeleteThread = async () => {
        if (!thread) return;
        if (!window.confirm('Are you sure you want to delete this thread?')) {
            return;
        }

        try {
            await apiClient.delete(`/api/courses/discussions/${thread.id}`);
            enqueueSnackbar('Thread deleted successfully', { variant: 'success' });
            navigate(`/courses/${courseId}/discussions`);
        } catch (error: any) {
            console.error('Failed to delete thread:', error);
            enqueueSnackbar(error.message || 'Failed to delete thread', { variant: 'error' });
        }
    };

    const renderReply = (reply: DiscussionReply, depth: number = 0) => {
        const isAuthor = reply.user_id === user?.id;
        const isTeacher = user?.role === 'TEACHER' || user?.role === 'MANAGER' || user?.role === 'ADMIN';

        return (
            <Box key={reply.id} sx={{ ml: depth * 4, mb: 2 }}>
                <Card variant={depth > 0 ? 'outlined' : 'elevation'}>
                    <CardContent>
                        <Box display="flex" justifyContent="space-between" alignItems="start" mb={1}>
                            <Box display="flex" alignItems="center" gap={1}>
                                <Avatar sx={{ width: 32, height: 32 }}>
                                    <Person fontSize="small" />
                                </Avatar>
                                <Box>
                                    <Typography variant="subtitle2">
                                        {reply.author_name || 'Unknown'}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {new Date(reply.created_at).toLocaleString()}
                                    </Typography>
                                </Box>
                            </Box>
                            {(isAuthor || isTeacher) && (
                                <Box>
                                    {isAuthor && (
                                        <>
                                            <IconButton
                                                size="small"
                                                onClick={() => handleEditReply(reply)}
                                            >
                                                <Edit fontSize="small" />
                                            </IconButton>
                                            <IconButton
                                                size="small"
                                                color="error"
                                                onClick={() => handleDeleteReply(reply.id)}
                                            >
                                                <Delete fontSize="small" />
                                            </IconButton>
                                        </>
                                    )}
                                    {isTeacher && !isAuthor && (
                                        <IconButton
                                            size="small"
                                            color="error"
                                            onClick={() => handleDeleteReply(reply.id)}
                                        >
                                            <Delete fontSize="small" />
                                        </IconButton>
                                    )}
                                </Box>
                            )}
                        </Box>
                        <Typography variant="body1" paragraph sx={{ whiteSpace: 'pre-wrap' }}>
                            {reply.content}
                        </Typography>
                        {!thread?.is_locked && (
                            <Button
                                size="small"
                                startIcon={<Reply />}
                                onClick={() => handleReply(reply.id)}
                            >
                                Reply
                            </Button>
                        )}
                    </CardContent>
                </Card>
                {reply.child_replies && reply.child_replies.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                        {reply.child_replies.map((childReply) => renderReply(childReply, depth + 1))}
                    </Box>
                )}
            </Box>
        );
    };

    if (loading) {
        return (
            <AppLayout>
                <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                    <CircularProgress />
                </Box>
            </AppLayout>
        );
    }

    if (!thread) {
        return (
            <AppLayout>
                <Alert severity="error">Thread not found</Alert>
            </AppLayout>
        );
    }

    const isAuthor = thread.user_id === user?.id;
    const isTeacher = user?.role === 'TEACHER' || user?.role === 'MANAGER' || user?.role === 'ADMIN';

    return (
        <AppLayout>
            <Box p={3}>
                <Button
                    startIcon={<ArrowBack />}
                    onClick={() => navigate(`/courses/${courseId}/discussions`)}
                    sx={{ mb: 2 }}
                >
                    Back to Forum
                </Button>

                <Paper sx={{ p: 3, mb: 3 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                        <Box display="flex" alignItems="center" gap={1} flex={1}>
                            {thread.is_pinned && (
                                <Pin color="primary" fontSize="small" />
                            )}
                            {thread.is_locked && (
                                <Lock color="error" fontSize="small" />
                            )}
                            <Typography variant="h4" component="h1">
                                {thread.title}
                            </Typography>
                        </Box>
                        {(isAuthor || isTeacher) && (
                            <Box>
                                {isAuthor && (
                                    <>
                                        <IconButton onClick={handleEditThread}>
                                            <Edit />
                                        </IconButton>
                                        <IconButton color="error" onClick={handleDeleteThread}>
                                            <Delete />
                                        </IconButton>
                                    </>
                                )}
                                {isTeacher && (
                                    <IconButton
                                        onClick={async () => {
                                            try {
                                                await apiClient.put(`/api/courses/discussions/${thread.id}`, {
                                                    is_locked: !thread.is_locked
                                                });
                                                fetchThread();
                                            } catch (error: any) {
                                                enqueueSnackbar(error.message || 'Failed to update thread', { variant: 'error' });
                                            }
                                        }}
                                    >
                                        {thread.is_locked ? <LockOpen /> : <Lock />}
                                    </IconButton>
                                )}
                            </Box>
                        )}
                    </Box>

                    <Box display="flex" alignItems="center" gap={2} mb={2}>
                        <Avatar>
                            <Person />
                        </Avatar>
                        <Box>
                            <Typography variant="subtitle1">
                                {thread.author_name || 'Unknown'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {new Date(thread.created_at).toLocaleString()}
                            </Typography>
                        </Box>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mb: 2 }}>
                        {thread.content}
                    </Typography>

                    <Box display="flex" gap={1}>
                        <Chip label={`${thread.reply_count} replies`} size="small" />
                        <Chip label={`${thread.view_count} views`} size="small" />
                    </Box>
                </Paper>

                <Typography variant="h6" gutterBottom>
                    Replies ({thread.replies.length})
                </Typography>

                {thread.replies.length === 0 ? (
                    <Paper sx={{ p: 3, textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                            No replies yet. Be the first to reply!
                        </Typography>
                    </Paper>
                ) : (
                    <Box>
                        {thread.replies.map((reply) => renderReply(reply))}
                    </Box>
                )}

                {!thread.is_locked && (
                    <Box mt={3}>
                        <Button
                            variant="contained"
                            startIcon={<Reply />}
                            onClick={() => handleReply()}
                        >
                            Add Reply
                        </Button>
                    </Box>
                )}

                {thread.is_locked && (
                    <Alert severity="info" sx={{ mt: 2 }}>
                        This thread is locked. No new replies can be posted.
                    </Alert>
                )}

                {/* Reply Dialog */}
                <Dialog open={replyDialogOpen} onClose={() => setReplyDialogOpen(false)} maxWidth="md" fullWidth>
                    <DialogTitle>Post Reply</DialogTitle>
                    <DialogContent>
                        <TextField
                            fullWidth
                            multiline
                            rows={6}
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            placeholder="Write your reply..."
                            margin="normal"
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setReplyDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSubmitReply} variant="contained" disabled={!replyContent.trim()}>
                            Post Reply
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Edit Reply Dialog */}
                <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
                    <DialogTitle>Edit Reply</DialogTitle>
                    <DialogContent>
                        <TextField
                            fullWidth
                            multiline
                            rows={6}
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            margin="normal"
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleUpdateReply} variant="contained" disabled={!editContent.trim()}>
                            Update
                        </Button>
                    </DialogActions>
                </Dialog>
            </Box>
        </AppLayout>
    );
}

