import { useState, useEffect } from 'react';
import { Box, Typography, Grid, Paper, Card, CardContent, Button, CircularProgress, List, ListItem, ListItemText, ListItemIcon, Chip, Divider } from '@mui/material';
import {
    People, Assignment, School, PersonAdd, Quiz, WorkspacePremium,
    Book, VideoLibrary, TrendingUp, AccessTime, AdminPanelSettings,
    Person, PersonPin, SupervisorAccount, CheckCircle, Event
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../api/adminApi';
import apiClient from '@/shared/api/client';
import AppLayout from '@/shared/components/Layout/AppLayout';

interface SystemStats {
    users: {
        total: number;
        students: number;
        teachers: number;
        admins: number;
        managers: number;
        new_last_30d: number;
    };
    courses: {
        total: number;
        active: number;
        new_last_30d: number;
    };
    enrollments: {
        total: number;
        students: number;
        teachers: number;
    };
    quizzes: {
        total: number;
        published: number;
        total_attempts: number;
        completed_attempts: number;
        average_score?: number;
    };
    live_sessions: {
        total: number;
        completed: number;
        ongoing: number;
    };
    certificates: {
        total: number;
    };
    materials: {
        total: number;
    };
    assignments: {
        total: number;
        total_submissions: number;
    };
    recent_courses: Array<{
        id: string;
        name: string;
        code: string;
        created_at?: string;
        student_count: number;
    }>;
    recent_users: Array<{
        id: string;
        full_name: string;
        email: string;
        role: string;
        created_at?: string;
    }>;
}

export default function AdminDashboardPage() {
    const navigate = useNavigate();
    const [stats, setStats] = useState<SystemStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSystemStats = async () => {
            try {
                setLoading(true);
                const response = await apiClient.get('/api/courses/analytics/system');
                console.log('[Admin Dashboard] System stats response:', response.data);
                setStats(response.data);
            } catch (error: any) {
                console.error('Failed to fetch system stats:', error);
                console.error('Error details:', error.response?.data || error.message);
                setStats(null);
            } finally {
                setLoading(false);
            }
        };

        fetchSystemStats();
    }, []);

    if (loading) {
        return (
            <AppLayout>
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                    <CircularProgress />
                </Box>
            </AppLayout>
        );
    }

    if (!stats) {
        return (
            <AppLayout>
                <Box sx={{ p: 3 }}>
                    <Typography variant="h6" color="error">
                        Failed to load system statistics. Please try again.
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

    return (
        <AppLayout>
            <Box sx={{ p: 3 }}>
                <Box sx={{ mb: 3 }}>
                    <Typography variant="h4" gutterBottom fontWeight="bold">
                        Admin Dashboard
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        System-wide statistics and monitoring
                    </Typography>
                </Box>

                <Grid container spacing={3}>
                    {/* User Statistics */}
                    <Grid item xs={12} sm={6} md={3}>
                        <Card>
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <People sx={{ fontSize: 40, color: 'primary.main' }} />
                                    <Box>
                                        <Typography variant="h4" fontWeight="bold">
                                            {stats.users.total}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Total Users
                                        </Typography>
                                        {stats.users.new_last_30d > 0 && (
                                            <Typography variant="caption" color="success.main">
                                                +{stats.users.new_last_30d} this month
                                            </Typography>
                                        )}
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                        <Card>
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Person sx={{ fontSize: 40, color: 'info.main' }} />
                                    <Box>
                                        <Typography variant="h4" fontWeight="bold">
                                            {stats.users.students}
                                        </Typography>
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
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <PersonPin sx={{ fontSize: 40, color: 'secondary.main' }} />
                                    <Box>
                                        <Typography variant="h4" fontWeight="bold">
                                            {stats.users.teachers}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Teachers
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
                                    <SupervisorAccount sx={{ fontSize: 40, color: 'warning.main' }} />
                                    <Box>
                                        <Typography variant="h4" fontWeight="bold">
                                            {stats.users.admins + stats.users.managers}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Admins/Managers
                                        </Typography>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Course Statistics */}
                    <Grid item xs={12} sm={6} md={3}>
                        <Card>
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <School sx={{ fontSize: 40, color: 'primary.main' }} />
                                    <Box>
                                        <Typography variant="h4" fontWeight="bold">
                                            {stats.courses.total}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Total Courses
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {stats.courses.active} active
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
                                            {stats.quizzes.total}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Quizzes
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {stats.quizzes.published} published
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
                                            {stats.assignments.total}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Assignments
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {stats.assignments.total_submissions} submissions
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
                                            {stats.certificates.total}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Certificates
                                        </Typography>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Additional Stats Row */}
                    <Grid item xs={12} sm={6} md={3}>
                        <Card>
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Book sx={{ fontSize: 40, color: 'success.main' }} />
                                    <Box>
                                        <Typography variant="h4" fontWeight="bold">
                                            {stats.materials.total}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Materials
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
                                    <VideoLibrary sx={{ fontSize: 40, color: 'error.main' }} />
                                    <Box>
                                        <Typography variant="h4" fontWeight="bold">
                                            {stats.live_sessions.total}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Live Sessions
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {stats.live_sessions.ongoing} ongoing
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
                                            {stats.quizzes.average_score ? stats.quizzes.average_score.toFixed(1) : '0.0'}%
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
                                    <CheckCircle sx={{ fontSize: 40, color: 'info.main' }} />
                                    <Box>
                                        <Typography variant="h4" fontWeight="bold">
                                            {stats.quizzes.completed_attempts}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Quiz Attempts
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {stats.quizzes.total_attempts} total
                                        </Typography>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Recent Courses */}
                    <Grid item xs={12} md={6}>
                        <Card>
                            <CardContent>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                    <Typography variant="h6" fontWeight="bold">
                                        Recent Courses
                                    </Typography>
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        onClick={() => navigate('/admin/courses')}
                                    >
                                        View All
                                    </Button>
                                </Box>
                                {stats.recent_courses.length === 0 ? (
                                    <Box sx={{ p: 3, textAlign: 'center' }}>
                                        <School sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                                        <Typography variant="body2" color="text.secondary">
                                            No courses yet
                                        </Typography>
                                    </Box>
                                ) : (
                                    <List dense>
                                        {stats.recent_courses.map((course, index) => (
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
                                                                <Chip label={`${course.student_count} students`} size="small" />
                                                                {course.created_at && (
                                                                    <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                                                                        {new Date(course.created_at).toLocaleDateString('en-US', {
                                                                            month: 'short',
                                                                            day: 'numeric',
                                                                            year: 'numeric'
                                                                        })}
                                                                    </Typography>
                                                                )}
                                                            </Box>
                                                        }
                                                    />
                                                </ListItem>
                                                {index < stats.recent_courses.length - 1 && <Divider />}
                                            </Box>
                                        ))}
                                    </List>
                                )}
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Recent Users */}
                    <Grid item xs={12} md={6}>
                        <Card>
                            <CardContent>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                    <Typography variant="h6" fontWeight="bold">
                                        Recent Users
                                    </Typography>
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        onClick={() => navigate('/admin/users')}
                                    >
                                        View All
                                    </Button>
                                </Box>
                                {stats.recent_users.length === 0 ? (
                                    <Box sx={{ p: 3, textAlign: 'center' }}>
                                        <People sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                                        <Typography variant="body2" color="text.secondary">
                                            No users yet
                                        </Typography>
                                    </Box>
                                ) : (
                                    <List dense>
                                        {stats.recent_users.map((user, index) => (
                                            <Box key={user.id}>
                                                <ListItem
                                                    button
                                                    onClick={() => navigate('/admin/users')}
                                                    sx={{ borderRadius: 1, mb: 1, '&:hover': { bgcolor: 'action.hover' } }}
                                                >
                                                    <ListItemIcon>
                                                        {user.role === 'STUDENT' ? (
                                                            <Person color="info" />
                                                        ) : user.role === 'TEACHER' ? (
                                                            <PersonPin color="secondary" />
                                                        ) : (
                                                            <AdminPanelSettings color="warning" />
                                                        )}
                                                    </ListItemIcon>
                                                    <ListItemText
                                                        primary={user.full_name}
                                                        secondary={
                                                            <Box sx={{ mt: 0.5 }}>
                                                                <Typography variant="caption" color="text.secondary">
                                                                    {user.email}
                                                                </Typography>
                                                                <Chip
                                                                    label={user.role}
                                                                    size="small"
                                                                    color={
                                                                        user.role === 'ADMIN' || user.role === 'MANAGER' ? 'warning' :
                                                                        user.role === 'TEACHER' ? 'secondary' : 'info'
                                                                    }
                                                                    sx={{ ml: 1 }}
                                                                />
                                                                {user.created_at && (
                                                                    <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                                                                        {new Date(user.created_at).toLocaleDateString('en-US', {
                                                                            month: 'short',
                                                                            day: 'numeric',
                                                                            year: 'numeric'
                                                                        })}
                                                                    </Typography>
                                                                )}
                                                            </Box>
                                                        }
                                                    />
                                                </ListItem>
                                                {index < stats.recent_users.length - 1 && <Divider />}
                                            </Box>
                                        ))}
                                    </List>
                                )}
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Quick Actions */}
                    <Grid item xs={12}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" fontWeight="bold" gutterBottom>
                                    Quick Actions
                                </Typography>
                                <Grid container spacing={2} sx={{ mt: 1 }}>
                                    <Grid item xs={12} sm={6} md={3}>
                                        <Paper sx={{ p: 2, textAlign: 'center', cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                                            onClick={() => navigate('/admin/users')}>
                                            <People sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                                            <Typography variant="subtitle2" fontWeight="medium">
                                                User Management
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Manage all users
                                            </Typography>
                                        </Paper>
                                    </Grid>
                                    <Grid item xs={12} sm={6} md={3}>
                                        <Paper sx={{ p: 2, textAlign: 'center', cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                                            onClick={() => navigate('/admin/import')}>
                                            <PersonAdd sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
                                            <Typography variant="subtitle2" fontWeight="medium">
                                                Import Users
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Import from CSV
                                            </Typography>
                                        </Paper>
                                    </Grid>
                                    <Grid item xs={12} sm={6} md={3}>
                                        <Paper sx={{ p: 2, textAlign: 'center', cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                                            onClick={() => navigate('/admin/courses')}>
                                            <School sx={{ fontSize: 40, color: 'secondary.main', mb: 1 }} />
                                            <Typography variant="subtitle2" fontWeight="medium">
                                                Course Management
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Manage courses
                                            </Typography>
                                        </Paper>
                                    </Grid>
                                    <Grid item xs={12} sm={6} md={3}>
                                        <Paper sx={{ p: 2, textAlign: 'center', cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                                            onClick={() => navigate('/courses')}>
                                            <AdminPanelSettings sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
                                            <Typography variant="subtitle2" fontWeight="medium">
                                                System Overview
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                View all courses
                                            </Typography>
                                        </Paper>
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            </Box>
        </AppLayout>
    );
}
