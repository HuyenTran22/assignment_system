import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
    Box, Grid, Card, CardContent, Typography, CircularProgress, Button,
    List, ListItem, ListItemText, ListItemIcon, Chip, Avatar, Divider, Paper
} from '@mui/material';
import {
    School, Assignment, Grade, CheckCircle, Quiz, People, AccessTime,
    TrendingUp, WorkspacePremium, Book, VideoLibrary, ArrowForward,
    Event, Assessment, Person
} from '@mui/icons-material';
import { useAuthStore } from '@/shared/store/authStore';
import AppLayout from '@/shared/components/Layout/AppLayout';
import api from '@/shared/api/client';

interface Course {
    id: string;
    name: string;
    code: string;
    description?: string;
    role_in_course: string;
    student_count?: number;
    quiz_count: number;
    material_count: number;
}

interface UpcomingQuiz {
    id: string;
    title: string;
    course_id: string;
    course_name: string;
    start_time?: string;
    end_time?: string;
    has_submitted?: boolean;
    total_students?: number;
    submitted_students?: number;
}

interface RecentActivity {
    type: string;
    title: string;
    course_name: string;
    score?: number;
    timestamp: string;
}

interface DashboardData {
    user_id: string;
    role: string;
    total_courses: number;
    total_assignments: number;
    total_submissions?: number;
    to_grade?: number;
    avg_grade?: number;
    total_quiz_attempts: number;
    completed_quizzes: number;
    average_quiz_score?: number;
    total_sessions_attended: number;
    total_attendance_minutes: number;
    courses: Course[];
    upcoming_quizzes: UpcomingQuiz[];
    recent_activities: RecentActivity[];
    certificates_count?: number;
    total_students?: number;
}

