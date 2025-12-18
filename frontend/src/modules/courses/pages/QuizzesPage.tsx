import { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, Button, Grid, Card, CardContent, CardActions,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField,
    FormControlLabel, Checkbox, IconButton, CircularProgress, Alert,
    Chip, MenuItem, Select, FormControl, InputLabel, Divider
} from '@mui/material';
import {
    Add, Edit, Delete, Quiz as QuizIcon, AccessTime, CheckCircle, Cancel,
    Visibility, PlayArrow, History, People
} from '@mui/icons-material';
import AppLayout from '@/shared/components/Layout/AppLayout';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '@/shared/api/client';
import { useSnackbar } from 'notistack';
import { useAuthStore } from '@/shared/store/authStore';
import { Quiz, QuizCreate, QuizUpdate } from '../types/quiz.types';
import DateTimePicker24h from '@/shared/components/DateTimePicker24h';

export default function QuizzesPage() {
    const { courseId } = useParams<{ courseId: string }>();
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();
    const { user } = useAuthStore();
    const isTeacher = user?.role === 'TEACHER' || user?.role === 'MANAGER' || user?.role === 'ADMIN';

    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
    const [formData, setFormData] = useState<QuizCreate>({
        course_id: courseId || '',
        title: '',
        description: '',
        start_time: undefined,
        end_time: undefined,
        max_attempts: 1,
        passing_score: 60,
        is_published: false,
        shuffle_questions: false,
        due_date: undefined
    });
    const [startTime, setStartTime] = useState<string>('');
    const [endTime, setEndTime] = useState<string>('');

    useEffect(() => {
        if (courseId) {
            fetchQuizzes();
        }
    }, [courseId]);

    const fetchQuizzes = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get(`/api/courses/${courseId}/quizzes`);
            setQuizzes(response.data);
        } catch (error: any) {
            console.error('Failed to fetch quizzes:', error);
            enqueueSnackbar(error.message || 'Failed to load quizzes', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = (quiz?: Quiz) => {
        if (quiz) {
            setEditingQuiz(quiz);
            setFormData({
                course_id: quiz.course_id,
                title: quiz.title,
                description: quiz.description || '',
                start_time: quiz.start_time,
                end_time: quiz.end_time,
                max_attempts: quiz.max_attempts,
                passing_score: quiz.passing_score,
                is_published: quiz.is_published,
                shuffle_questions: quiz.shuffle_questions,
                due_date: quiz.due_date
            });
            // Convert UTC to local time for datetime-local input (format: YYYY-MM-DDTHH:mm)
            if (quiz.start_time) {
                const startDate = new Date(quiz.start_time);
                const localStart = new Date(startDate.getTime() - startDate.getTimezoneOffset() * 60000);
                setStartTime(localStart.toISOString().slice(0, 16));
            } else {
                setStartTime('');
            }
            if (quiz.end_time) {
                const endDate = new Date(quiz.end_time);
                const localEnd = new Date(endDate.getTime() - endDate.getTimezoneOffset() * 60000);
                setEndTime(localEnd.toISOString().slice(0, 16));
            } else {
                setEndTime('');
            }
        } else {
            setEditingQuiz(null);
            setFormData({
                course_id: courseId || '',
                title: '',
                description: '',
                start_time: undefined,
                end_time: undefined,
                max_attempts: 1,
                passing_score: 60,
                is_published: false,
                shuffle_questions: false,
                due_date: undefined
            });
            setStartTime('');
            setEndTime('');
        }
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setEditingQuiz(null);
    };

    const handleSubmit = async () => {
        // Validation
        if (!endTime) {
            enqueueSnackbar('End Time is required', { variant: 'error' });
            return;
        }

        if (startTime && endTime && endTime <= startTime) {
            enqueueSnackbar('End time must be after start time', { variant: 'error' });
            return;
        }

        try {
            // Convert local datetime to UTC for backend
            let startTimeUTC: string | undefined = undefined;
            let endTimeUTC: string | undefined = undefined;

            if (startTime) {
                // datetime-local gives us local time, convert to UTC
                const localStart = new Date(startTime);
                startTimeUTC = localStart.toISOString();
            }

            if (endTime) {
                const localEnd = new Date(endTime);
                endTimeUTC = localEnd.toISOString();
            }

            const submitData = {
                ...formData,
                start_time: startTimeUTC,
                end_time: endTimeUTC
            };

            if (editingQuiz) {
                await apiClient.put(`/api/courses/quizzes/${editingQuiz.id}`, submitData);
                enqueueSnackbar('Quiz updated successfully', { variant: 'success' });
            } else {
                await apiClient.post(`/api/courses/${courseId}/quizzes`, submitData);
                enqueueSnackbar('Quiz created successfully', { variant: 'success' });
            }
            handleCloseDialog();
            fetchQuizzes();
        } catch (error: any) {
            console.error('Failed to save quiz:', error);
            enqueueSnackbar(error.response?.data?.detail || error.message || 'Failed to save quiz', { variant: 'error' });
        }
    };

    const handleDelete = async (quizId: string) => {
        if (!window.confirm('Are you sure you want to delete this quiz?')) {
            return;
        }

        // Optimistic update
        const previousQuizzes = [...quizzes];
        setQuizzes(quizzes.filter(q => q.id !== quizId));

        try {
            await apiClient.delete(`/api/courses/quizzes/${quizId}`);
            enqueueSnackbar('Quiz deleted successfully', { variant: 'success' });
            fetchQuizzes(); // Refresh to ensure consistency
        } catch (error: any) {
            console.error('Failed to delete quiz:', error);
            // Revert optimistic update
            setQuizzes(previousQuizzes);
            enqueueSnackbar(error.response?.data?.detail || error.message || 'Failed to delete quiz', { variant: 'error' });
        }
    };

    const handleStartQuiz = (quizId: string) => {
        navigate(`/courses/${courseId}/quizzes/${quizId}/take`);
    };

    const handleViewAttempts = (quizId: string) => {
        navigate(`/courses/${courseId}/quizzes/${quizId}/attempts`);
    };

    const handleManageQuestions = (quizId: string) => {
        navigate(`/courses/${courseId}/quizzes/${quizId}/questions`);
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
                        Quizzes
                    </Typography>
                    {isTeacher && (
                        <Button
                            variant="contained"
                            startIcon={<Add />}
                            onClick={() => handleOpenDialog()}
                        >
                            Create Quiz
                        </Button>
                    )}
                </Box>

                {quizzes.length === 0 ? (
                    <Paper sx={{ p: 4, textAlign: 'center' }}>
                        <QuizIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                        <Typography variant="h6" color="text.secondary" gutterBottom>
                            No quizzes yet
                        </Typography>
                        {isTeacher && (
                            <Typography variant="body2" color="text.secondary" mb={2}>
                                Create your first quiz to get started
                            </Typography>
                        )}
                    </Paper>
                ) : (
                    <Grid container spacing={3}>
                        {quizzes.map((quiz) => (
                            <Grid item xs={12} md={6} lg={4} key={quiz.id}>
                                <Card>
                                    <CardContent>
                                        <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                                            <Typography variant="h6" component="h2">
                                                {quiz.title}
                                            </Typography>
                                            {!quiz.is_published && (
                                                <Chip label="Draft" size="small" color="default" />
                                            )}
                                        </Box>

                                        {quiz.description && (
                                            <Typography variant="body2" color="text.secondary" paragraph>
                                                {quiz.description}
                                            </Typography>
                                        )}

                                        <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
                                            {quiz.time_limit_minutes && (
                                                <Chip
                                                    icon={<AccessTime />}
                                                    label={`${quiz.time_limit_minutes} min`}
                                                    size="small"
                                                />
                                            )}
                                            <Chip
                                                label={`${quiz.question_count || 0} questions`}
                                                size="small"
                                            />
                                            <Chip
                                                label={`Pass: ${quiz.passing_score}%`}
                                                size="small"
                                                color="primary"
                                            />
                                        </Box>

                                        {quiz.due_date && (
                                            <Typography variant="caption" color="text.secondary">
                                                Due: {new Date(quiz.due_date).toLocaleString('en-US', {
                                                    year: 'numeric',
                                                    month: '2-digit',
                                                    day: '2-digit',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                    hour12: false
                                                })}
                                            </Typography>
                                        )}
                                    </CardContent>

                                    <CardActions>
                                        {isTeacher ? (
                                            <>
                                                <Button
                                                    size="small"
                                                    startIcon={<Edit />}
                                                    onClick={() => handleOpenDialog(quiz)}
                                                >
                                                    Edit
                                                </Button>
                                                <Button
                                                    size="small"
                                                    startIcon={<Visibility />}
                                                    onClick={() => handleManageQuestions(quiz.id)}
                                                >
                                                    Questions
                                                </Button>
                                                <Button
                                                    size="small"
                                                    startIcon={<History />}
                                                    onClick={() => handleViewAttempts(quiz.id)}
                                                >
                                                    Attempts
                                                </Button>
                                                <Button
                                                    size="small"
                                                    startIcon={<People />}
                                                    onClick={() => navigate(`/courses/${courseId}/quizzes/${quiz.id}/students`)}
                                                >
                                                    Students
                                                </Button>
                                                <IconButton
                                                    size="small"
                                                    color="error"
                                                    onClick={() => handleDelete(quiz.id)}
                                                >
                                                    <Delete />
                                                </IconButton>
                                            </>
                                        ) : (
                                            quiz.is_published && (() => {
                                                const attemptCount = quiz.user_attempt_count || 0;
                                                const maxAttempts = quiz.max_attempts;
                                                const hasSubmitted = quiz.has_submitted || false;
                                                const canAttempt = attemptCount < maxAttempts && !hasSubmitted;

                                                return (
                                                    <Box sx={{ width: '100%' }}>
                                                        {hasSubmitted && (
                                                            <Alert severity="info" sx={{ mb: 1 }}>
                                                                You have already submitted this quiz. View your results in Attempts.
                                                            </Alert>
                                                        )}
                                                        {!hasSubmitted && !canAttempt && (
                                                            <Alert severity="warning" sx={{ mb: 1 }}>
                                                                Maximum attempts ({maxAttempts}) reached
                                                            </Alert>
                                                        )}
                                                        {canAttempt && attemptCount > 0 && (
                                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                                                                Attempts: {attemptCount}/{maxAttempts}
                                                            </Typography>
                                                        )}
                                                        <Button
                                                            variant="contained"
                                                            size="small"
                                                            startIcon={<PlayArrow />}
                                                            onClick={() => handleStartQuiz(quiz.id)}
                                                            disabled={!canAttempt}
                                                            fullWidth
                                                        >
                                                            {hasSubmitted ? 'Quiz Submitted' : canAttempt ? 'Start Quiz' : 'Max Attempts Reached'}
                                                        </Button>
                                                        {hasSubmitted && (
                                                            <Button
                                                                variant="outlined"
                                                                size="small"
                                                                startIcon={<History />}
                                                                onClick={() => handleViewAttempts(quiz.id)}
                                                                fullWidth
                                                                sx={{ mt: 1 }}
                                                            >
                                                                View Results
                                                            </Button>
                                                        )}
                                                    </Box>
                                                );
                                            })()
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
                        {editingQuiz ? 'Edit Quiz' : 'Create Quiz'}
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
                                autoFocus
                            />

                            <TextField
                                fullWidth
                                label="Description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                margin="normal"
                                multiline
                                rows={3}
                                placeholder="Optional: Add a description for this quiz"
                            />

                            <Box sx={{ mt: 3 }}>
                                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                                    Quiz Schedule (24-hour format)
                                </Typography>
                                <Grid container spacing={3}>
                                    <Grid item xs={12} md={6}>
                                        <DateTimePicker24h
                                            label="Start Time"
                                            value={startTime}
                                            onChange={(value) => setStartTime(value)}
                                            helperText="When quiz becomes available"
                                            min={new Date().toISOString().slice(0, 16)}
                                        />
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        <DateTimePicker24h
                                            label="End Time"
                                            value={endTime}
                                            onChange={(value) => setEndTime(value)}
                                            helperText="When quiz closes"
                                            required
                                            min={startTime || new Date().toISOString().slice(0, 16)}
                                            error={!!(endTime && startTime && endTime <= startTime)}
                                        />
                                        {endTime && startTime && endTime <= startTime && (
                                            <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                                                End time must be after start time
                                            </Typography>
                                        )}
                                        {endTime && startTime && endTime > startTime && (
                                            <Typography variant="caption" color="success.main" sx={{ mt: 0.5, display: 'block' }}>
                                                Duration: {Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / (1000 * 60 * 60) * 10) / 10} hours
                                            </Typography>
                                        )}
                                    </Grid>
                                </Grid>
                            </Box>

                            <Box sx={{ mt: 3 }}>
                                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                                    Quiz Settings
                                </Typography>
                                <Grid container spacing={2}>
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            fullWidth
                                            label="Max Attempts"
                                            type="number"
                                            value={formData.max_attempts}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                max_attempts: parseInt(e.target.value) || 1
                                            })}
                                            margin="normal"
                                            required
                                            inputProps={{ min: 1 }}
                                            helperText="Maximum number of attempts allowed"
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            fullWidth
                                            label="Passing Score (%)"
                                            type="number"
                                            value={formData.passing_score}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                passing_score: parseFloat(e.target.value) || 60
                                            })}
                                            margin="normal"
                                            required
                                            inputProps={{ min: 0, max: 100, step: 0.1 }}
                                            helperText="Minimum score to pass (0-100)"
                                        />
                                    </Grid>
                                </Grid>
                            </Box>

                            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={formData.is_published}
                                            onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                                        />
                                    }
                                    label="Published"
                                />

                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={formData.shuffle_questions}
                                            onChange={(e) => setFormData({ ...formData, shuffle_questions: e.target.checked })}
                                        />
                                    }
                                    label="Shuffle Questions"
                                />
                            </Box>
                        </Box>
                    </DialogContent>
                    <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                        <Button onClick={handleCloseDialog}>Cancel</Button>
                        <Button
                            onClick={handleSubmit}
                            variant="contained"
                            disabled={!formData.title || !endTime}
                        >
                            {editingQuiz ? 'Update' : 'Create'}
                        </Button>
                    </DialogActions>
                </Dialog>
            </Box>
        </AppLayout>
    );
}

