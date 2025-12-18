import { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, Button, Card, CardContent, CircularProgress,
    Alert, Chip, Avatar, Divider, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Grid
} from '@mui/material';
import {
    ArrowBack, VideoCall, People, AccessTime, Person, PlayArrow, Stop,
    CheckCircle, Download, Add
} from '@mui/icons-material';
import AppLayout from '@/shared/components/Layout/AppLayout';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '@/shared/api/client';
import { useSnackbar } from 'notistack';
import { useAuthStore } from '@/shared/store/authStore';
import { LiveSessionDetail, SessionRecording, SessionRecordingCreate } from '../types/live-class.types';

export default function LiveSessionPage() {
    const { courseId, sessionId } = useParams<{ courseId: string; sessionId: string }>();
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();
    const { user } = useAuthStore();
    const isTeacher = user?.role === 'TEACHER' || user?.role === 'MANAGER' || user?.role === 'ADMIN';

    const [session, setSession] = useState<LiveSessionDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [joining, setJoining] = useState(false);
    const [recordingDialogOpen, setRecordingDialogOpen] = useState(false);
    const [recordingForm, setRecordingForm] = useState<SessionRecordingCreate>({
        session_id: sessionId || '',
        recording_url: '',
        recording_type: 'video',
        file_size_bytes: undefined,
        duration_seconds: undefined
    });

    useEffect(() => {
        if (sessionId) {
            fetchSession();
        }
    }, [sessionId]);

    const fetchSession = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get(`/api/courses/live-sessions/${sessionId}`);
            setSession(response.data);
        } catch (error: any) {
            console.error('Failed to fetch session:', error);
            enqueueSnackbar(error.message || 'Failed to load session', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleJoin = async () => {
        try {
            setJoining(true);
            // Record attendance for this live session
            await apiClient.post(`/api/courses/live-sessions/${sessionId}/join`);
            enqueueSnackbar('Joined live session', { variant: 'success' });
            // Navigate to course video room (per-course Jitsi room)
            navigate(`/courses/${courseId}/video-call`);
        } catch (error: any) {
            console.error('Failed to join session:', error);
            enqueueSnackbar(error.message || 'Failed to join session', { variant: 'error' });
        } finally {
            setJoining(false);
        }
    };

    const handleLeave = async () => {
        try {
            await apiClient.post(`/api/courses/live-sessions/${sessionId}/leave`);
            enqueueSnackbar('Left session', { variant: 'success' });
            fetchSession();
        } catch (error: any) {
            console.error('Failed to leave session:', error);
            enqueueSnackbar(error.message || 'Failed to leave session', { variant: 'error' });
        }
    };

    const handleAddRecording = async () => {
        try {
            await apiClient.post(`/api/courses/live-sessions/${sessionId}/recordings`, recordingForm);
            enqueueSnackbar('Recording added successfully', { variant: 'success' });
            setRecordingDialogOpen(false);
            setRecordingForm({
                session_id: sessionId || '',
                recording_url: '',
                recording_type: 'video',
                file_size_bytes: undefined,
                duration_seconds: undefined
            });
            fetchSession();
        } catch (error: any) {
            console.error('Failed to add recording:', error);
            enqueueSnackbar(error.message || 'Failed to add recording', { variant: 'error' });
        }
    };

    const canJoin = session && (session.status === 'scheduled' || session.status === 'ongoing');
    const isInSession = session?.attendance?.some(a => a.user_id === user?.id && !a.left_at);

    if (loading) {
        return (
            <AppLayout>
                <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                    <CircularProgress />
                </Box>
            </AppLayout>
        );
    }

    if (!session) {
        return (
            <AppLayout>
                <Alert severity="error">Session not found</Alert>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <Box p={3}>
                <Button
                    startIcon={<ArrowBack />}
                    onClick={() => navigate(`/courses/${courseId}/live-sessions`)}
                    sx={{ mb: 2 }}
                >
                    Back to Live Classes
                </Button>

                <Paper sx={{ p: 3, mb: 3 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                        <Box>
                            <Typography variant="h4" component="h1" gutterBottom>
                                {session.title}
                            </Typography>
                            <Chip
                                label={session.status}
                                color={session.status === 'ongoing' ? 'success' : 'default'}
                                sx={{ mb: 2 }}
                            />
                        </Box>
                        {canJoin && (
                            <Box>
                                {isInSession ? (
                                    <Button
                                        variant="outlined"
                                        color="error"
                                        onClick={handleLeave}
                                    >
                                        Leave Session
                                    </Button>
                                ) : (
                                    <Button
                                        variant="contained"
                                        startIcon={<VideoCall />}
                                        onClick={handleJoin}
                                        disabled={joining}
                                    >
                                        {joining ? 'Joining...' : 'Join Session'}
                                    </Button>
                                )}
                            </Box>
                        )}
                    </Box>

                    {session.description && (
                        <Typography variant="body1" paragraph>
                            {session.description}
                        </Typography>
                    )}

                    <Grid container spacing={2} sx={{ mt: 2 }}>
                        <Grid item xs={12} sm={6}>
                            <Typography variant="subtitle2" color="text.secondary">
                                Scheduled Start
                            </Typography>
                            <Typography variant="body1">
                                {new Date(session.scheduled_start).toLocaleString()}
                            </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Typography variant="subtitle2" color="text.secondary">
                                Scheduled End
                            </Typography>
                            <Typography variant="body1">
                                {new Date(session.scheduled_end).toLocaleString()}
                            </Typography>
                        </Grid>
                        {session.actual_start && (
                            <Grid item xs={12} sm={6}>
                                <Typography variant="subtitle2" color="text.secondary">
                                    Actual Start
                                </Typography>
                                <Typography variant="body1">
                                    {new Date(session.actual_start).toLocaleString()}
                                </Typography>
                            </Grid>
                        )}
                        {session.actual_end && (
                            <Grid item xs={12} sm={6}>
                                <Typography variant="subtitle2" color="text.secondary">
                                    Actual End
                                </Typography>
                                <Typography variant="body1">
                                    {new Date(session.actual_end).toLocaleString()}
                                </Typography>
                            </Grid>
                        )}
                    </Grid>

                    {session.meeting_url && (
                        <Box sx={{ mt: 3 }}>
                            <Button
                                variant="contained"
                                startIcon={<VideoCall />}
                                href={session.meeting_url}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Open Meeting Link
                            </Button>
                            {session.meeting_id && (
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                    Meeting ID: {session.meeting_id}
                                    {session.meeting_password && ` | Password: ${session.meeting_password}`}
                                </Typography>
                            )}
                        </Box>
                    )}
                </Paper>

                {/* Attendance Section */}
                <Paper sx={{ p: 3, mb: 3 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h6">
                            Attendance ({session.attendance?.length || 0})
                        </Typography>
                    </Box>
                    {session.attendance && session.attendance.length > 0 ? (
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Name</TableCell>
                                        <TableCell>Joined At</TableCell>
                                        <TableCell>Left At</TableCell>
                                        <TableCell>Duration</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {session.attendance.map((att) => (
                                        <TableRow key={att.id}>
                                            <TableCell>
                                                <Box display="flex" alignItems="center" gap={1}>
                                                    <Avatar sx={{ width: 32, height: 32 }}>
                                                        <Person fontSize="small" />
                                                    </Avatar>
                                                    {att.user_name || 'Unknown'}
                                                </Box>
                                            </TableCell>
                                            <TableCell>
                                                {new Date(att.joined_at).toLocaleString()}
                                            </TableCell>
                                            <TableCell>
                                                {att.left_at ? new Date(att.left_at).toLocaleString() : (
                                                    <Chip label="In Session" color="success" size="small" />
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {att.duration_minutes
                                                    ? `${Math.floor(att.duration_minutes / 60)}h ${att.duration_minutes % 60}m`
                                                    : '-'}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    ) : (
                        <Typography variant="body2" color="text.secondary">
                            No attendance records yet
                        </Typography>
                    )}
                </Paper>

                {/* Recordings Section */}
                <Paper sx={{ p: 3 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h6">
                            Recordings ({session.recordings?.length || 0})
                        </Typography>
                        {isTeacher && (
                            <Button
                                startIcon={<Add />}
                                onClick={() => setRecordingDialogOpen(true)}
                            >
                                Add Recording
                            </Button>
                        )}
                    </Box>
                    {session.recordings && session.recordings.length > 0 ? (
                        <Grid container spacing={2}>
                            {session.recordings.map((recording) => (
                                <Grid item xs={12} md={6} key={recording.id}>
                                    <Card>
                                        <CardContent>
                                            <Typography variant="subtitle1" gutterBottom>
                                                {recording.recording_type} Recording
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary" paragraph>
                                                {recording.duration_seconds
                                                    ? `${Math.floor(recording.duration_seconds / 60)}:${(recording.duration_seconds % 60).toString().padStart(2, '0')}`
                                                    : 'Duration unknown'}
                                            </Typography>
                                            <Button
                                                variant="outlined"
                                                startIcon={<Download />}
                                                href={recording.recording_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                Download
                                            </Button>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>
                    ) : (
                        <Typography variant="body2" color="text.secondary">
                            No recordings available
                        </Typography>
                    )}
                </Paper>

                {/* Add Recording Dialog */}
                <Dialog open={recordingDialogOpen} onClose={() => setRecordingDialogOpen(false)} maxWidth="sm" fullWidth>
                    <DialogTitle>Add Recording</DialogTitle>
                    <DialogContent>
                        <Box sx={{ pt: 2 }}>
                            <TextField
                                fullWidth
                                label="Recording URL"
                                value={recordingForm.recording_url}
                                onChange={(e) => setRecordingForm({ ...recordingForm, recording_url: e.target.value })}
                                margin="normal"
                                required
                            />
                            <TextField
                                fullWidth
                                label="Recording Type"
                                select
                                value={recordingForm.recording_type}
                                onChange={(e) => setRecordingForm({ ...recordingForm, recording_type: e.target.value })}
                                margin="normal"
                                SelectProps={{ native: true }}
                            >
                                <option value="video">Video</option>
                                <option value="audio">Audio</option>
                                <option value="transcript">Transcript</option>
                            </TextField>
                            <TextField
                                fullWidth
                                label="Duration (seconds)"
                                type="number"
                                value={recordingForm.duration_seconds || ''}
                                onChange={(e) => setRecordingForm({
                                    ...recordingForm,
                                    duration_seconds: e.target.value ? parseInt(e.target.value) : undefined
                                })}
                                margin="normal"
                            />
                            <TextField
                                fullWidth
                                label="File Size (bytes)"
                                type="number"
                                value={recordingForm.file_size_bytes || ''}
                                onChange={(e) => setRecordingForm({
                                    ...recordingForm,
                                    file_size_bytes: e.target.value ? parseInt(e.target.value) : undefined
                                })}
                                margin="normal"
                            />
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setRecordingDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleAddRecording} variant="contained" disabled={!recordingForm.recording_url}>
                            Add
                        </Button>
                    </DialogActions>
                </Dialog>
            </Box>
        </AppLayout>
    );
}

