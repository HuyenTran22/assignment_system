import { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, Button, Grid, Card, CardContent, CardActions,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField,
    IconButton, CircularProgress, Alert, Chip, MenuItem, Select,
    FormControl, InputLabel
} from '@mui/material';
import {
    Add, Edit, Delete, VideoCall, AccessTime, People, PlayArrow,
    Stop, Lock, CheckCircle, Cancel, Visibility, History
} from '@mui/icons-material';
import AppLayout from '@/shared/components/Layout/AppLayout';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '@/shared/api/client';
import { useSnackbar } from 'notistack';
import { useAuthStore } from '@/shared/store/authStore';
import { LiveSession, LiveSessionCreate, LiveSessionUpdate } from '../types/live-class.types';

export default function LiveClassesPage() {
    const { courseId } = useParams<{ courseId: string }>();
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();
    const { user } = useAuthStore();
    const isTeacher = user?.role === 'TEACHER' || user?.role === 'MANAGER' || user?.role === 'ADMIN';

    const [sessions, setSessions] = useState<LiveSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingSession, setEditingSession] = useState<LiveSession | null>(null);
    const [formData, setFormData] = useState<LiveSessionCreate>({
        course_id: courseId || '',
        title: '',
        description: '',
        meeting_url: '',
        meeting_id: '',
        meeting_password: '',
        scheduled_start: '',
        scheduled_end: '',
        max_participants: undefined,
        is_recorded: false
    });

    useEffect(() => {
        if (courseId) {
            fetchSessions();
        }
    }, [courseId, statusFilter]);

    const fetchSessions = async () => {
        try {
            setLoading(true);
            const params = statusFilter ? { status_filter: statusFilter } : {};
            const response = await apiClient.get(`/api/courses/${courseId}/live-sessions`, { params });
            setSessions(response.data);
        } catch (error: any) {
            console.error('Failed to fetch sessions:', error);
            enqueueSnackbar(error.message || 'Failed to load live sessions', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = (session?: LiveSession) => {
        if (session) {
            setEditingSession(session);
            setFormData({
                course_id: session.course_id,
                title: session.title,
                description: session.description || '',
                meeting_url: session.meeting_url || '',
                meeting_id: session.meeting_id || '',
                meeting_password: session.meeting_password || '',
                scheduled_start: new Date(session.scheduled_start).toISOString().slice(0, 16),
                scheduled_end: new Date(session.scheduled_end).toISOString().slice(0, 16),
                max_participants: session.max_participants,
                is_recorded: session.is_recorded
            });
        } else {
            setEditingSession(null);
            setFormData({
                course_id: courseId || '',
                title: '',
                description: '',
                meeting_url: '',
                meeting_id: '',
                meeting_password: '',
                scheduled_start: '',
                scheduled_end: '',
                max_participants: undefined,
                is_recorded: false
            });
        }
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setEditingSession(null);
    };

    const handleSubmit = async () => {
        try {
            const submitData = {
                ...formData,
                scheduled_start: new Date(formData.scheduled_start).toISOString(),
                scheduled_end: new Date(formData.scheduled_end).toISOString()
            };

            if (editingSession) {
                await apiClient.put(`/api/courses/live-sessions/${editingSession.id}`, submitData);
                enqueueSnackbar('Session updated successfully', { variant: 'success' });
            } else {
                await apiClient.post(`/api/courses/${courseId}/live-sessions`, submitData);
                enqueueSnackbar('Session created successfully', { variant: 'success' });
            }
            handleCloseDialog();
            fetchSessions();
        } catch (error: any) {
            console.error('Failed to save session:', error);
            enqueueSnackbar(error.message || 'Failed to save session', { variant: 'error' });
        }
    };

    const handleDelete = async (sessionId: string) => {
        if (!window.confirm('Are you sure you want to delete this session?')) {
            return;
        }

        // Optimistic update
        const previousSessions = [...sessions];
        setSessions(sessions.filter(s => s.id !== sessionId));

        try {
            await apiClient.delete(`/api/courses/live-sessions/${sessionId}`);
            enqueueSnackbar('Session deleted successfully', { variant: 'success' });
            fetchSessions(); // Refresh to ensure consistency
        } catch (error: any) {
            console.error('Failed to delete session:', error);
            // Revert optimistic update
            setSessions(previousSessions);
            enqueueSnackbar(error.response?.data?.detail || error.message || 'Failed to delete session', { variant: 'error' });
        }
    };

    const handleStartSession = async (sessionId: string) => {
        try {
            await apiClient.post(`/api/courses/live-sessions/${sessionId}/start`);
            enqueueSnackbar('Session started', { variant: 'success' });
            fetchSessions();
        } catch (error: any) {
            console.error('Failed to start session:', error);
            enqueueSnackbar(error.message || 'Failed to start session', { variant: 'error' });
        }
    };

    const handleEndSession = async (sessionId: string) => {
        try {
            await apiClient.post(`/api/courses/live-sessions/${sessionId}/end`);
            enqueueSnackbar('Session ended', { variant: 'success' });
            fetchSessions();
        } catch (error: any) {
            console.error('Failed to end session:', error);
            enqueueSnackbar(error.message || 'Failed to end session', { variant: 'error' });
        }
    };

    const handleJoinSession = (sessionId: string) => {
        navigate(`/courses/${courseId}/live-sessions/${sessionId}`);
    };

    // Direct join - skip detail page and go straight to video call
    const handleJoinNow = async (sessionId: string) => {
        try {
            // Record attendance
            await apiClient.post(`/api/courses/live-sessions/${sessionId}/join`);
            enqueueSnackbar('Joined live session', { variant: 'success' });
            // Mark active session for auto-logout exception
            localStorage.setItem('active_live_session', 'true');
            // Navigate directly to video call
            navigate(`/courses/${courseId}/video-call`);
        } catch (error: any) {
            console.error('Failed to join session:', error);
            enqueueSnackbar(error.message || 'Failed to join session', { variant: 'error' });
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'scheduled':
                return 'default';
            case 'ongoing':
                return 'success';
            case 'completed':
                return 'info';
            case 'cancelled':
                return 'error';
            default:
                return 'default';
        }
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

    return (
        <AppLayout>
            <Box p={3}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                    <Typography variant="h4" component="h1">
                        Live Classes
                    </Typography>
                    {isTeacher && (
                        <Button
                            variant="contained"
                            startIcon={<Add />}
                            onClick={() => handleOpenDialog()}
                        >
                            Schedule Session
                        </Button>
                    )}
                </Box>

                <Box mb={3}>
                    <FormControl sx={{ minWidth: 200 }}>
                        <InputLabel>Filter by Status</InputLabel>
                        <Select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            label="Filter by Status"
                        >
                            <MenuItem value="">All</MenuItem>
                            <MenuItem value="scheduled">Scheduled</MenuItem>
                            <MenuItem value="ongoing">Ongoing</MenuItem>
                            <MenuItem value="completed">Completed</MenuItem>
                            <MenuItem value="cancelled">Cancelled</MenuItem>
                        </Select>
                    </FormControl>
                </Box>

                {sessions.length === 0 ? (
                    <Paper sx={{ p: 4, textAlign: 'center' }}>
                        <VideoCall sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                        <Typography variant="h6" color="text.secondary" gutterBottom>
                            No live sessions yet
                        </Typography>
                        {isTeacher && (
                            <Typography variant="body2" color="text.secondary" mb={2}>
                                Schedule your first live class session
                            </Typography>
                        )}
                    </Paper>
                ) : (
                    <Grid container spacing={3}>
                        {sessions.map((session) => (
                            <Grid item xs={12} md={6} lg={4} key={session.id}>
                                <Card>
                                    <CardContent>
                                        <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                                            <Typography variant="h6" component="h2">
                                                {session.title}
                                            </Typography>
                                            <Chip
                                                label={session.status}
                                                color={getStatusColor(session.status) as any}
                                                size="small"
                                            />
                                        </Box>

                                        {session.description && (
                                            <Typography variant="body2" color="text.secondary" paragraph>
                                                {session.description}
                                            </Typography>
                                        )}

                                        <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
                                            <Chip
                                                icon={<AccessTime />}
                                                label={new Date(session.scheduled_start).toLocaleString()}
                                                size="small"
                                            />
                                            {session.max_participants && (
                                                <Chip
                                                    icon={<People />}
                                                    label={`Max: ${session.max_participants}`}
                                                    size="small"
                                                />
                                            )}
                                            {session.attendance_count !== undefined && (
                                                <Chip
                                                    icon={<People />}
                                                    label={`${session.attendance_count} joined`}
                                                    size="small"
                                                />
                                            )}
                                        </Box>
                                    </CardContent>

                                    <CardActions>
                                        {isTeacher ? (
                                            <>
                                                {session.status === 'scheduled' && (
                                                    <Button
                                                        size="small"
                                                        startIcon={<PlayArrow />}
                                                        onClick={() => handleStartSession(session.id)}
                                                    >
                                                        Start
                                                    </Button>
                                                )}
                                                {session.status === 'ongoing' && (
                                                    <>
                                                        <Button
                                                            size="small"
                                                            variant="contained"
                                                            color="success"
                                                            startIcon={<VideoCall />}
                                                            onClick={() => handleJoinNow(session.id)}
                                                        >
                                                            Join Now
                                                        </Button>
                                                        <Button
                                                            size="small"
                                                            startIcon={<Stop />}
                                                            color="error"
                                                            onClick={() => handleEndSession(session.id)}
                                                        >
                                                            End
                                                        </Button>
                                                    </>
                                                )}
                                                <Button
                                                    size="small"
                                                    startIcon={<Visibility />}
                                                    onClick={() => handleJoinSession(session.id)}
                                                >
                                                    View
                                                </Button>
                                                <Button
                                                    size="small"
                                                    startIcon={<Edit />}
                                                    onClick={() => handleOpenDialog(session)}
                                                >
                                                    Edit
                                                </Button>
                                                <IconButton
                                                    size="small"
                                                    color="error"
                                                    onClick={() => handleDelete(session.id)}
                                                >
                                                    <Delete />
                                                </IconButton>
                                            </>
                                        ) : (
                                            (session.status === 'scheduled' || session.status === 'ongoing') && (
                                                <>
                                                    {session.status === 'ongoing' ? (
                                                        <Button
                                                            variant="contained"
                                                            size="small"
                                                            color="success"
                                                            startIcon={<VideoCall />}
                                                            onClick={() => handleJoinNow(session.id)}
                                                        >
                                                            Join Now
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            variant="outlined"
                                                            size="small"
                                                            startIcon={<AccessTime />}
                                                            onClick={() => handleJoinSession(session.id)}
                                                        >
                                                            View Details
                                                        </Button>
                                                    )}
                                                </>
                                            )
                                        )}
                                    </CardActions>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                )}

                {/* Create/Edit Dialog */}
                <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
                    <DialogTitle>
                        {editingSession ? 'Edit Live Session' : 'Schedule Live Session'}
                    </DialogTitle>
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
                                label="Description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                margin="normal"
                                multiline
                                rows={3}
                            />

                            <Grid container spacing={2} sx={{ mt: 1 }}>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label="Scheduled Start"
                                        type="datetime-local"
                                        value={formData.scheduled_start}
                                        onChange={(e) => setFormData({ ...formData, scheduled_start: e.target.value })}
                                        margin="normal"
                                        required
                                        InputLabelProps={{ shrink: true }}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label="Scheduled End"
                                        type="datetime-local"
                                        value={formData.scheduled_end}
                                        onChange={(e) => setFormData({ ...formData, scheduled_end: e.target.value })}
                                        margin="normal"
                                        required
                                        InputLabelProps={{ shrink: true }}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label="Max Participants"
                                        type="number"
                                        value={formData.max_participants || ''}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            max_participants: e.target.value ? parseInt(e.target.value) : undefined
                                        })}
                                        margin="normal"
                                        inputProps={{ min: 1 }}
                                    />
                                </Grid>
                            </Grid>
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseDialog}>Cancel</Button>
                        <Button onClick={handleSubmit} variant="contained" disabled={!formData.title || !formData.scheduled_start || !formData.scheduled_end}>
                            {editingSession ? 'Update' : 'Create'}
                        </Button>
                    </DialogActions>
                </Dialog>
            </Box>
        </AppLayout>
    );
}

