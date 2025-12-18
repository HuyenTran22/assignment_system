import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Alert,
    Grid,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControlLabel,
    Checkbox,
    Divider,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
} from '@mui/material';
import {
    Edit,
    Delete,
    ArrowBack,
    CalendarToday,
    Person,
    Description,
    FileDownload,
    Upload,
    Security,
} from '@mui/icons-material';
import AppLayout from '@/shared/components/Layout/AppLayout';
import { useAuthStore } from '@/shared/store/authStore';
import apiClient from '@/shared/api/client';
import { useSnackbar } from 'notistack';
// DateTimePicker removed - using native datetime-local input instead

interface Assignment {
    id: string;
    title: string;
    description: string;
    due_at: string;
    course_id: string;
    created_by: string;
    created_at: string;
    allow_late_submission: boolean;
    allow_peer_review: boolean;
    enable_plagiarism_check: boolean;
    files: Array<{
        id: string;
        file_path: string;
        original_name: string;
        file_size?: number;
        uploaded_at: string;
    }>;
    submission_count?: number;
    graded_count?: number;
    course?: {
        id: string;
        name: string;
        code: string;
    };
}

export default function AssignmentDetailPage() {
    const { assignmentId } = useParams<{ assignmentId: string }>();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const { enqueueSnackbar } = useSnackbar();
    const [assignment, setAssignment] = useState<Assignment | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    const isTeacher = user?.role === 'TEACHER' || user?.role === 'ADMIN' || user?.role === 'MANAGER';

    useEffect(() => {
        if (assignmentId) {
            fetchAssignment();
        }
    }, [assignmentId]);

    const fetchAssignment = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get(`/api/assignments/${assignmentId}`);
            setAssignment(response.data);
        } catch (err: any) {
            console.error('Failed to fetch assignment:', err);
            setError(err.response?.data?.detail || 'Failed to load assignment');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!assignmentId) return;

        try {
            await apiClient.delete(`/api/assignments/${assignmentId}`);
            navigate('/assignments');
        } catch (err: any) {
            console.error('Failed to delete assignment:', err);
            setError(err.response?.data?.detail || 'Failed to delete assignment');
        } finally {
            setDeleteDialogOpen(false);
        }
    };

    const handleDownloadFile = async (fileId: string, fileName: string) => {
        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch(`/api/assignments/${assignmentId}/files/${fileId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Download failed');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Download error:', error);
            enqueueSnackbar('Failed to download file', { variant: 'error' });
        }
    };

    if (loading) {
        return (
            <AppLayout>
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                    <CircularProgress />
                </Box>
            </AppLayout>
        );
    }

    if (error && !assignment) {
        return (
            <AppLayout>
                <Box sx={{ p: 3 }}>
                    <Alert severity="error">{error}</Alert>
                    <Button onClick={() => navigate('/assignments')} sx={{ mt: 2 }}>
                        Back to Assignments
                    </Button>
                </Box>
            </AppLayout>
        );
    }

    if (!assignment) {
        return (
            <AppLayout>
                <Box sx={{ p: 3 }}>
                    <Alert severity="info">Assignment not found</Alert>
                    <Button onClick={() => navigate('/assignments')} sx={{ mt: 2 }}>
                        Back to Assignments
                    </Button>
                </Box>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Button
                        startIcon={<ArrowBack />}
                        onClick={() => navigate('/assignments')}
                        sx={{ mr: 2 }}
                    >
                        Back
                    </Button>
                    {isTeacher && (
                        <Box>
                            <Button
                                startIcon={<Edit />}
                                variant="outlined"
                                onClick={() => setEditDialogOpen(true)}
                                sx={{ mr: 1 }}
                            >
                                Edit
                            </Button>
                            <Button
                                startIcon={<Delete />}
                                variant="outlined"
                                color="error"
                                onClick={() => setDeleteDialogOpen(true)}
                            >
                                Delete
                            </Button>
                        </Box>
                    )}
                </Box>

                <Card>
                    <CardContent>
                        <Typography variant="h4" gutterBottom>
                            {assignment.title}
                        </Typography>

                        <Grid container spacing={2} sx={{ mt: 1 }}>
                            <Grid item xs={12} md={6}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                    <Description color="action" />
                                    <Typography variant="body2" color="text.secondary">
                                        Course: {assignment.course?.name || 'Unknown'}
                                    </Typography>
                                </Box>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                    <CalendarToday color="action" />
                                    <Typography variant="body2" color="text.secondary">
                                        Due: {new Date(assignment.due_at).toLocaleString('en-US', { hour12: false })}
                                    </Typography>
                                </Box>
                            </Grid>
                        </Grid>

                        <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
                            {assignment.allow_late_submission && (
                                <Chip label="Late Submission Allowed" color="info" size="small" />
                            )}
                            {assignment.allow_peer_review && (
                                <Chip label="Peer Review Enabled" color="secondary" size="small" />
                            )}
                            {assignment.enable_plagiarism_check && (
                                <Chip label="Plagiarism Check Enabled" color="success" size="small" />
                            )}
                        </Box>

                        {assignment.description && (
                            <Box sx={{ mb: 3 }}>
                                <Typography variant="h6" gutterBottom>
                                    Description
                                </Typography>
                                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                                    {assignment.description}
                                </Typography>
                            </Box>
                        )}

                        <Divider sx={{ my: 3 }} />

                        {assignment.files && assignment.files.length > 0 && (
                            <Box sx={{ mb: 3 }}>
                                <Typography variant="h6" gutterBottom>
                                    Assignment Files
                                </Typography>
                                <List>
                                    {assignment.files.map((file) => (
                                        <ListItem key={file.id}>
                                            <ListItemText
                                                primary={file.original_name}
                                                secondary={`${(file.file_size || 0) / 1024} KB • Uploaded: ${new Date(file.uploaded_at).toLocaleString('en-US', { hour12: false })}`}
                                            />
                                            <ListItemSecondaryAction>
                                                <IconButton
                                                    edge="end"
                                                    onClick={() => handleDownloadFile(file.id, file.original_name)}
                                                >
                                                    <FileDownload />
                                                </IconButton>
                                            </ListItemSecondaryAction>
                                        </ListItem>
                                    ))}
                                </List>
                            </Box>
                        )}

                        {isTeacher && (
                            <Box sx={{ mt: 3 }}>
                                <Typography variant="h6" gutterBottom>
                                    Statistics
                                </Typography>
                                <Grid container spacing={2}>
                                    <Grid item xs={6}>
                                        <Card variant="outlined">
                                            <CardContent>
                                                <Typography variant="h4">{assignment.submission_count || 0}</Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    Submissions
                                                </Typography>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Card variant="outlined">
                                            <CardContent>
                                                <Typography variant="h4">{assignment.graded_count || 0}</Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    Graded
                                                </Typography>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                </Grid>
                                
                                <Box sx={{ mt: 3 }}>
                                    <Button
                                        variant="contained"
                                        onClick={() => navigate(`/assignments/${assignmentId}/submissions`)}
                                        fullWidth
                                    >
                                        View & Grade Submissions
                                    </Button>
                                </Box>
                                
                                {assignment.enable_plagiarism_check && (
                                    <Box sx={{ mt: 3 }}>
                                        <Button
                                            variant="outlined"
                                            startIcon={<Security />}
                                            onClick={() => navigate(`/assignments/${assignmentId}/plagiarism-report`)}
                                            fullWidth
                                        >
                                            View Plagiarism Report
                                        </Button>
                                    </Box>
                                )}
                            </Box>
                        )}

                        {!isTeacher && (
                            <Box sx={{ mt: 3 }}>
                                <Button
                                    variant="contained"
                                    startIcon={<Upload />}
                                    onClick={() => navigate(`/assignments/${assignmentId}/submit`)}
                                    fullWidth
                                    size="large"
                                >
                                    Submit Assignment
                                </Button>
                            </Box>
                        )}
                    </CardContent>
                </Card>
            </Box>

            {/* Edit Dialog */}
            <EditAssignmentDialog
                open={editDialogOpen}
                onClose={() => setEditDialogOpen(false)}
                assignment={assignment}
                onSuccess={fetchAssignment}
            />

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                <DialogTitle>Delete Assignment</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to delete "{assignment.title}"? This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleDelete} color="error" variant="contained">
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </AppLayout>
    );
}

// Edit Assignment Dialog Component
function EditAssignmentDialog({
    open,
    onClose,
    assignment,
    onSuccess,
}: {
    open: boolean;
    onClose: () => void;
    assignment: Assignment;
    onSuccess: () => void;
}) {
    const [title, setTitle] = useState(assignment.title);
    const [description, setDescription] = useState(assignment.description || '');
    const [dueDate, setDueDate] = useState<string>(
        new Date(assignment.due_at).toISOString().slice(0, 16)
    );
    const [allowLateSubmission, setAllowLateSubmission] = useState(assignment.allow_late_submission);
    const [allowPeerReview, setAllowPeerReview] = useState(assignment.allow_peer_review);
    const [enablePlagiarismCheck, setEnablePlagiarismCheck] = useState(assignment.enable_plagiarism_check ?? true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (open) {
            setTitle(assignment.title);
            setDescription(assignment.description || '');
            setDueDate(new Date(assignment.due_at).toISOString().slice(0, 16));
            setAllowLateSubmission(assignment.allow_late_submission);
            setAllowPeerReview(assignment.allow_peer_review);
            setEnablePlagiarismCheck(assignment.enable_plagiarism_check ?? true);
        }
    }, [open, assignment]);

    const handleSubmit = async () => {
        if (!title || !dueDate) {
            setError('Please fill in all required fields');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Convert datetime-local string to ISO string
            const dueDateISO = new Date(dueDate).toISOString();
            
            await apiClient.put(`/api/assignments/${assignment.id}`, {
                title,
                description: description || null,
                due_at: dueDateISO,
                allow_late_submission: allowLateSubmission,
                allow_peer_review: allowPeerReview,
                enable_plagiarism_check: enablePlagiarismCheck,
            });

            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Failed to update assignment:', err);
            setError(err.response?.data?.detail || 'Failed to update assignment');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>Edit Assignment</DialogTitle>
            <DialogContent>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 2 }}>
                    <TextField
                        fullWidth
                        label="Assignment Title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                    />

                    <TextField
                        fullWidth
                        label="Description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        multiline
                        rows={4}
                    />

                    <TextField
                        fullWidth
                        label="Due Date & Time"
                        type="datetime-local"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        required
                        InputLabelProps={{
                            shrink: true,
                        }}
                        helperText="Select date and time (24-hour format)"
                    />

                        <Divider />

                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={allowLateSubmission}
                                    onChange={(e) => setAllowLateSubmission(e.target.checked)}
                                />
                            }
                            label="Allow Late Submission"
                        />

                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={allowPeerReview}
                                    onChange={(e) => setAllowPeerReview(e.target.checked)}
                                />
                            }
                            label="Enable Peer Review"
                        />

                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={enablePlagiarismCheck}
                                    onChange={(e) => setEnablePlagiarismCheck(e.target.checked)}
                                />
                            }
                            label="Enable Plagiarism Check"
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        variant="contained"
                        disabled={loading || !title || !dueDate}
                    >
                        {loading ? 'Saving...' : 'Save Changes'}
                    </Button>
                </DialogActions>
        </Dialog>
    );
}

