import { useState, useEffect } from 'react';
import {
    Box, Typography, Card, CardContent, Grid, Avatar, Rating, CircularProgress,
    Alert, Tabs, Tab, Button, Chip, Dialog, DialogTitle, DialogContent,
    DialogActions, TextField, List, ListItem, ListItemText, ListItemIcon, Divider
} from '@mui/material';
import {
    PeopleAlt, Assignment as AssignmentIcon, CheckCircle, RateReview,
    AttachFile, Send, Download
} from '@mui/icons-material';
import AppLayout from '@/shared/components/Layout/AppLayout';
import apiClient from '@/shared/api/client';
import { useAuthStore } from '@/shared/store/authStore';
import { useSnackbar } from 'notistack';
import { useNavigate } from 'react-router-dom';

interface ReceivedReview {
    id: string;
    assignment: {
        id: string;
        title: string;
    };
    reviewer: {
        id: string;
        full_name: string;
        email: string;
    };
    score: number | null;
    feedback: string;
    created_at: string;
}

interface PeerReviewTask {
    submission_id: string;
    assignment: {
        id: string;
        title: string;
    };
    student: {
        id: string;
        full_name: string;
    };
    submitted_at: string;
    review_status: 'pending' | 'completed';
    review?: {
        score: number | null;
        feedback: string;
    };
    files?: Array<{
        id: string;
        original_name: string;
        file_size: number;
    }>;
}


interface Assignment {
    id: string;
    title: string;
    course_id: string;
    submission_count?: number;
    allow_peer_review: boolean;
    course?: {
        name: string;
    };
}

