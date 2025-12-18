import { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, Grid, Card, CardContent, CircularProgress,
    MenuItem, Select, FormControl, InputLabel, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Chip
} from '@mui/material';
import {
    School, Quiz, VideoCall, TrendingUp, People, CheckCircle
} from '@mui/icons-material';
import AppLayout from '@/shared/components/Layout/AppLayout';
import { useParams } from 'react-router-dom';
import apiClient from '@/shared/api/client';
import { useSnackbar } from 'notistack';
import { useAuthStore } from '@/shared/store/authStore';

export default function AnalyticsDashboardPage() {
    const { courseId } = useParams<{ courseId: string }>();
    const { user } = useAuthStore();
    const { enqueueSnackbar } = useSnackbar();
    
    const [loading, setLoading] = useState(true);
    const [overview, setOverview] = useState<any>(null);
    const [quizAnalytics, setQuizAnalytics] = useState<any>(null);
    const [attendanceAnalytics, setAttendanceAnalytics] = useState<any>(null);
    const [dashboardStats, setDashboardStats] = useState<any>(null);

    useEffect(() => {
        if (courseId) {
            fetchCourseAnalytics();
        } else {
            fetchUserDashboard();
        }
    }, [courseId]);

    const fetchCourseAnalytics = async () => {
        try {
            setLoading(true);
            const [overviewRes, quizRes, attendanceRes] = await Promise.all([
                apiClient.get(`/api/courses/${courseId}/analytics/overview`),
                apiClient.get(`/api/courses/${courseId}/analytics/quizzes`),
                apiClient.get(`/api/courses/${courseId}/analytics/attendance`)
            ]);
            setOverview(overviewRes.data);
            setQuizAnalytics(quizRes.data);
            setAttendanceAnalytics(attendanceRes.data);
        } catch (error: any) {
            console.error('Failed to fetch analytics:', error);
            enqueueSnackbar(error.message || 'Failed to load analytics', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const fetchUserDashboard = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get('/api/courses/analytics/dashboard');
            setDashboardStats(response.data);
        } catch (error: any) {
            console.error('Failed to fetch dashboard:', error);
            enqueueSnackbar(error.message || 'Failed to load dashboard', { variant: 'error' });
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

    if (courseId) {
        // Course Analytics View
        return (
            <AppLayout>
                <Box p={3}>
                    <Typography variant="h4" component="h1" gutterBottom>
                        Course Analytics
                    </Typography>
                    {overview && (
                        <Typography variant="h6" color="text.secondary" gutterBottom>
                            {overview.course_name}
                        </Typography>
                    )}

                    {overview && (
                        <Grid container spacing={3} sx={{ mt: 2 }}>
                            <Grid item xs={12} sm={6} md={3}>
                                <Card>
                                    <CardContent>
                                        <Box display="flex" alignItems="center" gap={2}>
                                            <People color="primary" />
                                            <Box>
                                                <Typography variant="h4">{overview.total_students}</Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    Students
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
                                            <Quiz color="primary" />
                                            <Box>
                                                <Typography variant="h4">{overview.total_quizzes}</Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    Quizzes
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
                                            <VideoCall color="primary" />
                                            <Box>
                                                <Typography variant="h4">{overview.total_sessions}</Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    Live Sessions
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
                                            <TrendingUp color="primary" />
                                            <Box>
                                                <Typography variant="h4">
                                                    {overview.average_quiz_score?.toFixed(1) || 'N/A'}%
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    Avg Quiz Score
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>
                        </Grid>
                    )}

                    {quizAnalytics && quizAnalytics.quizzes && (
                        <Paper sx={{ p: 3, mt: 3 }}>
                            <Typography variant="h6" gutterBottom>
                                Quiz Analytics
                            </Typography>
                            <TableContainer>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Quiz Title</TableCell>
                                            <TableCell>Total Attempts</TableCell>
                                            <TableCell>Completed</TableCell>
                                            <TableCell>Avg Score</TableCell>
                                            <TableCell>Pass Rate</TableCell>
                                            <TableCell>Participants</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {quizAnalytics.quizzes.map((quiz: any) => (
                                            <TableRow key={quiz.quiz_id}>
                                                <TableCell>{quiz.quiz_title}</TableCell>
                                                <TableCell>{quiz.total_attempts}</TableCell>
                                                <TableCell>{quiz.completed_attempts}</TableCell>
                                                <TableCell>
                                                    {quiz.average_score?.toFixed(1) || 'N/A'}%
                                                </TableCell>
                                                <TableCell>
                                                    {quiz.pass_rate?.toFixed(1) || 'N/A'}%
                                                </TableCell>
                                                <TableCell>{quiz.total_participants}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Paper>
                    )}

                    {attendanceAnalytics && attendanceAnalytics.sessions && (
                        <Paper sx={{ p: 3, mt: 3 }}>
                            <Typography variant="h6" gutterBottom>
                                Attendance Analytics
                            </Typography>
                            <TableContainer>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Session Title</TableCell>
                                            <TableCell>Status</TableCell>
                                            <TableCell>Participants</TableCell>
                                            <TableCell>Avg Duration</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {attendanceAnalytics.sessions.map((session: any) => (
                                            <TableRow key={session.session_id}>
                                                <TableCell>{session.session_title}</TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={session.status}
                                                        color={session.status === 'completed' ? 'success' : 'default'}
                                                        size="small"
                                                    />
                                                </TableCell>
                                                <TableCell>{session.total_participants}</TableCell>
                                                <TableCell>
                                                    {session.average_duration_minutes
                                                        ? `${Math.floor(session.average_duration_minutes / 60)}h ${session.average_duration_minutes % 60}m`
                                                        : 'N/A'}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Paper>
                    )}
                </Box>
            </AppLayout>
        );
    }

    // User Dashboard View
    return (
        <AppLayout>
            <Box p={3}>
                <Typography variant="h4" component="h1" gutterBottom>
                    My Dashboard
                </Typography>

                {dashboardStats && (
                    <Grid container spacing={3} sx={{ mt: 2 }}>
                        <Grid item xs={12} sm={6} md={3}>
                            <Card>
                                <CardContent>
                                    <Box display="flex" alignItems="center" gap={2}>
                                        <School color="primary" />
                                        <Box>
                                            <Typography variant="h4">{dashboardStats.total_courses}</Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Courses
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
                                        <Quiz color="primary" />
                                        <Box>
                                            <Typography variant="h4">{dashboardStats.completed_quizzes}</Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Completed Quizzes
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
                                        <TrendingUp color="primary" />
                                        <Box>
                                            <Typography variant="h4">
                                                {dashboardStats.average_quiz_score?.toFixed(1) || 'N/A'}%
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Avg Quiz Score
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
                                        <VideoCall color="primary" />
                                        <Box>
                                            <Typography variant="h4">{dashboardStats.total_sessions_attended}</Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Sessions Attended
                                            </Typography>
                                        </Box>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                )}
            </Box>
        </AppLayout>
    );
}

