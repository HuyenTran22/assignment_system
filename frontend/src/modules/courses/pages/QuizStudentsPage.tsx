import { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, Button, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Chip, CircularProgress, Alert, Grid, Card, CardContent
} from '@mui/material';
import {
    ArrowBack, CheckCircle, Cancel, People, Assessment, TrendingUp
} from '@mui/icons-material';
import AppLayout from '@/shared/components/Layout/AppLayout';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '@/shared/api/client';
import { useSnackbar } from 'notistack';

interface StudentQuizStatus {
    user_id: string;
    user_name: string;
    student_id?: string;
    email: string;
    has_attempted: boolean;
    has_submitted: boolean;
    attempt_count: number;
    best_score?: number;
    best_percentage?: number;
    latest_attempt_date?: string;
    is_passed?: boolean;
}

export default function QuizStudentsPage() {
    const { courseId, quizId } = useParams<{ courseId: string; quizId: string }>();
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();

    const [students, setStudents] = useState<StudentQuizStatus[]>([]);
    const [quizInfo, setQuizInfo] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (quizId) {
            fetchData();
        }
    }, [quizId]);

    const fetchData = async () => {
        try {
            setLoading(true);
            
            // Fetch quiz info
            const quizResponse = await apiClient.get(`/api/courses/quizzes/${quizId}`);
            setQuizInfo(quizResponse.data);
            
            // Fetch students status
            const studentsResponse = await apiClient.get(`/api/courses/quizzes/${quizId}/students`);
            setStudents(studentsResponse.data);
        } catch (error: any) {
            console.error('Failed to fetch data:', error);
            enqueueSnackbar(error.message || 'Failed to load student quiz status', { variant: 'error' });
        } finally {
            setLoading(false);
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

    const submittedCount = students.filter(s => s.has_submitted).length;
    const notAttemptedCount = students.filter(s => !s.has_attempted).length;
    const passedCount = students.filter(s => s.is_passed === true).length;
    const averageScore = students.filter(s => s.best_percentage !== null && s.best_percentage !== undefined).length > 0
        ? students.filter(s => s.best_percentage !== null && s.best_percentage !== undefined)
            .reduce((sum, s) => sum + (s.best_percentage || 0), 0) / students.filter(s => s.best_percentage !== null && s.best_percentage !== undefined).length
        : 0;

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
                    {quizInfo?.title || 'Quiz'} - Student Status
                </Typography>

                {quizInfo?.description && (
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                        {quizInfo.description}
                    </Typography>
                )}

                {/* Statistics Cards */}
                <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card>
                            <CardContent>
                                <Box display="flex" alignItems="center" gap={2}>
                                    <People sx={{ fontSize: 40, color: 'primary.main' }} />
                                    <Box>
                                        <Typography variant="h4" color="primary">
                                            {students.length}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Total Students
                                        </Typography>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card>
                            <CardContent>
                                <Box display="flex" alignItems="center" gap={2}>
                                    <Assessment sx={{ fontSize: 40, color: 'success.main' }} />
                                    <Box>
                                        <Typography variant="h4" color="success.main">
                                            {submittedCount}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Submitted
                                        </Typography>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card>
                            <CardContent>
                                <Box display="flex" alignItems="center" gap={2}>
                                    <Cancel sx={{ fontSize: 40, color: 'warning.main' }} />
                                    <Box>
                                        <Typography variant="h4" color="warning.main">
                                            {notAttemptedCount}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Not Attempted
                                        </Typography>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card>
                            <CardContent>
                                <Box display="flex" alignItems="center" gap={2}>
                                    <TrendingUp sx={{ fontSize: 40, color: 'info.main' }} />
                                    <Box>
                                        <Typography variant="h4" color="info.main">
                                            {averageScore.toFixed(1)}%
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Average Score
                                        </Typography>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>

                {/* Students Table */}
                {students.length === 0 ? (
                    <Paper sx={{ p: 4, textAlign: 'center' }}>
                        <People sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                        <Typography variant="h6" color="text.secondary" gutterBottom>
                            No students enrolled in this course
                        </Typography>
                    </Paper>
                ) : (
                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell><strong>Student Name</strong></TableCell>
                                    <TableCell><strong>Student ID</strong></TableCell>
                                    <TableCell><strong>Email</strong></TableCell>
                                    <TableCell><strong>Status</strong></TableCell>
                                    <TableCell><strong>Attempts</strong></TableCell>
                                    <TableCell><strong>Best Score</strong></TableCell>
                                    <TableCell><strong>Best Percentage</strong></TableCell>
                                    <TableCell><strong>Latest Submission</strong></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {students.map((student) => (
                                    <TableRow key={student.user_id}>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight="medium">
                                                {student.user_name}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            {student.student_id || '-'}
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" color="text.secondary">
                                                {student.email}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            {student.has_submitted ? (
                                                <Chip
                                                    icon={student.is_passed ? <CheckCircle /> : <Cancel />}
                                                    label={student.is_passed ? 'Passed' : 'Failed'}
                                                    color={student.is_passed ? 'success' : 'error'}
                                                    size="small"
                                                />
                                            ) : student.has_attempted ? (
                                                <Chip
                                                    label="In Progress"
                                                    color="warning"
                                                    size="small"
                                                />
                                            ) : (
                                                <Chip
                                                    label="Not Attempted"
                                                    color="default"
                                                    size="small"
                                                />
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {student.attempt_count > 0 ? (
                                                <Typography variant="body2">
                                                    {student.attempt_count}
                                                </Typography>
                                            ) : (
                                                <Typography variant="body2" color="text.secondary">
                                                    -
                                                </Typography>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {student.best_score !== null && student.best_score !== undefined ? (
                                                <Typography variant="body2" fontWeight="medium">
                                                    {student.best_score.toFixed(1)}
                                                </Typography>
                                            ) : (
                                                <Typography variant="body2" color="text.secondary">
                                                    -
                                                </Typography>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {student.best_percentage !== null && student.best_percentage !== undefined ? (
                                                <Chip
                                                    label={`${student.best_percentage.toFixed(1)}%`}
                                                    color={student.is_passed ? 'success' : 'default'}
                                                    size="small"
                                                />
                                            ) : (
                                                <Typography variant="body2" color="text.secondary">
                                                    -
                                                </Typography>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {student.latest_attempt_date ? (
                                                <Typography variant="body2">
                                                    {new Date(student.latest_attempt_date).toLocaleString('en-US', {
                                                        year: 'numeric',
                                                        month: '2-digit',
                                                        day: '2-digit',
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                        hour12: false
                                                    })}
                                                </Typography>
                                            ) : (
                                                <Typography variant="body2" color="text.secondary">
                                                    -
                                                </Typography>
                                            )}
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

