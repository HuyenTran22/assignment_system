import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Button,
    Card,
    CardContent,
    CircularProgress,
    Alert,
    TextField,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    IconButton,
    Divider,
    Chip,
} from '@mui/material';
import {
    ArrowBack,
    Upload,
    Delete,
    Description,
    CalendarToday,
    CheckCircle,
} from '@mui/icons-material';
import AppLayout from '@/shared/components/Layout/AppLayout';
import { useAuthStore } from '@/shared/store/authStore';
import apiClient from '@/shared/api/client';
import { useSnackbar } from 'notistack';

interface Assignment {
    id: string;
    title: string;
    description: string;
    due_at: string;
    course_id: string;
    allow_late_submission: boolean;
    course?: {
        id: string;
        name: string;
    };
}

interface Submission {
    id: string;
    submitted_at: string;
    status: string;
    comment?: string;
    plagiarism_score?: number;
    files: Array<{
        id: string;
        original_name: string;
        file_size?: number;
    }>;
    grade?: {
        score: number;
        graded_at: string;
    };
}

export default function SubmitAssignmentPage() {
    const { assignmentId } = useParams<{ assignmentId: string }>();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const { enqueueSnackbar } = useSnackbar();
    const [assignment, setAssignment] = useState<Assignment | null>(null);
    const [existingSubmission, setExistingSubmission] = useState<Submission | null>(null);
    const [files, setFiles] = useState<File[]>([]);
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (assignmentId) {
            fetchAssignment();
            fetchMySubmission();
        }
    }, [assignmentId]);

    const getErrorMessage = (err: any): string => {
        // Normalize various backend error shapes to a human-readable string
        const detail = err?.response?.data?.detail;
        if (!detail) {
            return err?.message || 'Failed to submit assignment';
        }
        if (typeof detail === 'string') return detail;
        if (Array.isArray(detail)) {
            // FastAPI validation errors
            return detail.map((d) => d?.msg || JSON.stringify(d)).join('; ');
        }
        if (typeof detail === 'object') {
            return detail.message || JSON.stringify(detail);
        }
        return String(detail);
    };

    const fetchAssignment = async () => {
        try {
            const response = await apiClient.get(`/api/assignments/${assignmentId}`);
            setAssignment(response.data);
        } catch (err: any) {
            console.error('Failed to fetch assignment:', err);
            setError(err.response?.data?.detail || 'Failed to load assignment');
        } finally {
            setLoading(false);
        }
    };

    const fetchMySubmission = async () => {
        try {
            const response = await apiClient.get(`/api/assignments/${assignmentId}/submissions/my`);
            setExistingSubmission(response.data);
            if (response.data.comment) {
                setComment(response.data.comment);
            }
        } catch (err: any) {
            // 404 is OK - no submission yet
            if (err.response?.status !== 404) {
                console.error('Failed to fetch submission:', err);
            }
        }
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            const newFiles = Array.from(event.target.files);
            setFiles((prev) => [...prev, ...newFiles]);
        }
    };

    const handleRemoveFile = (index: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (files.length === 0 && !comment) {
            setError('Please upload at least one file or provide a comment');
            return;
        }

        const now = new Date();
        const dueDate = assignment ? new Date(assignment.due_at) : null;
        const isLate = dueDate && now > dueDate && !assignment?.allow_late_submission;

        if (isLate) {
            setError('The due date has passed and late submissions are not allowed');
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            const formData = new FormData();
            if (comment) {
                formData.append('comment', comment);
            }

            files.forEach((file) => {
                formData.append('files', file);
            });

            // Always POST to submission endpoint; backend handles resubmit if exists
            await apiClient.post(`/api/assignments/${assignmentId}/submissions`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            enqueueSnackbar(existingSubmission ? 'Submission updated successfully' : 'Assignment submitted successfully', {
                variant: 'success',
            });

            navigate(`/assignments/${assignmentId}`);
        } catch (err: any) {
            console.error('Failed to submit assignment:', err);
            const message = getErrorMessage(err);
            setError(message);
            enqueueSnackbar(message, { variant: 'error' });
        } finally {
            setSubmitting(false);
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

    const now = new Date();
    const dueDate = new Date(assignment.due_at);
    const isOverdue = now > dueDate;
    const canSubmit = !isOverdue || assignment.allow_late_submission;

    return (
        <AppLayout>
            <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Button
                        startIcon={<ArrowBack />}
                        onClick={() => navigate(`/assignments/${assignmentId}`)}
                    >
                        Back
                    </Button>
                </Box>

                <Card>
                    <CardContent>
                        <Typography variant="h4" gutterBottom>
                            {assignment.title}
                        </Typography>

                        <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
                            <Chip
                                icon={<Description />}
                                label={`Course: ${assignment.course?.name || 'Unknown'}`}
                                variant="outlined"
                            />
                            <Chip
                                icon={<CalendarToday />}
                                label={`Due: ${dueDate.toLocaleString('en-US', { hour12: false })}`}
                                color={isOverdue ? 'error' : 'default'}
                                variant="outlined"
                            />
                            {isOverdue && !assignment.allow_late_submission && (
                                <Chip label="OVERDUE - Late submissions not allowed" color="error" />
                            )}
                            {isOverdue && assignment.allow_late_submission && (
                                <Chip label="OVERDUE - Late submission allowed" color="warning" />
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

                        {existingSubmission && (
                            <Alert severity="info" sx={{ mb: 3 }}>
                                <Typography variant="body2">
                                    You have already submitted this assignment on{' '}
                                    {new Date(existingSubmission.submitted_at).toLocaleString('en-US', { hour12: false })}.
                                    {existingSubmission.plagiarism_score !== null && existingSubmission.plagiarism_score !== undefined && (
                                        <>
                                            <br />
                                            <strong>Plagiarism Score:</strong> {existingSubmission.plagiarism_score}%
                                        </>
                                    )}
                                    {existingSubmission.grade && (
                                        <>
                                            <br />
                                            <strong>Grade:</strong> {existingSubmission.grade.score} / 100
                                        </>
                                    )}
                                </Typography>
                            </Alert>
                        )}

                        {error && (
                            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
                                {error}
                            </Alert>
                        )}

                        <Box sx={{ mb: 3 }}>
                            <Typography variant="h6" gutterBottom>
                                Upload Files
                            </Typography>
                            <input
                                accept=".pdf,.doc,.docx,.txt,.zip,.rar"
                                style={{ display: 'none' }}
                                id="file-upload"
                                multiple
                                type="file"
                                onChange={handleFileSelect}
                            />
                            <label htmlFor="file-upload">
                                <Button
                                    variant="outlined"
                                    component="span"
                                    startIcon={<Upload />}
                                    disabled={!canSubmit || submitting}
                                >
                                    Select Files
                                </Button>
                            </label>

                            {files.length > 0 && (
                                <List sx={{ mt: 2 }}>
                                    {files.map((file, index) => (
                                        <ListItem key={index}>
                                            <ListItemText
                                                primary={file.name}
                                                secondary={`${(file.size / 1024).toFixed(2)} KB`}
                                            />
                                            <ListItemSecondaryAction>
                                                <IconButton
                                                    edge="end"
                                                    onClick={() => handleRemoveFile(index)}
                                                    disabled={submitting}
                                                >
                                                    <Delete />
                                                </IconButton>
                                            </ListItemSecondaryAction>
                                        </ListItem>
                                    ))}
                                </List>
                            )}

                            {existingSubmission?.files && existingSubmission.files.length > 0 && (
                                <Box sx={{ mt: 2 }}>
                                    <Typography variant="body2" color="text.secondary" gutterBottom>
                                        Previously uploaded files:
                                    </Typography>
                                    <List>
                                        {existingSubmission.files.map((file) => (
                                            <ListItem key={file.id}>
                                                <ListItemText
                                                    primary={file.original_name}
                                                    secondary={file.file_size ? `${(file.file_size / 1024).toFixed(2)} KB` : ''}
                                                />
                                            </ListItem>
                                        ))}
                                    </List>
                                </Box>
                            )}
                        </Box>

                        <Box sx={{ mb: 3 }}>
                            <TextField
                                fullWidth
                                label="Comment (Optional)"
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                multiline
                                rows={4}
                                placeholder="Add any additional comments or notes..."
                                disabled={!canSubmit || submitting}
                            />
                        </Box>

                        <Alert severity="info" sx={{ mb: 3 }}>
                            <Typography variant="body2">
                                <strong>Submission Process:</strong>
                                <br />
                                1. Upload your files and add comments (if any)
                                <br />
                                2. Click "Submit Assignment" to submit
                                <br />
                                3. System will automatically check for plagiarism
                                <br />
                                4. Your submission will be reviewed by the teacher
                                <br />
                                5. You will receive a notification when graded
                            </Typography>
                        </Alert>

                        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                            <Button
                                variant="outlined"
                                onClick={() => navigate(`/assignments/${assignmentId}`)}
                                disabled={submitting}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="contained"
                                startIcon={existingSubmission ? <CheckCircle /> : <Upload />}
                                onClick={handleSubmit}
                                disabled={!canSubmit || submitting || (files.length === 0 && !comment && !existingSubmission)}
                            >
                                {submitting
                                    ? 'Submitting...'
                                    : existingSubmission
                                    ? 'Update Submission'
                                    : 'Submit Assignment'}
                            </Button>
                        </Box>
                    </CardContent>
                </Card>
            </Box>
        </AppLayout>
    );
}