export default function DashboardPage() {
    const { user, loadUser } = useAuthStore();
    const navigate = useNavigate();
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadUser();
    }, []);

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!user) return;
            
            try {
                setLoading(true);
                const response = await api.get('/api/courses/analytics/dashboard');
                console.log('[Dashboard] API Response:', response.data);
                // Ensure arrays are always arrays
                const dashboardData = {
                    ...response.data,
                    courses: Array.isArray(response.data?.courses) ? response.data.courses : [],
                    upcoming_quizzes: Array.isArray(response.data?.upcoming_quizzes) ? response.data.upcoming_quizzes : [],
                    recent_activities: Array.isArray(response.data?.recent_activities) ? response.data.recent_activities : []
                };
                console.log('[Dashboard] Processed Data:', dashboardData);
                setData(dashboardData);
            } catch (error: any) {
                console.error('Failed to fetch dashboard data:', error);
                setData(null);
            } finally {
                setLoading(false);
            }
        };

        if (user && user.role !== 'ADMIN') {
            fetchDashboardData();
        }
    }, [user]);

    if (!user) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    if (user.role === 'ADMIN') {
        return <Navigate to="/admin" replace />;
    }

    if (loading) {
        return (
            <AppLayout>
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                    <CircularProgress />
                </Box>
            </AppLayout>
        );
    }

    if (!data) {
        return (
            <AppLayout>
                <Box sx={{ p: 3 }}>
                    <Typography variant="h6" color="error">
                        Failed to load dashboard data. Please try again.
                    </Typography>
                    <Button
                        variant="contained"
                        onClick={() => window.location.reload()}
                        sx={{ mt: 2 }}
                    >
                        Reload Page
                    </Button>
                </Box>
            </AppLayout>
        );
    }

    // Ensure arrays exist
    const courses = data.courses || [];
    const upcomingQuizzes = data.upcoming_quizzes || [];
    const recentActivities = data.recent_activities || [];

    // Render Teacher Dashboard
    if (user.role === 'TEACHER') {
        return (
            <AppLayout>
                <Box sx={{ p: 3 }}>
                    <Box sx={{ mb: 3 }}>
                        <Typography variant="h4" gutterBottom fontWeight="bold">
                            Teacher Portal
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            Welcome back, {user.full_name}! Manage your courses and track student progress.
                        </Typography>
                    </Box>

                    <Grid container spacing={3}>
                        {/* Stats Cards */}
                        <Grid item xs={12} sm={6} md={3}>
                            <Card>
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <School sx={{ fontSize: 40, color: 'primary.main' }} />
                                        <Box>
                                            <Typography variant="h4" fontWeight="bold">
                                                {data.total_courses}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                My Courses
                                            </Typography>
                                        </Box>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid item xs={12} sm={6} md={3}>
                            <Card>
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <People sx={{ fontSize: 40, color: 'info.main' }} />
                                        <Box>
                                            <Typography variant="h4" fontWeight="bold">
                                                {data.total_students ?? 0}
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
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <Assignment sx={{ fontSize: 40, color: 'secondary.main' }} />
                                        <Box>
                                            <Typography variant="h4" fontWeight="bold">
                                                {data.total_assignments}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Assignments
                                            </Typography>
                                        </Box>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid item xs={12} sm={6} md={3}>
                            <Card>
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <Grade sx={{ fontSize: 40, color: 'warning.main' }} />
                                        <Box>
                                            <Typography variant="h4" fontWeight="bold">
                                                {data.to_grade ?? 0}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                To Grade
                                            </Typography>
                                        </Box>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* My Courses */}
                        <Grid item xs={12} md={8}>
                            <Card>
                                <CardContent>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                        <Typography variant="h6" fontWeight="bold">
                                            My Courses
                                        </Typography>
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            onClick={() => navigate('/courses')}
                                        >
                                            View All
                                        </Button>
                                    </Box>
                                    {courses.length === 0 ? (
                                        <Box sx={{ p: 3, textAlign: 'center' }}>
                                            <School sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                                            <Typography variant="body2" color="text.secondary">
                                                No courses yet. Create your first course to get started.
                                            </Typography>
                                        </Box>
                                    ) : (
                                        <List>
                                            {courses.map((course, index) => (
                                                <Box key={course.id}>
                                                    <ListItem
                                                        button
                                                        onClick={() => navigate(`/courses/${course.id}`)}
                                                        sx={{ borderRadius: 1, mb: 1, '&:hover': { bgcolor: 'action.hover' } }}
                                                    >
                                                        <ListItemIcon>
                                                            <School color="primary" />
                                                        </ListItemIcon>
                                                        <ListItemText
                                                            primary={course.name}
                                                            secondary={
                                                                <Box sx={{ mt: 0.5 }}>
                                                                    <Chip label={course.code} size="small" sx={{ mr: 1 }} />
                                                                    <Chip label={`${course.student_count ?? 0} students`} size="small" sx={{ mr: 1 }} />
                                                                    <Chip label={`${course.quiz_count} quizzes`} size="small" sx={{ mr: 1 }} />
                                                                    <Chip label={`${course.material_count} materials`} size="small" />
                                                                </Box>
                                                            }
                                                        />
                                                        <ArrowForward color="action" />
                                                    </ListItem>
                                                    {index < courses.length - 1 && <Divider />}
                                                </Box>
                                            ))}
                                        </List>
                                    )}
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Upcoming Quizzes */}
                        <Grid item xs={12} md={4}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                                        Upcoming Quizzes
                                    </Typography>
                                    {upcomingQuizzes.length === 0 ? (
                                        <Box sx={{ p: 2, textAlign: 'center' }}>
                                            <Quiz sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
                                            <Typography variant="body2" color="text.secondary">
                                                No upcoming quizzes
                                            </Typography>
                                        </Box>
                                    ) : (
                                        <List dense>
                                            {upcomingQuizzes.map((quiz) => (
                                                <ListItem key={quiz.id} sx={{ flexDirection: 'column', alignItems: 'flex-start', py: 1.5 }}>
                                                    <Typography variant="subtitle2" fontWeight="medium">
                                                        {quiz.title}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {quiz.course_name}
                                                    </Typography>
                                                    {quiz.end_time && (
                                                        <Box sx={{ mt: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                            <AccessTime sx={{ fontSize: 14 }} />
                                                            <Typography variant="caption" color="text.secondary">
                                                                Ends: {new Date(quiz.end_time).toLocaleString('en-US', {
                                                                    month: 'short',
                                                                    day: 'numeric',
                                                                    hour: '2-digit',
                                                                    minute: '2-digit',
                                                                    hour12: false
                                                                })}
                                                            </Typography>
                                                        </Box>
                                                    )}
                                                    {quiz.total_students !== undefined && (
                                                        <Chip
                                                            label={`${quiz.submitted_students ?? 0}/${quiz.total_students} submitted`}
                                                            size="small"
                                                            color={quiz.submitted_students === quiz.total_students ? 'success' : 'default'}
                                                            sx={{ mt: 0.5 }}
                                                        />
                                                    )}
                                                </ListItem>
                                            ))}
                                        </List>
                                    )}
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Recent Activity */}
                        <Grid item xs={12}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                                        Recent Activity
                                    </Typography>
                                    {recentActivities.length === 0 ? (
                                        <Box sx={{ p: 3, textAlign: 'center' }}>
                                            <Typography variant="body2" color="text.secondary">
                                                No recent activity
                                            </Typography>
                                        </Box>
                                    ) : (
                                        <List>
                                            {recentActivities.map((activity, index) => (
                                                <Box key={index}>
                                                    <ListItem>
                                                        <ListItemIcon>
                                                            {activity.type === 'quiz_submission' ? (
                                                                <Quiz color="primary" />
                                                            ) : (
                                                                <Assessment color="success" />
                                                            )}
                                                        </ListItemIcon>
                                                        <ListItemText
                                                            primary={activity.title}
                                                            secondary={
                                                                <Box>
                                                                    <Typography variant="caption" color="text.secondary">
                                                                        {activity.course_name}
                                                                    </Typography>
                                                                    {activity.score !== undefined && activity.score !== null && (
                                                                        <Chip
                                                            label={`Score: ${Number(activity.score).toFixed(1)}%`}
                                                            size="small"
                                                            color={Number(activity.score) >= 70 ? 'success' : Number(activity.score) >= 50 ? 'warning' : 'error'}
                                                            sx={{ ml: 1 }}
                                                        />
                                                    )}
                                                    <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                                                        {new Date(activity.timestamp).toLocaleString('en-US', {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                            hour12: false
                                                        })}
                                                    </Typography>
                                                </Box>
                                            }
                                        />
                                    </ListItem>
                                                    {index < recentActivities.length - 1 && <Divider />}
                                </Box>
                            ))}
                        </List>
                    )}
                </CardContent>
            </Card>
        </Grid>
    </Grid>
</Box>
        </AppLayout>
    );
    }

    // Render Student Dashboard
    return (
        <AppLayout>
            <Box sx={{ p: 3 }}>
                <Box sx={{ mb: 3 }}>
                    <Typography variant="h4" gutterBottom fontWeight="bold">
                        Student Portal
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Welcome back, {user.full_name}! Track your progress and stay on top of your courses.
                    </Typography>
                </Box>

                <Grid container spacing={3}>
                    {/* Stats Cards */}
                    <Grid item xs={12} sm={6} md={3}>
                        <Card>
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <School sx={{ fontSize: 40, color: 'primary.main' }} />
                                    <Box>
                                        <Typography variant="h4" fontWeight="bold">
                                            {data.total_courses}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Enrolled Courses
                                        </Typography>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                        <Card>
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Quiz sx={{ fontSize: 40, color: 'info.main' }} />
                                    <Box>
                                        <Typography variant="h4" fontWeight="bold">
                                            {data.completed_quizzes}
                                        </Typography>
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
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <TrendingUp sx={{ fontSize: 40, color: 'success.main' }} />
                                    <Box>
                                        <Typography variant="h4" fontWeight="bold">
                                            {data.average_quiz_score !== null && data.average_quiz_score !== undefined ? Number(data.average_quiz_score).toFixed(1) : '0.0'}%
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
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <WorkspacePremium sx={{ fontSize: 40, color: 'warning.main' }} />
                                    <Box>
                                        <Typography variant="h4" fontWeight="bold">
                                            {data.certificates_count ?? 0}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Certificates
                                        </Typography>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* My Courses */}
                    <Grid item xs={12} md={8}>
                        <Card>
                            <CardContent>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                    <Typography variant="h6" fontWeight="bold">
                                        My Courses
                                    </Typography>
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        onClick={() => navigate('/courses')}
                                    >
                                        View All
                                    </Button>
                                </Box>
                                {courses.length === 0 ? (
                                    <Box sx={{ p: 3, textAlign: 'center' }}>
                                        <School sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                                        <Typography variant="body2" color="text.secondary">
                                            You are not enrolled in any courses yet.
                                        </Typography>
                                    </Box>
                                ) : (
                                    <List>
                                        {courses.map((course, index) => (
                                            <Box key={course.id}>
                                                <ListItem
                                                    button
                                                    onClick={() => navigate(`/courses/${course.id}`)}
                                                    sx={{ borderRadius: 1, mb: 1, '&:hover': { bgcolor: 'action.hover' } }}
                                                >
                                                    <ListItemIcon>
                                                        <School color="primary" />
                                                    </ListItemIcon>
                                                    <ListItemText
                                                        primary={course.name}
                                                        secondary={
                                                            <Box sx={{ mt: 0.5 }}>
                                                                <Chip label={course.code} size="small" sx={{ mr: 1 }} />
                                                                <Chip label={`${course.quiz_count} quizzes`} size="small" sx={{ mr: 1 }} />
                                                                <Chip label={`${course.material_count} materials`} size="small" />
                                                            </Box>
                                                        }
                                                    />
                                                    <ArrowForward color="action" />
                                                </ListItem>
                                                {index < courses.length - 1 && <Divider />}
                                            </Box>
                                        ))}
                                    </List>
                                )}
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Upcoming Quizzes */}
                    <Grid item xs={12} md={4}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" fontWeight="bold" gutterBottom>
                                    Upcoming Quizzes
                                </Typography>
                                {upcomingQuizzes.length === 0 ? (
                                    <Box sx={{ p: 2, textAlign: 'center' }}>
                                        <Quiz sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
                                        <Typography variant="body2" color="text.secondary">
                                            No upcoming quizzes
                                        </Typography>
                                    </Box>
                                ) : (
                                    <List dense>
                                        {upcomingQuizzes.map((quiz) => (
                                            <ListItem
                                                key={quiz.id}
                                                button
                                                onClick={() => navigate(`/courses/${quiz.course_id}/quizzes`)}
                                                sx={{ flexDirection: 'column', alignItems: 'flex-start', py: 1.5 }}
                                            >
                                                <Typography variant="subtitle2" fontWeight="medium">
                                                    {quiz.title}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {quiz.course_name}
                                                </Typography>
                                                {quiz.start_time && (
                                                    <Box sx={{ mt: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                        <Event sx={{ fontSize: 14 }} />
                                                        <Typography variant="caption" color="text.secondary">
                                                            Starts: {new Date(quiz.start_time).toLocaleString('en-US', {
                                                                month: 'short',
                                                                day: 'numeric',
                                                                hour: '2-digit',
                                                                minute: '2-digit',
                                                                hour12: false
                                                            })}
                                                        </Typography>
                                                    </Box>
                                                )}
                                                {quiz.end_time && (
                                                    <Box sx={{ mt: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                        <AccessTime sx={{ fontSize: 14 }} />
                                                        <Typography variant="caption" color="text.secondary">
                                                            Ends: {new Date(quiz.end_time).toLocaleString('en-US', {
                                                                month: 'short',
                                                                day: 'numeric',
                                                                hour: '2-digit',
                                                                minute: '2-digit',
                                                                hour12: false
                                                            })}
                                                        </Typography>
                                                    </Box>
                                                )}
                                                {quiz.has_submitted && (
                                                    <Chip
                                                        label="Completed"
                                                        size="small"
                                                        color="success"
                                                        sx={{ mt: 0.5 }}
                                                    />
                                                )}
                                            </ListItem>
                                        ))}
                                    </List>
                                )}
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Recent Activity */}
                    <Grid item xs={12}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" fontWeight="bold" gutterBottom>
                                    Recent Activity
                                </Typography>
                                {recentActivities.length === 0 ? (
                                    <Box sx={{ p: 3, textAlign: 'center' }}>
                                        <Typography variant="body2" color="text.secondary">
                                            No recent activity
                                        </Typography>
                                    </Box>
                                ) : (
                                    <List>
                                        {recentActivities.map((activity, index) => (
                                            <Box key={index}>
                                                <ListItem>
                                                    <ListItemIcon>
                                                        <Assessment color="primary" />
                                                    </ListItemIcon>
                                                    <ListItemText
                                                        primary={activity.title}
                                                        secondary={
                                                            <Box>
                                                                <Typography variant="caption" color="text.secondary">
                                                                    {activity.course_name}
                                                                </Typography>
                                                                {activity.score !== undefined && activity.score !== null && (
                                                                    <Chip
                                                                        label={`Score: ${Number(activity.score).toFixed(1)}%`}
                                                                        size="small"
                                                                        color={Number(activity.score) >= 70 ? 'success' : Number(activity.score) >= 50 ? 'warning' : 'error'}
                                                                        sx={{ ml: 1 }}
                                                                    />
                                                                )}
                                                                <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                                                                    {new Date(activity.timestamp).toLocaleString('en-US', {
                                                                        month: 'short',
                                                                        day: 'numeric',
                                                                        hour: '2-digit',
                                                                        minute: '2-digit',
                                                                        hour12: false
                                                                    })}
                                                                </Typography>
                                                            </Box>
                                                        }
                                                    />
                                                </ListItem>
                                                    {index < recentActivities.length - 1 && <Divider />}
                                            </Box>
                                        ))}
                                    </List>
                                )}
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            </Box>
        </AppLayout>
    );
}
