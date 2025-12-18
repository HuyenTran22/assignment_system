import { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, Button, List, ListItem, ListItemText,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField,
    IconButton, CircularProgress, Alert, Chip, FormControl, InputLabel,
    Select, MenuItem, Grid, Divider, Accordion, AccordionSummary, AccordionDetails
} from '@mui/material';
import {
    Add, Edit, Delete, ArrowUpward, ArrowDownward, ExpandMore,
    QuestionAnswer, RadioButtonChecked, CheckBox, ShortText
} from '@mui/icons-material';
import AppLayout from '@/shared/components/Layout/AppLayout';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '@/shared/api/client';
import { useSnackbar } from 'notistack';
import { QuizQuestion, QuizQuestionCreate, QuizQuestionUpdate } from '../types/quiz.types';

export default function QuizQuestionsPage() {
    const { courseId, quizId } = useParams<{ courseId: string; quizId: string }>();
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();

    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState<QuizQuestion | null>(null);
    const [formData, setFormData] = useState<QuizQuestionCreate>({
        quiz_id: quizId || '',
        question_text: '',
        question_type: 'multiple_choice',
        options: [],
        correct_answer: '',
        points: 1,
        order_index: 0,
        explanation: ''
    });
    const [newOption, setNewOption] = useState('');

    useEffect(() => {
        if (quizId) {
            fetchQuestions();
        }
    }, [quizId]);

    const fetchQuestions = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get(`/api/courses/quizzes/${quizId}/questions?include_answers=true`);
            setQuestions(response.data);
        } catch (error: any) {
            console.error('Failed to fetch questions:', error);
            enqueueSnackbar(error.message || 'Failed to load questions', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = (question?: QuizQuestion) => {
        if (question) {
            setEditingQuestion(question);
            setFormData({
                quiz_id: question.quiz_id,
                question_text: question.question_text,
                question_type: question.question_type,
                options: question.options || [],
                correct_answer: question.correct_answer || '',
                points: question.points,
                order_index: question.order_index,
                explanation: question.explanation || ''
            });
        } else {
            setEditingQuestion(null);
            setFormData({
                quiz_id: quizId || '',
                question_text: '',
                question_type: 'multiple_choice',
                options: [],
                correct_answer: '',
                points: 1,
                order_index: questions.length,
                explanation: ''
            });
        }
        setNewOption('');
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setEditingQuestion(null);
    };

    const handleAddOption = () => {
        if (newOption.trim() && !formData.options?.includes(newOption.trim())) {
            setFormData({
                ...formData,
                options: [...(formData.options || []), newOption.trim()]
            });
            setNewOption('');
        }
    };

    const handleRemoveOption = (option: string) => {
        setFormData({
            ...formData,
            options: formData.options?.filter(o => o !== option) || []
        });
    };

    const handleSubmit = async () => {
        try {
            // Validate
            if (formData.question_type === 'multiple_choice') {
                if (!formData.options || formData.options.length < 2) {
                    enqueueSnackbar('Multiple choice questions require at least 2 options', { variant: 'error' });
                    return;
                }
                if (!formData.options.includes(formData.correct_answer)) {
                    enqueueSnackbar('Correct answer must be one of the options', { variant: 'error' });
                    return;
                }
            }

            if (editingQuestion) {
                const updateData: QuizQuestionUpdate = {
                    question_text: formData.question_text,
                    question_type: formData.question_type,
                    options: formData.options,
                    correct_answer: formData.correct_answer,
                    points: formData.points,
                    order_index: formData.order_index,
                    explanation: formData.explanation
                };
                await apiClient.put(`/api/courses/questions/${editingQuestion.id}`, updateData);
                enqueueSnackbar('Question updated successfully', { variant: 'success' });
            } else {
                await apiClient.post(`/api/courses/quizzes/${quizId}/questions`, formData);
                enqueueSnackbar('Question created successfully', { variant: 'success' });
            }
            handleCloseDialog();
            fetchQuestions();
        } catch (error: any) {
            console.error('Failed to save question:', error);
            enqueueSnackbar(error.message || 'Failed to save question', { variant: 'error' });
        }
    };

    const handleDelete = async (questionId: string) => {
        if (!window.confirm('Are you sure you want to delete this question?')) {
            return;
        }

        // Optimistic update
        const previousQuestions = [...questions];
        setQuestions(questions.filter(q => q.id !== questionId));

        try {
            await apiClient.delete(`/api/courses/questions/${questionId}`);
            enqueueSnackbar('Question deleted successfully', { variant: 'success' });
            fetchQuestions(); // Refresh to ensure consistency
        } catch (error: any) {
            console.error('Failed to delete question:', error);
            // Revert optimistic update
            setQuestions(previousQuestions);
            enqueueSnackbar(error.response?.data?.detail || error.message || 'Failed to delete question', { variant: 'error' });
        }
    };

    const handleMoveQuestion = async (questionId: string, direction: 'up' | 'down') => {
        const question = questions.find(q => q.id === questionId);
        if (!question) return;

        const currentIndex = question.order_index;
        const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

        const targetQuestion = questions.find(q => q.order_index === newIndex);
        if (!targetQuestion) return;

        try {
            // Swap order indices
            await apiClient.put(`/api/courses/questions/${questionId}`, { order_index: newIndex });
            await apiClient.put(`/api/courses/questions/${targetQuestion.id}`, { order_index: currentIndex });
            fetchQuestions();
        } catch (error: any) {
            console.error('Failed to move question:', error);
            enqueueSnackbar(error.message || 'Failed to move question', { variant: 'error' });
        }
    };

    const getQuestionTypeIcon = (type: string) => {
        switch (type) {
            case 'multiple_choice':
                return <RadioButtonChecked />;
            case 'true_false':
                return <CheckBox />;
            case 'short_answer':
                return <ShortText />;
            default:
                return <QuestionAnswer />;
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
                    <Button onClick={() => navigate(`/courses/${courseId}/quizzes`)}>
                        ← Back to Quizzes
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<Add />}
                        onClick={() => handleOpenDialog()}
                    >
                        Add Question
                    </Button>
                </Box>

                <Typography variant="h4" component="h1" gutterBottom>
                    Quiz Questions
                </Typography>

                {questions.length === 0 ? (
                    <Paper sx={{ p: 4, textAlign: 'center' }}>
                        <QuestionAnswer sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                        <Typography variant="h6" color="text.secondary" gutterBottom>
                            No questions yet
                        </Typography>
                        <Typography variant="body2" color="text.secondary" mb={2}>
                            Add questions to your quiz
                        </Typography>
                    </Paper>
                ) : (
                    <List>
                        {questions.map((question, index) => (
                            <Accordion key={question.id}>
                                <AccordionSummary expandIcon={<ExpandMore />}>
                                    <Box display="flex" alignItems="center" width="100%">
                                        <Box display="flex" alignItems="center" flex={1}>
                                            <Chip
                                                icon={getQuestionTypeIcon(question.question_type)}
                                                label={question.question_type.replace('_', ' ')}
                                                size="small"
                                                sx={{ mr: 2 }}
                                            />
                                            <Typography variant="body1" sx={{ flex: 1 }}>
                                                {index + 1}. {question.question_text}
                                            </Typography>
                                        </Box>
                                        <Chip label={`${question.points} pts`} size="small" sx={{ mr: 2 }} />
                                        <IconButton
                                            size="small"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleMoveQuestion(question.id, 'up');
                                            }}
                                            disabled={index === 0}
                                        >
                                            <ArrowUpward />
                                        </IconButton>
                                        <IconButton
                                            size="small"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleMoveQuestion(question.id, 'down');
                                            }}
                                            disabled={index === questions.length - 1}
                                        >
                                            <ArrowDownward />
                                        </IconButton>
                                        <IconButton
                                            size="small"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleOpenDialog(question);
                                            }}
                                        >
                                            <Edit />
                                        </IconButton>
                                        <IconButton
                                            size="small"
                                            color="error"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(question.id);
                                            }}
                                        >
                                            <Delete />
                                        </IconButton>
                                    </Box>
                                </AccordionSummary>
                                <AccordionDetails>
                                    <Box>
                                        {question.question_type === 'multiple_choice' && question.options && (
                                            <Box mb={2}>
                                                <Typography variant="subtitle2" gutterBottom>
                                                    Options:
                                                </Typography>
                                                {question.options.map((option, optIndex) => (
                                                    <Chip
                                                        key={optIndex}
                                                        label={option}
                                                        color={option === question.correct_answer ? 'success' : 'default'}
                                                        sx={{ mr: 1, mb: 1 }}
                                                    />
                                                ))}
                                            </Box>
                                        )}
                                        <Typography variant="body2" color="text.secondary">
                                            <strong>Correct Answer:</strong> {question.correct_answer}
                                        </Typography>
                                        {question.explanation && (
                                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                                <strong>Explanation:</strong> {question.explanation}
                                            </Typography>
                                        )}
                                    </Box>
                                </AccordionDetails>
                            </Accordion>
                        ))}
                    </List>
                )}

                {/* Create/Edit Dialog */}
                <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
                    <DialogTitle>
                        {editingQuestion ? 'Edit Question' : 'Create Question'}
                    </DialogTitle>
                    <DialogContent>
                        <Box sx={{ pt: 2 }}>
                            <FormControl fullWidth margin="normal">
                                <InputLabel>Question Type</InputLabel>
                                <Select
                                    value={formData.question_type}
                                    onChange={(e) => {
                                        const newType = e.target.value as 'multiple_choice' | 'true_false' | 'short_answer';
                                        setFormData({
                                            ...formData,
                                            question_type: newType,
                                            options: newType === 'multiple_choice' ? formData.options : undefined,
                                            correct_answer: newType === 'true_false' ? '' : formData.correct_answer
                                        });
                                    }}
                                    label="Question Type"
                                >
                                    <MenuItem value="multiple_choice">Multiple Choice</MenuItem>
                                    <MenuItem value="true_false">True/False</MenuItem>
                                    <MenuItem value="short_answer">Short Answer</MenuItem>
                                </Select>
                            </FormControl>

                            <TextField
                                fullWidth
                                label="Question Text"
                                value={formData.question_text}
                                onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
                                margin="normal"
                                required
                                multiline
                                rows={3}
                            />

                            {formData.question_type === 'multiple_choice' && (
                                <Box sx={{ mt: 2 }}>
                                    <Typography variant="subtitle2" gutterBottom>
                                        Options:
                                    </Typography>
                                    <Box display="flex" gap={1} mb={2}>
                                        <TextField
                                            fullWidth
                                            size="small"
                                            placeholder="Add option"
                                            value={newOption}
                                            onChange={(e) => setNewOption(e.target.value)}
                                            onKeyPress={(e) => {
                                                if (e.key === 'Enter') {
                                                    handleAddOption();
                                                }
                                            }}
                                        />
                                        <Button onClick={handleAddOption} variant="outlined">
                                            Add
                                        </Button>
                                    </Box>
                                    {formData.options && formData.options.length > 0 && (
                                        <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
                                            {formData.options.map((option, index) => (
                                                <Chip
                                                    key={index}
                                                    label={option}
                                                    onDelete={() => handleRemoveOption(option)}
                                                    color={option === formData.correct_answer ? 'success' : 'default'}
                                                />
                                            ))}
                                        </Box>
                                    )}
                                    <FormControl fullWidth margin="normal">
                                        <InputLabel>Correct Answer</InputLabel>
                                        <Select
                                            value={formData.correct_answer}
                                            onChange={(e) => setFormData({ ...formData, correct_answer: e.target.value })}
                                            label="Correct Answer"
                                        >
                                            {formData.options?.map((option) => (
                                                <MenuItem key={option} value={option}>
                                                    {option}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Box>
                            )}

                            {formData.question_type === 'true_false' && (
                                <FormControl fullWidth margin="normal">
                                    <InputLabel>Correct Answer</InputLabel>
                                    <Select
                                        value={formData.correct_answer}
                                        onChange={(e) => setFormData({ ...formData, correct_answer: e.target.value })}
                                        label="Correct Answer"
                                    >
                                        <MenuItem value="true">True</MenuItem>
                                        <MenuItem value="false">False</MenuItem>
                                    </Select>
                                </FormControl>
                            )}

                            {formData.question_type === 'short_answer' && (
                                <TextField
                                    fullWidth
                                    label="Correct Answer"
                                    value={formData.correct_answer}
                                    onChange={(e) => setFormData({ ...formData, correct_answer: e.target.value })}
                                    margin="normal"
                                    required
                                />
                            )}

                            <TextField
                                fullWidth
                                label="Points"
                                type="number"
                                value={formData.points}
                                onChange={(e) => setFormData({ ...formData, points: parseFloat(e.target.value) || 1 })}
                                margin="normal"
                                required
                                inputProps={{ min: 0, step: 0.1 }}
                            />

                            <TextField
                                fullWidth
                                label="Explanation (shown after submission)"
                                value={formData.explanation}
                                onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                                margin="normal"
                                multiline
                                rows={2}
                            />
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseDialog}>Cancel</Button>
                        <Button onClick={handleSubmit} variant="contained" disabled={!formData.question_text || !formData.correct_answer}>
                            {editingQuestion ? 'Update' : 'Create'}
                        </Button>
                    </DialogActions>
                </Dialog>
            </Box>
        </AppLayout>
    );
}

