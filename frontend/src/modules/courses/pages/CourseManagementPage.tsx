import { useState, useEffect } from 'react';
import {
    Box, Typography, Button, Grid, Card, CardContent, CardActions,
    Paper, Chip, CircularProgress, Alert
} from '@mui/material';
import {
    School, MenuBook, Quiz, People, VideoCall, WorkspacePremium,
    Forum, Analytics, Edit, ArrowBack, Grade
} from '@mui/icons-material';
import AppLayout from '@/shared/components/Layout/AppLayout';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/shared/store/authStore';
import apiClient from '@/shared/api/client';
import { useSnackbar } from 'notistack';
import { Course } from '@/modules/courses/types/course.types';

export default function CourseManagementPage() {
    const { courseId } = useParams<{ courseId: string }>();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const { enqueueSnackbar } = useSnackbar();
    
    const [course, setCourse] = useState<Course | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    // Use only valid MUI palette color keys
    type QuickLinkColor = 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'error';

    const [stats, setStats] = useState({
        enrollments: 0,
        assignments: 0,
        quizzes: 0,
        materials: 0,
        liveSessions: 0,
        discussions: 0,
        completions: 0
    });
    const [hasCertificate, setHasCertificate] = useState(false);
    const [liveNowSession, setLiveNowSession] = useState<any | null>(null);

    const isTeacher = user?.role === 'TEACHER' || user?.role === 'ADMIN';

    useEffect(() => {
        if (courseId) {
            console.log('[CourseManagementPage] CourseId changed:', courseId);
            fetchCourse();
            fetchStats();
        } else {
            console.error('[CourseManagementPage] No courseId in params');
            setError('Course ID is missing');
            setLoading(false);
        }
    }, [courseId]);

    const fetchCourse = async () => {
        try {
            setLoading(true);
            setError(null);
            console.log('[CourseManagementPage] Fetching course:', courseId);
            const response = await apiClient.get(`/api/courses/${courseId}`);
            console.log('[CourseManagementPage] Course response:', response.data);
            if (response.data) {
                setCourse(response.data);
            } else {
                throw new Error('Invalid response from server');
            }
        } catch (err: any) {
            console.error('[CourseManagementPage] Failed to fetch course:', err);
            console.error('[CourseManagementPage] Error details:', {
                status: err?.response?.status,
                data: err?.response?.data,
                message: err?.message
            });
            const errorMessage = err?.response?.data?.detail || err?.message || 'Failed to load course';
            setError(errorMessage);
            setCourse(null);
            enqueueSnackbar(errorMessage, { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            // Fetch enrollments count (students only)
            const enrollmentsRes = await apiClient.get(`/api/courses/${courseId}/enrollments`);
            const enrollmentsData = Array.isArray(enrollmentsRes.data) ? enrollmentsRes.data : [];
            const studentEnrollments = enrollmentsData.filter((enrollment: any) =>
                enrollment.role_in_course === 'student' || enrollment.role === 'STUDENT'
            );
            const enrollmentsCount = studentEnrollments.length;

            // Fetch quizzes count
            const quizzesRes = await apiClient.get(`/api/courses/${courseId}/quizzes`);
            const quizzesCount = Array.isArray(quizzesRes.data) ? quizzesRes.data.length : 0;

            // Fetch materials count
            const materialsRes = await apiClient.get(`/api/courses/${courseId}/materials`);
            const materialsCount = Array.isArray(materialsRes.data) ? materialsRes.data.length : 0;

            // Fetch live sessions count
            const sessionsRes = await apiClient.get(`/api/courses/${courseId}/live-sessions`);
            const sessionsCount = Array.isArray(sessionsRes.data) ? sessionsRes.data.length : 0;

            // Fetch discussions count
            const discussionsRes = await apiClient.get(`/api/courses/${courseId}/discussions`);
            const discussionsCount = Array.isArray(discussionsRes.data) ? discussionsRes.data.length : 0;

            // Fetch certificates to determine completions count or student status
            let completionsCount = 0;
            setHasCertificate(false);
            try {
                const certificatesRes = await apiClient.get(`/api/courses/${courseId}/certificates`);
                const certificatesData = Array.isArray(certificatesRes.data) ? certificatesRes.data : [];
                if (isTeacher) {
                    completionsCount = certificatesData.length;
                } else {
                    setHasCertificate(certificatesData.length > 0);
                }
            } catch (certErr) {
                console.error('Failed to fetch certificates for stats:', certErr);
            }

            // Fetch live sessions currently ongoing
            try {
                const liveNowRes = await apiClient.get(`/api/courses/${courseId}/live-sessions`, {
                    params: { status_filter: 'ongoing' }
                });
                const liveSessionsOngoing = Array.isArray(liveNowRes.data) ? liveNowRes.data : [];
                setLiveNowSession(liveSessionsOngoing.length > 0 ? liveSessionsOngoing[0] : null);
            } catch (liveErr) {
                console.error('Failed to fetch live-now sessions:', liveErr);
                setLiveNowSession(null);
            }

            setStats({
                enrollments: enrollmentsCount,
                assignments: 0, // TODO: Fetch from assignment service
                quizzes: quizzesCount,
                materials: materialsCount,
                liveSessions: sessionsCount,
                discussions: discussionsCount,
                completions: completionsCount
            });
        } catch (err: any) {
            console.error('Failed to fetch stats:', err);
            // Don't show error for stats, just log
        }
    };

    if (loading) {
        return (
            <AppLayout>
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                    <CircularProgress />
                </Box>
            </AppLayout>
        );
    }

    if (error || !course) {
        return (
            <AppLayout>
                <Box sx={{ p: 3 }}>
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error || 'Course not found'}
                    </Alert>
                    <Button
                        startIcon={<ArrowBack />}
                        onClick={() => navigate('/courses')}
                        variant="contained"
                        sx={{ mt: 2 }}
                    >
                        Back to Courses
                    </Button>
                    {error && (
                        <Box sx={{ mt: 2 }}>
                            <Typography variant="body2" color="text.secondary">
                                Course ID: {courseId}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Check console (F12) for more details
                            </Typography>
                        </Box>
                    )}
                </Box>
            </AppLayout>
        );
    }

    const quickLinks: {
        title: string;
        description: string;
        icon: JSX.Element;
        path: string;
        color: QuickLinkColor;
        onClick?: () => void;
    }[] = [
        {
            title: 'Course Materials',
            description: 'Manage modules, lessons, videos, and documents',
            icon: <MenuBook />,
            path: `/courses/${courseId}/materials`,
            color: 'primary'
        },
        {
            title: 'Quizzes',
            description: 'Create and manage quizzes, questions, and attempts',
            icon: <Quiz />,
            path: `/courses/${courseId}/quizzes`,
            color: 'secondary'
        },
        {
            title: 'Students',
            description: 'View and manage enrolled students',
            icon: <People />,
            path: `/courses/${courseId}/students`,
            color: 'info'
        },
        {
            title: 'Live Sessions',
            description: 'Schedule and manage live classes',
            icon: <VideoCall />,
            path: `/courses/${courseId}/live-sessions`,
            color: 'info'
        },
        {
            title: 'Discussions',
            description: 'Moderate forum discussions and threads',
            icon: <Forum />,
            path: `/courses/${courseId}/discussions`,
            color: 'error'
        },
        {
            title: 'Certificates',
            description: 'Generate and manage course certificates',
            icon: <WorkspacePremium />,
            path: `/courses/${courseId}/certificates`,
            // Use a valid palette color; visual "default" feel will be handled via sx below
            color: 'primary'
        },
        {
            title: 'Grades',
            description: 'View all student grades for this course',
            icon: <Grade />,
            path: `/courses/${courseId}/grades`,
            color: 'success'
        }
    ];

    // Safety check - should not reach here if course is null, but just in case
    if (!course) {
        return (
            <AppLayout>
                <Box sx={{ p: 3 }}>
                    <Alert severity="error">Course not found</Alert>
                    <Button
                        startIcon={<ArrowBack />}
                        onClick={() => navigate('/courses')}
                        sx={{ mt: 2 }}
                    >
                        Back to Courses
                    </Button>
                </Box>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <Box sx={{ p: 3 }}>
                {/* Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Box>
                        <Button
                            startIcon={<ArrowBack />}
                            onClick={() => navigate('/courses')}
                            sx={{ mb: 1 }}
                        >
                            Back to Courses
                        </Button>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <School sx={{ fontSize: 40, color: 'primary.main' }} />
                            <Box>
                                <Typography variant="h4" fontWeight="bold">
                                    {course?.name || 'Loading...'}
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                                    <Chip label={course?.code || 'N/A'} size="small" color="primary" />
                                    <Typography variant="body2" color="text.secondary">
                                        {stats.enrollments} students enrolled
                                    </Typography>
                                    {!isTeacher && (
                                        hasCertificate ? (
                                            <Chip
                                                label="Completed"
                                                size="small"
                                                color="success"
                                                sx={{ ml: 1 }}
                                            />
                                        ) : (
                                            <Chip
                                                label="In progress"
                                                size="small"
                                                color="warning"
                                                sx={{ ml: 1 }}
                                            />
                                        )
                                    )}
                                </Box>
                            </Box>
                        </Box>
                    </Box>
                    {isTeacher && (
                        <Button
                            variant="outlined"
                            startIcon={<Edit />}
                            onClick={() => navigate('/admin/courses')}
                        >
                            Edit Course
                        </Button>
                    )}
                </Box>

                {course.description && (
                    <Paper sx={{ p: 2, mb: 3, bgcolor: 'background.default' }}>
                        <Typography variant="body1" color="text.secondary">
                            {course.description}
                        </Typography>
                    </Paper>
                )}

                {/* Stats Cards */}
                <Grid container spacing={3} sx={{ mb: 4 }}>
                    <Grid item xs={12} sm={6} md={2}>
                        <Card>
                            <CardContent>
                                <Typography variant="h4" fontWeight="bold" color="primary">
                                    {stats.enrollments}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Students
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={2}>
                        <Card>
                            <CardContent>
                                <Typography variant="h4" fontWeight="bold" color="secondary">
                                    {stats.materials}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Materials
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={2}>
                        <Card>
                            <CardContent>
                                <Typography variant="h4" fontWeight="bold" color="success.main">
                                    {stats.quizzes}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Quizzes
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={2}>
                        <Card>
                            <CardContent>
                                <Typography variant="h4" fontWeight="bold" color="warning.main">
                                    {stats.liveSessions}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Live Sessions
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={2}>
                        <Card>
                            <CardContent>
                                <Typography variant="h4" fontWeight="bold" color="info.main">
                                    {stats.discussions}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Discussions
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={2}>
                        <Card>
                            <CardContent>
                                <Typography variant="h4" fontWeight="bold" color="error.main">
                                    {stats.assignments}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Assignments
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    {isTeacher && (
                        <Grid item xs={12} sm={6} md={2}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h4" fontWeight="bold" color="success.dark">
                                        {stats.completions}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Completed
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    )}
                </Grid>

                {/* Live Now Banner */}
                {liveNowSession && (
                    <Paper sx={{ p: 2, mb: 3, borderLeft: theme => `4px solid ${theme.palette.success.main}` }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box>
                                <Typography variant="subtitle2" color="success.main">
                                    LIVE NOW
                                </Typography>
                                <Typography variant="h6">
                                    {liveNowSession.title}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Ongoing live session. Click Join to enter the video room.
                                </Typography>
                            </Box>
                            <Button
                                variant="contained"
                                color="success"
                                onClick={() => navigate(`/courses/${courseId}/live-sessions/${liveNowSession.id}`)}
                            >
                                Join Live Session
                            </Button>
                        </Box>
                    </Paper>
                )}

                {/* Quick Links */}
                <Typography variant="h5" fontWeight="bold" sx={{ mb: 2 }}>
                    Quick Links
                </Typography>
                <Grid container spacing={3}>
                    {quickLinks.map((link, index) => (
                        <Grid item xs={12} sm={6} md={4} key={index}>
                            <Card
                                sx={{
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    cursor: 'pointer',
                                    transition: 'transform 0.2s, box-shadow 0.2s',
                                    '&:hover': {
                                        transform: 'translateY(-4px)',
                                        boxShadow: 4
                                    }
                                }}
                                onClick={link.onClick || (() => navigate(link.path))}
                            >
                                <CardContent sx={{ flexGrow: 1 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                        <Box
                                            sx={{
                                                p: 1.5,
                                                borderRadius: 2,
                                            bgcolor: (theme) =>
                                                link.color === 'primary'
                                                    ? theme.palette.grey[100]
                                                    : theme.palette[link.color].light,
                                            color: (theme) =>
                                                link.color === 'primary'
                                                    ? theme.palette.text.primary
                                                    : theme.palette[link.color].main
                                            }}
                                        >
                                            {link.icon}
                                        </Box>
                                        <Typography variant="h6" fontWeight="bold">
                                            {link.title}
                                        </Typography>
                                    </Box>
                                    <Typography variant="body2" color="text.secondary">
                                        {link.description}
                                    </Typography>
                                </CardContent>
                                <CardActions>
                                    <Button size="small" color={link.color}>
                                        Open
                                    </Button>
                                </CardActions>
                            </Card>
                        </Grid>
                    ))}
                </Grid>

                {/* Analytics Link */}
                <Box sx={{ mt: 4 }}>
                    <Paper sx={{ p: 3, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box>
                                <Typography variant="h6" fontWeight="bold" gutterBottom>
                                    Course Analytics
                                </Typography>
                                <Typography variant="body2">
                                    View detailed analytics, student progress, and performance metrics
                                </Typography>
                            </Box>
                            <Button
                                variant="contained"
                                startIcon={<Analytics />}
                                onClick={() => navigate(`/courses/${courseId}/analytics`)}
                                sx={{ bgcolor: 'white', color: 'primary.main', '&:hover': { bgcolor: 'grey.100' } }}
                            >
                                View Analytics
                            </Button>
                        </Box>
                    </Paper>
                </Box>
            </Box>
        </AppLayout>
    );
}

