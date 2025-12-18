import { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, Grid, Chip, CircularProgress, Alert, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { Grade as GradeIcon, TrendingUp, School } from '@mui/icons-material';
import AppLayout from '@/shared/components/Layout/AppLayout';
import apiClient from '@/shared/api/client';
import { useAuthStore } from '@/shared/store/authStore';

interface Grade {
    id: string;
    score: number;
    feedback_text?: string;
    graded_at: string;
    submission: {
        id: string;
        submitted_at: string;
        status: string;
    };
    assignment: {
        id: string;
        title: string;
        due_at: string;
    };
}

interface Course {
    id: string;
    name: string;
}

export default function GradesPage() {
    const { user } = useAuthStore();
    const [grades, setGrades] = useState<Grade[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [selectedCourse, setSelectedCourse] = useState<string>('all');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchCourses();
        fetchGrades();
    }, [selectedCourse]);

    const fetchCourses = async () => {
        try {
            const response = await apiClient.get('/api/courses/me');
            setCourses(response.data);
        } catch (err) {
            console.error('Failed to fetch courses:', err);
        }
    };

    const fetchGrades = async () => {
        try {
            setLoading(true);
            const url = selectedCourse === 'all' 
                ? '/api/grades/students/me/grades'
                : `/api/grades/courses/${selectedCourse}/grades/me`;
            const response = await apiClient.get(url);
            setGrades(response.data);
            setError(null);
        } catch (err: any) {
            console.error('Failed to fetch grades:', err);
            setError(err.response?.data?.detail || 'Failed to load grades. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    const avgGrade = grades.length > 0
        ? grades.reduce((sum, g) => sum + g.score, 0) / grades.length
        : 0;

    return (
        <AppLayout>
            <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <School sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
                    <Typography variant="h4" fontWeight="bold">
                        My Grades
                    </Typography>
                </Box>

                {/* Course Filter */}
                <FormControl fullWidth sx={{ mb: 3 }}>
                    <InputLabel>Filter by Course</InputLabel>
                    <Select
                        value={selectedCourse}
                        label="Filter by Course"
                        onChange={(e) => setSelectedCourse(e.target.value)}
                    >
                        <MenuItem value="all">All Courses</MenuItem>
                        {courses.map(course => (
                            <MenuItem key={course.id} value={course.id}>{course.name}</MenuItem>
                        ))}
                    </Select>
                </FormControl>

                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : error ? (
                    <Alert severity="error">{error}</Alert>
                ) : (
                    <>
                        {/* Summary Card */}
                        <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                            <CardContent>
                                <Grid container spacing={3}>
                                    <Grid item xs={12} md={4}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                            <TrendingUp sx={{ fontSize: 50 }} />
                                            <Box>
                                                <Typography variant="h3" fontWeight="bold">
                                                    {avgGrade.toFixed(1)}/100
                                                </Typography>
                                                <Typography variant="body1">Average Score</Typography>
                                            </Box>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={12} md={4}>
                                        <Box>
                                            <Typography variant="h3" fontWeight="bold">
                                                {grades.length}
                                            </Typography>
                                            <Typography variant="body1">Total Assignments Graded</Typography>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={12} md={4}>
                                        <Box>
                                            <Typography variant="h3" fontWeight="bold">
                                                {grades.filter(g => g.score >= 90).length}
                                            </Typography>
                                            <Typography variant="body1">Excellent Grades (≥90)</Typography>
                                        </Box>
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>

                        {/* Grades List */}
                        <Grid container spacing={2}>
                            {grades.map((grade) => {
                                return (
                                    <Grid item xs={12} key={grade.id}>
                                        <Card>
                                            <CardContent>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <Box sx={{ display: 'flex', gap: 2, flex: 1 }}>
                                                        <GradeIcon color="primary" sx={{ fontSize: 40 }} />
                                                        <Box sx={{ flex: 1 }}>
                                                            <Typography variant="h6">
                                                                {grade.assignment.title}
                                                            </Typography>
                                                            <Typography variant="body2" color="text.secondary">
                                                                Submitted: {new Date(grade.submission.submitted_at).toLocaleString('vi-VN')}
                                                            </Typography>
                                                            <Typography variant="body2" color="text.secondary">
                                                                Graded: {new Date(grade.graded_at).toLocaleString('vi-VN')}
                                                            </Typography>
                                                            {grade.feedback_text && (
                                                                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontStyle: 'italic', p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
                                                                    💬 Feedback: {grade.feedback_text}
                                                                </Typography>
                                                            )}
                                                        </Box>
                                                    </Box>
                                                    <Box sx={{ textAlign: 'right' }}>
                                                        <Chip
                                                            label={`${grade.score}/100`}
                                                            color={grade.score >= 90 ? 'success' : grade.score >= 80 ? 'primary' : grade.score >= 70 ? 'warning' : 'error'}
                                                            sx={{ fontSize: '1.2rem', fontWeight: 'bold', px: 2, py: 3 }}
                                                        />
                                                    </Box>
                                                </Box>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                );
                            })}
                            {grades.length === 0 && (
                                <Grid item xs={12}>
                                    <Alert severity="info">No grades available yet for the selected course.</Alert>
                                </Grid>
                            )}
                        </Grid>
                    </>
                )}
            </Box>
        </AppLayout>
    );
}

