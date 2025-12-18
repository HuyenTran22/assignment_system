import { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, Button, Card, CardContent, Chip,
    CircularProgress, Alert, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Accordion, AccordionSummary, AccordionDetails,
    Divider, LinearProgress, Grid
} from '@mui/material';
import {
    CheckCircle, Cancel, History, ExpandMore, ArrowBack, Visibility,
    People, TrendingUp, Assessment
} from '@mui/icons-material';
import AppLayout from '@/shared/components/Layout/AppLayout';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '@/shared/api/client';
import { useSnackbar } from 'notistack';
import { useAuthStore } from '@/shared/store/authStore';
import { QuizAttempt, QuizAttemptDetail } from '../types/quiz.types';

export default function QuizAttemptsPage() {
    const { courseId, quizId, attemptId } = useParams<{ courseId: string; quizId: string; attemptId?: string }>();
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();
    const { user } = useAuthStore();
    const isTeacher = user?.role === 'TEACHER' || user?.role === 'MANAGER' || user?.role === 'ADMIN';

    const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
    const [selectedAttempt, setSelectedAttempt] = useState<QuizAttemptDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [quizInfo, setQuizInfo] = useState<any>(null);

    useEffect(() => {
        if (quizId) {
            fetchAttempts();
            if (attemptId) {
                fetchAttemptDetail(attemptId);
            }
        }
    }, [quizId, attemptId]);

    const fetchAttempts = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get(`/api/courses/quizzes/${quizId}/attempts`);
            setAttempts(response.data);

            // Fetch quiz info for statistics
            if (isTeacher) {
                try {
                    const quizResponse = await apiClient.get(`/api/courses/quizzes/${quizId}`);
                    setQuizInfo(quizResponse.data);
                } catch (err) {
                    console.error('Failed to fetch quiz info:', err);
                }
            }
        } catch (error: any) {
            console.error('Failed to fetch attempts:', error);
            enqueueSnackbar(error.message || 'Failed to load attempts', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const fetchAttemptDetail = async (id: string) => {
        try {
            const response = await apiClient.get(`/api/courses/attempts/${id}`);
            setSelectedAttempt(response.data);
        } catch (error: any) {
            console.error('Failed to fetch attempt detail:', error);
            enqueueSnackbar(error.message || 'Failed to load attempt details', { variant: 'error' });
        }
    };

    const handleViewAttempt = (id: string) => {
        navigate(`/courses/${courseId}/quizzes/${quizId}/attempts/${id}`);
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

    // If viewing a specific attempt, show detail view
    if (attemptId && selectedAttempt) {
        const quiz = selectedAttempt.quiz;
        const answers = selectedAttempt.answers || [];

        return (
            <AppLayout>
                <Box p={3}>
                    <Button
                        startIcon={<ArrowBack />}
                        onClick={() => navigate(`/courses/${courseId}/quizzes/${quizId}/attempts`)}
                        sx={{ mb: 2 }}
                    >
                        Back to Attempts
                    </Button>

                    <Paper sx={{ p: 3, mb: 3 }}>
                        <Typography variant="h4" component="h1" gutterBottom>
                            {quiz?.title || 'Quiz Results'}
                        </Typography>

                        <Box display="flex" gap={2} mb={2} flexWrap="wrap">
                            <Chip
                                icon={selectedAttempt.is_passed ? <CheckCircle /> : <Cancel />}
                                label={selectedAttempt.is_passed ? 'Passed' : 'Failed'}
                                color={selectedAttempt.is_passed ? 'success' : 'error'}
                            />
                            <Chip label={`Score: ${selectedAttempt.score?.toFixed(1)} / ${answers.reduce((sum, a) => sum + (a.question?.points || 0), 0).toFixed(1)}`} />
                            <Chip label={`${selectedAttempt.percentage?.toFixed(1)}%`} color="primary" />
                            {selectedAttempt.time_taken_seconds && (
                                <Chip label={`Time: ${Math.floor(selectedAttempt.time_taken_seconds / 60)}:${(selectedAttempt.time_taken_seconds % 60).toString().padStart(2, '0')}`} />
                            )}
                        </Box>

                        <LinearProgress
                            variant="determinate"
                            value={selectedAttempt.percentage || 0}
                            sx={{ height: 10, borderRadius: 5 }}
                            color={selectedAttempt.is_passed ? 'success' : 'error'}
                        />
                    </Paper>

                    {answers.map((answer, index) => (
                        <Card key={answer.id} sx={{ mb: 2 }}>
                            <CardContent>
                                <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                                    <Typography variant="h6">
                                        Question {index + 1} ({answer.question?.points || 0} points)
                                    </Typography>
                                    <Chip
                                        icon={answer.is_correct ? <CheckCircle /> : <Cancel />}
                                        label={answer.is_correct ? 'Correct' : 'Incorrect'}
                                        color={answer.is_correct ? 'success' : 'error'}
                                        size="small"
                                    />
                                </Box>

                                <Typography variant="body1" paragraph>
                                    {answer.question?.question_text}
                                </Typography>

                                <Divider sx={{ my: 2 }} />

                                <Box mb={2}>
                                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                        Your Answer:
                                    </Typography>
                                    <Typography variant="body1">
                                        {answer.answer_text}
                                    </Typography>
                                </Box>

                                <Box mb={2}>
                                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                        Correct Answer:
                                    </Typography>
                                    <Typography variant="body1" color="success.main">
                                        {answer.question?.correct_answer}
                                    </Typography>
                                </Box>

                                {answer.question?.explanation && (
                                    <Box>
                                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                            Explanation:
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {answer.question.explanation}
                                        </Typography>
                                    </Box>
                                )}

                                <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                                    Points earned: {answer.points_earned} / {answer.question?.points || 0}
                                </Typography>
                            </CardContent>
                        </Card>
                    ))}
                </Box>
            </AppLayout>
        );
    }

    // List view
    return (
        <AppLayout>
            <Box p={3}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                    <Button
                        startIcon={<ArrowBack />}
                        onClick={() => navigate(`/courses/${courseId}/quizzes`)}
                    >
                        Back to Quizzes
                    </Button>
                </Box>

                <Typography variant="h4" component="h1" gutterBottom>
                    Quiz Attempts
                </Typography>

                {/* Statistics for Teachers */}
                {isTeacher && attempts.length > 0 && (
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                        <Grid item xs={12} sm={4}>
                            <Paper sx={{ p: 2, textAlign: 'center' }}>
                                <People sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                                <Typography variant="h4" color="primary">
                                    {new Set(attempts.map(a => a.user_id)).size}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Students Attempted
                                </Typography>
                            </Paper>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <Paper sx={{ p: 2, textAlign: 'center' }}>
                                <Assessment sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                                <Typography variant="h4" color="success.main">
                                    {attempts.filter(a => a.submitted_at).length}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Total Submissions
                                </Typography>
                            </Paper>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <Paper sx={{ p: 2, textAlign: 'center' }}>
                                <TrendingUp sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
                                <Typography variant="h4" color="info.main">
                                    {(() => {
                                        const submittedAttempts = attempts.filter(a => a.percentage !== null && a.percentage !== undefined);
                                        if (submittedAttempts.length === 0) return '0';
                                        const avg = submittedAttempts.reduce((sum, a) => sum + (a.percentage || 0), 0) / submittedAttempts.length;
                                        return avg.toFixed(1);
                                    })()}%
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Average Score
                                </Typography>
                            </Paper>
                        </Grid>
                    </Grid>
                )}

                {attempts.length === 0 ? (
                    <Paper sx={{ p: 4, textAlign: 'center' }}>
                        <History sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                        <Typography variant="h6" color="text.secondary" gutterBottom>
                            No attempts yet
                        </Typography>
                    </Paper>
                ) : (
                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    {isTeacher && <TableCell>Student</TableCell>}
                                    <TableCell>Date</TableCell>
                                    <TableCell>Score</TableCell>
                                    <TableCell>Percentage</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Time Taken</TableCell>
                                    <TableCell>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {attempts.map((attempt) => (
                                    <TableRow key={attempt.id}>
                                        {isTeacher && (
                                            <TableCell>
                                                <Typography variant="body2" fontWeight="medium">
                                                    {attempt.user_name || 'Unknown'}
                                                </Typography>
                                            </TableCell>
                                        )}
                                        <TableCell>
                                            {new Date(attempt.submitted_at || attempt.started_at).toLocaleString('en-US', {
                                                year: 'numeric',
                                                month: '2-digit',
                                                day: '2-digit',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                                hour12: false
                                            })}
                                        </TableCell>
                                        <TableCell>
                                            {attempt.score != null ? attempt.score.toFixed(1) : 'N/A'}
                                        </TableCell>
                                        <TableCell>
                                            {attempt.percentage !== null ? (
                                                <Chip
                                                    label={`${(attempt.percentage ?? 0).toFixed(1)}%`}
                                                    color={attempt.is_passed ? 'success' : 'default'}
                                                    size="small"
                                                />
                                            ) : 'N/A'}
                                        </TableCell>
                                        <TableCell>
                                            {attempt.is_passed !== null ? (
                                                <Chip
                                                    icon={attempt.is_passed ? <CheckCircle /> : <Cancel />}
                                                    label={attempt.is_passed ? 'Passed' : 'Failed'}
                                                    color={attempt.is_passed ? 'success' : 'error'}
                                                    size="small"
                                                />
                                            ) : (
                                                <Chip label="In Progress" size="small" />
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {attempt.time_taken_seconds
                                                ? `${Math.floor(attempt.time_taken_seconds / 60)}:${(attempt.time_taken_seconds % 60).toString().padStart(2, '0')}`
                                                : 'N/A'}
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                size="small"
                                                startIcon={<Visibility />}
                                                onClick={() => handleViewAttempt(attempt.id)}
                                            >
                                                View
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Box>
        </AppLayout>
    );
}

