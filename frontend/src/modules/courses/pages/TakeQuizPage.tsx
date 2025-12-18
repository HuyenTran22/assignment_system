import { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, Button, Radio, RadioGroup, FormControlLabel,
    TextField, CircularProgress, Alert, LinearProgress, Dialog, DialogTitle,
    DialogContent, DialogActions, Chip, Card, CardContent, Divider
} from '@mui/material';
import {
    CheckCircle, Cancel, AccessTime, Timer
} from '@mui/icons-material';
import AppLayout from '@/shared/components/Layout/AppLayout';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '@/shared/api/client';
import { useSnackbar } from 'notistack';
import { QuizAttemptWithQuestions, QuizQuestion, QuizAnswerSubmit } from '../types/quiz.types';

export default function TakeQuizPage() {
    const { courseId, quizId } = useParams<{ courseId: string; quizId: string }>();
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();

    const [attempt, setAttempt] = useState<QuizAttemptWithQuestions | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

    useEffect(() => {
        if (quizId) {
            startQuiz();
        }
    }, [quizId]);

    useEffect(() => {
        if (timeRemaining !== null && timeRemaining > 0 && attempt?.quiz?.end_time) {
            const timer = setInterval(() => {
                // Recalculate from end_time to avoid drift
                if (attempt && attempt.quiz && attempt.quiz.end_time) {
                    const endTime = new Date(attempt.quiz.end_time);
                    const now = new Date();
                    const remaining = Math.floor((endTime.getTime() - now.getTime()) / 1000);
                    
                    if (remaining <= 0) {
                        setTimeRemaining(0);
                        handleSubmit();
                        return;
                    }
                    
                    setTimeRemaining(remaining);
                } else {
                    // Fallback: decrement by 1 second
                    setTimeRemaining(prev => {
                        if (prev === null || prev <= 1) {
                            handleSubmit();
                            return 0;
                        }
                        return prev - 1;
                    });
                }
            }, 1000);

            return () => clearInterval(timer);
        }
    }, [timeRemaining, attempt]);

    const startQuiz = async () => {
        try {
            setLoading(true);
            const response = await apiClient.post(`/api/courses/quizzes/${quizId}/start`);
            setAttempt(response.data);
            
            // Initialize answers
            const initialAnswers: Record<string, string> = {};
            response.data.quiz?.questions?.forEach((q: QuizQuestion) => {
                initialAnswers[q.id] = '';
            });
            setAnswers(initialAnswers);

            // Calculate time remaining based on end_time
            if (response.data.quiz?.end_time) {
                const endTime = new Date(response.data.quiz.end_time);
                const now = new Date();
                const remainingSeconds = Math.floor((endTime.getTime() - now.getTime()) / 1000);
                setTimeRemaining(Math.max(0, remainingSeconds));
            }
        } catch (error: any) {
            console.error('Failed to start quiz:', error);
            const errorMsg = error.response?.data?.detail || error.message || 'Failed to start quiz';
            enqueueSnackbar(errorMsg, { variant: 'error', autoHideDuration: 5000 });
            
            // Only navigate back if it's a permission/validation error (403, 400)
            // Don't navigate on network errors (let user retry)
            if (error.response?.status === 403 || error.response?.status === 400) {
                // Wait a bit before navigating to let user see the error message
                setTimeout(() => {
                    navigate(`/courses/${courseId}/quizzes`);
                }, 2000);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleAnswerChange = (questionId: string, answer: string) => {
        setAnswers({ ...answers, [questionId]: answer });
    };

    const handleSubmit = async () => {
        if (!attempt) return;

        setConfirmDialogOpen(false);
        setSubmitting(true);

        try {
            const submitAnswers: QuizAnswerSubmit[] = Object.entries(answers)
                .filter(([_, answer]) => answer.trim() !== '')
                .map(([questionId, answerText]) => ({
                    question_id: questionId,
                    answer_text: answerText
                }));

            const response = await apiClient.post(
                `/api/courses/quizzes/${quizId}/submit`,
                { answers: submitAnswers }
            );

            navigate(`/courses/${courseId}/quizzes/${quizId}/attempts/${response.data.id}`);
        } catch (error: any) {
            console.error('Failed to submit quiz:', error);
            const errorMsg = error.response?.data?.detail || error.message || 'Failed to submit quiz';
            enqueueSnackbar(errorMsg, { variant: 'error' });
            
            // If quiz closed, redirect back to quiz list
            if (error.response?.status === 400 && (errorMsg.includes('closed') || errorMsg.includes('deadline'))) {
                setTimeout(() => {
                    navigate(`/courses/${courseId}/quizzes`);
                }, 2000);
            }
        } finally {
            setSubmitting(false);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
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

    if (!attempt || !attempt.quiz) {
        return (
            <AppLayout>
                <Alert severity="error">Quiz not found</Alert>
            </AppLayout>
        );
    }

    const quiz = attempt.quiz;
    const questions = quiz.questions || [];
    const answeredCount = Object.values(answers).filter(a => a.trim() !== '').length;

    return (
        <AppLayout>
            <Box p={3}>
                <Paper sx={{ p: 3, mb: 3 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h4" component="h1">
                            {quiz.title}
                        </Typography>
                        {timeRemaining !== null && (
                            <Chip
                                icon={<Timer />}
                                label={formatTime(timeRemaining)}
                                color={timeRemaining < 60 ? 'error' : 'primary'}
                                sx={{ fontSize: '1rem', height: '40px' }}
                            />
                        )}
                    </Box>

                    {quiz.description && (
                        <Typography variant="body1" color="text.secondary" paragraph>
                            {quiz.description}
                        </Typography>
                    )}

                    <Box display="flex" gap={2} mb={2}>
                        <Chip label={`${questions.length} questions`} />
                        <Chip label={`Passing: ${quiz.passing_score}%`} color="primary" />
                        <Chip label={`${answeredCount}/${questions.length} answered`} />
                    </Box>

                    {timeRemaining !== null && quiz.end_time && (
                        <Box mb={2}>
                            {(() => {
                                const endTime = new Date(quiz.end_time).getTime();
                                const startTime = quiz.start_time ? new Date(quiz.start_time).getTime() : new Date(attempt.started_at).getTime();
                                const totalDuration = (endTime - startTime) / 1000;
                                const progress = totalDuration > 0 ? (timeRemaining / totalDuration) * 100 : 0;
                                return (
                                    <>
                                        <LinearProgress
                                            variant="determinate"
                                            value={Math.max(0, Math.min(100, progress))}
                                            sx={{ height: 8, borderRadius: 4 }}
                                        />
                                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                                            Quiz closes at {new Date(quiz.end_time).toLocaleString('en-US', { 
                                                year: 'numeric', 
                                                month: '2-digit', 
                                                day: '2-digit', 
                                                hour: '2-digit', 
                                                minute: '2-digit', 
                                                hour12: false 
                                            })}
                                        </Typography>
                                    </>
                                );
                            })()}
                        </Box>
                    )}
                </Paper>

                {questions.map((question, index) => (
                    <Card key={question.id} sx={{ mb: 3 }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Question {index + 1} ({question.points} points)
                            </Typography>
                            <Typography variant="body1" paragraph>
                                {question.question_text}
                            </Typography>

                            {question.question_type === 'multiple_choice' && question.options && (
                                <RadioGroup
                                    value={answers[question.id] || ''}
                                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                                >
                                    {question.options.map((option, optIndex) => (
                                        <FormControlLabel
                                            key={optIndex}
                                            value={option}
                                            control={<Radio />}
                                            label={option}
                                        />
                                    ))}
                                </RadioGroup>
                            )}

                            {question.question_type === 'true_false' && (
                                <RadioGroup
                                    value={answers[question.id] || ''}
                                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                                >
                                    <FormControlLabel value="true" control={<Radio />} label="True" />
                                    <FormControlLabel value="false" control={<Radio />} label="False" />
                                </RadioGroup>
                            )}

                            {question.question_type === 'short_answer' && (
                                <TextField
                                    fullWidth
                                    multiline
                                    rows={3}
                                    value={answers[question.id] || ''}
                                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                                    placeholder="Enter your answer"
                                />
                            )}
                        </CardContent>
                    </Card>
                ))}

                <Box display="flex" justifyContent="space-between" mt={4}>
                    <Button
                        variant="outlined"
                        onClick={() => navigate(`/courses/${courseId}/quizzes`)}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        size="large"
                        onClick={() => setConfirmDialogOpen(true)}
                        disabled={submitting}
                    >
                        Submit Quiz
                    </Button>
                </Box>

                {/* Confirm Dialog */}
                <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)}>
                    <DialogTitle>Submit Quiz?</DialogTitle>
                    <DialogContent>
                        <Typography>
                            You have answered {answeredCount} out of {questions.length} questions.
                            Are you sure you want to submit?
                        </Typography>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSubmit} variant="contained" disabled={submitting}>
                            {submitting ? <CircularProgress size={24} /> : 'Submit'}
                        </Button>
                    </DialogActions>
                </Dialog>
            </Box>
        </AppLayout>
    );
}