export default function PeerReviewsPage() {
    const { user } = useAuthStore();
    const { enqueueSnackbar } = useSnackbar();
    const navigate = useNavigate();
    const [tabValue, setTabValue] = useState(0);
    const [receivedReviews, setReceivedReviews] = useState<ReceivedReview[]>([]);
    const [reviewTasks, setReviewTasks] = useState<PeerReviewTask[]>([]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [assignDialogOpen, setAssignDialogOpen] = useState(false);
    const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
    const [reviewsPerSubmission, setReviewsPerSubmission] = useState(2);
    const [assigning, setAssigning] = useState(false);

    // Review Dialog State
    const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<PeerReviewTask | null>(null);
    const [reviewScore, setReviewScore] = useState<number | null>(null);
    const [reviewFeedback, setReviewFeedback] = useState('');
    const [submittingReview, setSubmittingReview] = useState(false);

    const isStudent = user?.role === 'STUDENT';
    const isTeacher = user?.role === 'TEACHER' || user?.role === 'ADMIN';

    useEffect(() => {
        if (isStudent) {
            if (tabValue === 0) {
                fetchReviewTasks();
            } else {
                fetchReceivedReviews();
            }
        } else if (isTeacher) {
            fetchAssignments();
        }
    }, [user, tabValue]);

    const fetchReviewTasks = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get('/api/peer-reviews/me/tasks');
            setReviewTasks(response.data || []);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch peer review tasks:', err);
            setError('Failed to load peer review tasks.');
        } finally {
            setLoading(false);
        }
    };

    const fetchReceivedReviews = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get('/api/peer-reviews/me/received');
            setReceivedReviews(response.data || []);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch peer reviews:', err);
            setError('Failed to load peer reviews.');
        } finally {
            setLoading(false);
        }
    };

    const fetchAssignments = async () => {
        try {
            setLoading(true);
            // Get all assignments where teacher is enrolled (with high limit)
            const response = await apiClient.get('/api/assignments?limit=100');
            console.log('[Peer Reviews] Assignments response:', response.data);

            // Handle paginated response
            const allAssignments = response.data.items || response.data || [];

            // Filter only assignments with peer review enabled
            const peerReviewAssignments = allAssignments.filter(
                (a: Assignment) => a.allow_peer_review
            );

            console.log('[Peer Reviews] Filtered peer review assignments:', peerReviewAssignments);
            setAssignments(peerReviewAssignments);
            setError(null);
        } catch (err: any) {
            console.error('[Peer Reviews] Failed to fetch assignments:', err);
            console.error('[Peer Reviews] Error details:', err.response?.data);
            setError(err.response?.data?.detail || 'Failed to load assignments. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenAssignDialog = (assignment: Assignment) => {
        setSelectedAssignment(assignment);
        setAssignDialogOpen(true);
    };

    const handleCloseAssignDialog = () => {
        setAssignDialogOpen(false);
        setSelectedAssignment(null);
        setReviewsPerSubmission(2);
    };

    const handleAssignPeerReviews = async () => {
        if (!selectedAssignment) return;

        try {
            setAssigning(true);
            await apiClient.post(
                `/api/peer-reviews/assignments/${selectedAssignment.id}/peer-review/assign?reviews_per_submission=${reviewsPerSubmission}`
            );
            enqueueSnackbar('Peer reviews assigned successfully!', { variant: 'success' });
            handleCloseAssignDialog();
            fetchAssignments(); // Refresh
        } catch (err: any) {
            console.error('Failed to assign peer reviews:', err);
            enqueueSnackbar(
                err.response?.data?.detail || 'Failed to assign peer reviews',
                { variant: 'error' }
            );
        } finally {
            setAssigning(false);
        }
    };

    const handleOpenReviewDialog = (task: PeerReviewTask) => {
        setSelectedTask(task);
        setReviewScore(task.review?.score || null);
        setReviewFeedback(task.review?.feedback || '');
        setReviewDialogOpen(true);
    };

    const handleCloseReviewDialog = () => {
        setReviewDialogOpen(false);
        setSelectedTask(null);
        setReviewScore(null);
        setReviewFeedback('');
    };

    const handleDownloadSubmissionFile = async (fileId: string, fileName: string) => {
        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch(`/api/submissions/files/${fileId}/download`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) throw new Error('Download failed');
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            enqueueSnackbar('File downloaded successfully!', { variant: 'success' });
        } catch (error) {
            console.error('Download error:', error);
            enqueueSnackbar('Failed to download file. Please try again.', { variant: 'error' });
        }
    };

    const handleSubmitReview = async () => {
        if (!selectedTask || !reviewFeedback.trim()) {
            enqueueSnackbar('Please provide feedback', { variant: 'warning' });
            return;
        }

        try {
            setSubmittingReview(true);
            await apiClient.post(
                `/api/peer-reviews/peer-review/${selectedTask.submission_id}`,
                {
                    score: reviewScore,
                    feedback: reviewFeedback
                }
            );
            enqueueSnackbar('Review submitted successfully!', { variant: 'success' });
            handleCloseReviewDialog();
            fetchReviewTasks(); // Refresh
        } catch (err: any) {
            console.error('Failed to submit review:', err);
            enqueueSnackbar(
                err.response?.data?.detail || 'Failed to submit review',
                { variant: 'error' }
            );
        } finally {
            setSubmittingReview(false);
        }
    };

    // STUDENT VIEW
    if (isStudent) {
        return (
            <AppLayout>
                <Box>
                    <Typography variant="h4" fontWeight="bold" gutterBottom>
                        Peer Reviews
                    </Typography>

                    <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)} sx={{ mb: 3 }}>
                        <Tab label="My Review Tasks" />
                        <Tab label="Reviews I Received" />
                    </Tabs>

                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                            <CircularProgress />
                        </Box>
                    ) : error ? (
                        <Alert severity="error">{error}</Alert>
                    ) : tabValue === 0 ? (
                        <Grid container spacing={3}>
                            {reviewTasks.map((task) => (
                                <Grid item xs={12} md={6} key={task.submission_id}>
                                    <Card>
                                        <CardContent>
                                            <Typography variant="h6" gutterBottom>
                                                {task.assignment?.title || 'Assignment'}
                                            </Typography>
                                            <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
                                                <Avatar>{task.student?.full_name?.charAt(0) || '?'}</Avatar>
                                                <Box>
                                                    <Typography variant="body1">
                                                        Review for: {task.student?.full_name || 'Unknown'}
                                                    </Typography>
                                                    <Typography variant="body2" color="text.secondary">
                                                        Submitted: {new Date(task.submitted_at).toLocaleDateString()}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                            {task.review_status === 'completed' ? (
                                                <Alert severity="success" sx={{ mt: 2 }}>
                                                    Review completed
                                                </Alert>
                                            ) : (
                                                <Button
                                                    variant="contained"
                                                    startIcon={<RateReview />}
                                                    onClick={() => handleOpenReviewDialog(task)}
                                                    fullWidth
                                                    sx={{ mt: 2 }}
                                                >
                                                    Start Review
                                                </Button>
                                            )}
                                        </CardContent>
                                    </Card>
                                </Grid>
                            ))}
                            {reviewTasks.length === 0 && (
                                <Grid item xs={12}>
                                    <Alert severity="info">No peer review tasks assigned yet.</Alert>
                                </Grid>
                            )}
                        </Grid>
                    ) : (
                        <Grid container spacing={3}>
                            {receivedReviews.map((review) => (
                                <Grid item xs={12} md={6} key={review.id}>
                                    <Card>
                                        <CardContent>
                                            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                                                <Avatar>{review.reviewer?.full_name?.charAt(0) || '?'}</Avatar>
                                                <Box>
                                                    <Typography variant="h6">{review.reviewer?.full_name || 'Anonymous'}</Typography>
                                                    <Typography variant="body2" color="text.secondary">
                                                        {review.assignment?.title || 'Assignment'}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                            {review.score !== null && (
                                                <Rating value={review.score / 20} readOnly max={5} />
                                            )}
                                            <Typography variant="body2" sx={{ mt: 2 }}>
                                                {review.feedback}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                                {new Date(review.created_at).toLocaleDateString()}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            ))}
                            {receivedReviews.length === 0 && (
                                <Grid item xs={12}>
                                    <Alert severity="info">No peer reviews received yet.</Alert>
                                </Grid>
                            )}
                        </Grid>
                    )}
                </Box>

                {/* Review Submission Dialog (for Students) */}
                <Dialog open={reviewDialogOpen} onClose={handleCloseReviewDialog} maxWidth="md" fullWidth>
                    <DialogTitle>Submit Peer Review</DialogTitle>
                    <DialogContent>
                        {selectedTask && (
                            <>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                    <strong>Assignment:</strong> {selectedTask.assignment?.title}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                    <strong>Student:</strong> {selectedTask.student?.full_name}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                    <strong>Submitted:</strong> {new Date(selectedTask.submitted_at).toLocaleString()}
                                </Typography>

                                <Divider sx={{ mb: 2 }} />

                                <Typography variant="subtitle2" gutterBottom>
                                    Submission Files:
                                </Typography>
                                <List dense>
                                    {selectedTask.files?.map((file: any) => (
                                        <ListItem
                                            key={file.id}
                                            secondaryAction={
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    startIcon={<Download />}
                                                    onClick={() => handleDownloadSubmissionFile(file.id, file.original_name)}
                                                >
                                                    Download
                                                </Button>
                                            }
                                        >
                                            <ListItemIcon>
                                                <AttachFile fontSize="small" />
                                            </ListItemIcon>
                                            <ListItemText
                                                primary={file.original_name}
                                                secondary={`${(file.file_size / 1024).toFixed(2)} KB`}
                                            />
                                        </ListItem>
                                    ))}
                                </List>

                                <Divider sx={{ my: 2 }} />

                                <Typography variant="subtitle2" gutterBottom sx={{ mt: 3 }}>
                                    Rating (Optional):
                                </Typography>
                                <Rating
                                    value={reviewScore ? reviewScore / 20 : 0}
                                    onChange={(_, newValue) => setReviewScore(newValue ? newValue * 20 : null)}
                                    max={5}
                                    size="large"
                                />

                                <TextField
                                    fullWidth
                                    multiline
                                    rows={6}
                                    label="Feedback *"
                                    value={reviewFeedback}
                                    onChange={(e) => setReviewFeedback(e.target.value)}
                                    placeholder="Provide constructive feedback on the submission..."
                                    sx={{ mt: 3 }}
                                    required
                                />

                                <Alert severity="info" sx={{ mt: 2 }}>
                                    Your review will be shared with the student to help them improve.
                                </Alert>
                            </>
                        )}
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseReviewDialog}>Cancel</Button>
                        <Button
                            onClick={handleSubmitReview}
                            variant="contained"
                            startIcon={<Send />}
                            disabled={submittingReview || !reviewFeedback.trim()}
                        >
                            {submittingReview ? <CircularProgress size={24} /> : 'Submit Review'}
                        </Button>
                    </DialogActions>
                </Dialog>
            </AppLayout>
        );
    }

    // TEACHER VIEW
    return (
        <AppLayout>
            <Box>
                <Typography variant="h4" fontWeight="bold" gutterBottom>
                    Peer Review Management
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                    Manage peer reviews for assignments with peer review enabled
                </Typography>

                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : error ? (
                    <Alert severity="error">{error}</Alert>
                ) : (
                    <Grid container spacing={3}>
                        {assignments.map((assignment) => (
                            <Grid item xs={12} md={6} key={assignment.id}>
                                <Card>
                                    <CardContent>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                                            <Box sx={{ flex: 1 }}>
                                                <Typography variant="h6" gutterBottom>
                                                    {assignment.title}
                                                </Typography>
                                                {assignment.course && (
                                                    <Typography variant="body2" color="text.secondary">
                                                        Course: {assignment.course.name}
                                                    </Typography>
                                                )}
                                            </Box>
                                            <Chip
                                                icon={<CheckCircle />}
                                                label="Peer Review Enabled"
                                                color="success"
                                                size="small"
                                            />
                                        </Box>

                                        <Box sx={{ display: 'flex', gap: 2, my: 2 }}>
                                            <Chip
                                                icon={<AssignmentIcon />}
                                                label={`${assignment.submission_count || 0} Submissions`}
                                                variant="outlined"
                                            />
                                        </Box>

                                        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                                            <Button
                                                variant="contained"
                                                startIcon={<PeopleAlt />}
                                                onClick={() => handleOpenAssignDialog(assignment)}
                                                disabled={(assignment.submission_count || 0) < 2}
                                                fullWidth
                                            >
                                                Assign Peer Reviews
                                            </Button>
                                            <Button
                                                variant="outlined"
                                                onClick={() => navigate(`/assignments/${assignment.id}`)}
                                            >
                                                View
                                            </Button>
                                        </Box>

                                        {(assignment.submission_count || 0) < 2 && (
                                            <Alert severity="warning" sx={{ mt: 2 }}>
                                                Need at least 2 submissions to assign peer reviews
                                            </Alert>
                                        )}
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                        {assignments.length === 0 && (
                            <Grid item xs={12}>
                                <Alert severity="info">
                                    No assignments with peer review enabled.
                                    Create an assignment and enable "Allow Peer Review" option.
                                </Alert>
                            </Grid>
                        )}
                    </Grid>
                )}
            </Box>

            {/* Assign Dialog */}
            <Dialog open={assignDialogOpen} onClose={handleCloseAssignDialog} maxWidth="sm" fullWidth>
                <DialogTitle>Assign Peer Reviews</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Assignment: <strong>{selectedAssignment?.title}</strong>
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                        Total Submissions: <strong>{selectedAssignment?.submission_count || 0}</strong>
                    </Typography>
                    <TextField
                        fullWidth
                        type="number"
                        label="Reviews per Submission"
                        value={reviewsPerSubmission}
                        onChange={(e) => setReviewsPerSubmission(parseInt(e.target.value) || 2)}
                        inputProps={{ min: 1, max: (selectedAssignment?.submission_count || 2) - 1 }}
                        helperText="Each student will review this many submissions"
                        sx={{ mt: 2 }}
                    />
                    <Alert severity="info" sx={{ mt: 2 }}>
                        Students will be randomly assigned to review other students' work.
                    </Alert>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseAssignDialog}>Cancel</Button>
                    <Button
                        onClick={handleAssignPeerReviews}
                        variant="contained"
                        disabled={assigning}
                    >
                        {assigning ? <CircularProgress size={24} /> : 'Assign'}
                    </Button>
                </DialogActions>
            </Dialog>
        </AppLayout>
    );
}
