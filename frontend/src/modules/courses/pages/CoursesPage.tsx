import { useState, useEffect } from 'react';
import { Box, Typography, Button, Grid, Card, CardContent, CardActions, Chip, CircularProgress, Alert } from '@mui/material';
import { Add, School } from '@mui/icons-material';
import AppLayout from '@/shared/components/Layout/AppLayout';
import { useAuthStore } from '@/shared/store/authStore';
import apiClient from '@/shared/api/client';
import { Course } from '@/modules/courses/types/course.types';
import { useNavigate } from 'react-router-dom';

export default function CoursesPage() {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchCourses = async () => {
            try {
                const response = await apiClient.get('/api/courses?limit=100');
                // Handle both response formats: {items: []} or direct array
                const items = response?.data?.items || response?.data || [];
                setCourses(Array.isArray(items) ? items : []);
            } catch (err: any) {
                console.error('Failed to fetch courses:', err);
                const errorMessage = err?.response?.data?.detail || err?.message || 'Failed to load courses. Please try again later.';
                setError(errorMessage);
                setCourses([]);
            } finally {
                setLoading(false);
            }
        };

        fetchCourses();
    }, []);

    const isTeacher = user?.role === 'TEACHER' || user?.role === 'ADMIN' || user?.role === 'MANAGER';

    const handleOpenCourse = (courseId: string) => {
        // Unified course portal for all roles
        navigate(`/courses/${courseId}`);
    };

    return (
        <AppLayout>
            <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h4" fontWeight="bold">
                        {isTeacher ? 'My Teaching Courses' : 'My Courses'}
                    </Typography>
                    {isTeacher && (
                        <Button variant="contained" startIcon={<Add />} onClick={() => navigate('/admin/courses')}>
                            Manage Courses
                        </Button>
                    )}
                </Box>

                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : error ? (
                    <Alert severity="error">{error}</Alert>
                ) : (
                    <Grid container spacing={3}>
                        {courses.map((course) => (
                            <Grid item xs={12} sm={6} md={4} key={course.id}>
                                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                                    <CardContent sx={{ flexGrow: 1 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                            <School color="primary" />
                                            <Chip label={course.code} size="small" />
                                        </Box>
                                        <Typography variant="h6" gutterBottom>
                                            {course.name}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" paragraph>
                                            {course.description}
                                        </Typography>
                                        <Typography variant="caption" display="block" color="text.secondary">
                                            {course.enrollment_count || 0} students enrolled
                                        </Typography>
                                    </CardContent>
                                        <CardActions>
                                            <Button size="small" onClick={() => handleOpenCourse(course.id)}>
                                                Open
                                            </Button>
                                            {isTeacher && (
                                                <Button size="small" onClick={() => navigate(`/courses/${course.id}/materials`)}>
                                                    Materials
                                                </Button>
                                            )}
                                        </CardActions>
                                </Card>
                            </Grid>
                        ))}
                        {courses.length === 0 && (
                            <Grid item xs={12}>
                                <Alert severity="info">No courses found.</Alert>
                            </Grid>
                        )}
                    </Grid>
                )}
            </Box>
        </AppLayout>
    );
}

