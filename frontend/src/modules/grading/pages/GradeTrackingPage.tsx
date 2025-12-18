import { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Card,
    CardContent,
    Grid,
    Chip,
    CircularProgress,
    Alert,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Button,
} from '@mui/material';
import { Grade as GradeIcon, TrendingUp, Assignment as AssignmentIcon } from '@mui/icons-material';
import AppLayout from '@/shared/components/Layout/AppLayout';
import { useAuthStore } from '@/shared/store/authStore';
import apiClient from '@/shared/api/client';
import { Course } from '@/modules/courses/types/course.types';

interface Grade {
    id: string;
    score: number;
    feedback_text?: string;
    graded_at: string;
    submission: {
        id: string;
        submitted_at: string;
        status: string;
        student?: {
            id: string;
            full_name: string;
            email: string;
            student_id?: string;
        };
        assignment: {
            id: string;
            title: string;
            due_at: string;
            course: {
                id: string;
                name: string;
                code: string;
            };
        };
    };
    grader?: {
        id: string;
        full_name: string;
    };
}

export default function GradeTrackingPage() {
    const { user } = useAuthStore();
    const [courses, setCourses] = useState<Course[]>([]);
    const [selectedCourseId, setSelectedCourseId] = useState<string>('all');
    const [grades, setGrades] = useState<Grade[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const isTeacher = user?.role === 'TEACHER' || user?.role === 'ADMIN' || user?.role === 'MANAGER';

    useEffect(() => {
        fetchCourses();
    }, []);

    useEffect(() => {
        if (selectedCourseId) {
            fetchGrades();
        }
    }, [selectedCourseId]);

    const fetchCourses = async () => {
        try {
            const response = await apiClient.get('/api/courses?limit=100');
            setCourses(response.data.items || []);
            if (response.data.items && response.data.items.length > 0) {
                setSelectedCourseId(response.data.items[0].id);
            }
        } catch (err) {
            console.error('Failed to fetch courses:', err);
        }
    };

    const fetchGrades = async () => {
        setLoading(true);
        setError(null);
        try {
            if (isTeacher) {
                // Teacher: Get all grades for selected course
                if (selectedCourseId === 'all') {
                    const response = await apiClient.get('/api/grades');
                    setGrades(response.data.items || []);
                } else {
                    const response = await apiClient.get(`/api/grades/courses/${selectedCourseId}/grades`);
                    const selectedCourse = courses.find(c => c.id === selectedCourseId);
                    const gradesWithCourse = (response.data || []).map((grade: Grade) => ({
                        ...grade,
                        submission: {
                            ...grade.submission,
                            assignment: {
                                ...grade.submission.assignment,
                                course: selectedCourse || { id: selectedCourseId, name: '', code: '' }
                            }
                        }
                    }));
                    setGrades(gradesWithCourse);
                }
            } else {
                // Student: Get own grades
                if (selectedCourseId === 'all') {
                    const response = await apiClient.get('/api/grades/students/me/grades');
                    setGrades(response.data || []);
                } else {
                    const response = await apiClient.get(`/api/grades/courses/${selectedCourseId}/grades/me`);
                    const selectedCourse = courses.find(c => c.id === selectedCourseId);
                    const gradesWithCourse = (response.data || []).map((grade: Grade) => ({
                        ...grade,
                        submission: {
                            ...grade.submission,
                            assignment: {
                                ...grade.submission.assignment,
                                course: selectedCourse || { id: selectedCourseId, name: '', code: '' }
                            }
                        }
                    }));
                    setGrades(gradesWithCourse);
                }
            }
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

    const filteredGrades = selectedCourseId === 'all'
        ? grades
        : grades.filter(g => g.submission.assignment.course.id === selectedCourseId);

    const getGradeColor = (score: number) => {
        if (score >= 90) return 'success';
        if (score >= 80) return 'primary';
        if (score >= 70) return 'info';
        if (score >= 60) return 'warning';
        return 'error';
    };

    return (
        <AppLayout>
            <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h4" fontWeight="bold">
                        {isTeacher ? 'Grade Tracking' : 'My Grades'}
                    </Typography>
                </Box>

                <FormControl fullWidth sx={{ mb: 3 }}>
                    <InputLabel>Filter by Course</InputLabel>
                    <Select
                        value={selectedCourseId}
                        label="Filter by Course"
                        onChange={(e) => setSelectedCourseId(e.target.value)}
                    >
                        <MenuItem value="all">All Courses</MenuItem>
                        {courses.map(course => (
                            <MenuItem key={course.id} value={course.id}>
                                {course.name} ({course.code})
                            </MenuItem>
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
                        {filteredGrades.length > 0 && (
                            <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <TrendingUp sx={{ fontSize: 60 }} />
                                        <Box>
                                            <Typography variant="h3" fontWeight="bold">
                                                {avgGrade.toFixed(1)}%
                                            </Typography>
                                            <Typography variant="h6">
                                                {isTeacher ? 'Average Grade (All Students)' : 'My Average Grade'}
                                            </Typography>
                                            <Typography variant="body2" sx={{ mt: 1 }}>
                                                {filteredGrades.length} {filteredGrades.length === 1 ? 'assignment' : 'assignments'} graded
                                            </Typography>
                                        </Box>
                                    </Box>
                                </CardContent>
                            </Card>
                        )}

                        {/* Grades Table */}
                        {filteredGrades.length > 0 ? (
                            <TableContainer component={Paper}>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            {isTeacher && (
                                                <>
                                                    <TableCell><strong>Student</strong></TableCell>
                                                    <TableCell><strong>Student ID</strong></TableCell>
                                                </>
                                            )}
                                            <TableCell><strong>Assignment</strong></TableCell>
                                            <TableCell><strong>Course</strong></TableCell>
                                            <TableCell><strong>Due Date</strong></TableCell>
                                            <TableCell><strong>Submitted</strong></TableCell>
                                            <TableCell align="right"><strong>Score</strong></TableCell>
                                            <TableCell align="right"><strong>Percentage</strong></TableCell>
                                            {isTeacher && (
                                                <TableCell><strong>Graded By</strong></TableCell>
                                            )}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {filteredGrades.map((grade) => {
                                            const percentage = grade.score;
                                            return (
                                                <TableRow key={grade.id} hover>
                                                    {isTeacher && (
                                                        <>
                                                            <TableCell>
                                                                {grade.submission.student?.full_name || 'Unknown'}
                                                            </TableCell>
                                                            <TableCell>
                                                                {grade.submission.student?.student_id || '-'}
                                                            </TableCell>
                                                        </>
                                                    )}
                                                    <TableCell>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            <AssignmentIcon fontSize="small" color="action" />
                                                            {grade.submission.assignment.title}
                                                        </Box>
                                                    </TableCell>
                                                    <TableCell>
                                                        {grade.submission.assignment.course.name}
                                                    </TableCell>
                                                    <TableCell>
                                                        {new Date(grade.submission.assignment.due_at).toLocaleDateString('en-US', { hour12: false })}
                                                    </TableCell>
                                                    <TableCell>
                                                        {new Date(grade.submission.submitted_at).toLocaleDateString('en-US', { hour12: false })}
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        <Chip
                                                            label={`${grade.score}/100`}
                                                            color={getGradeColor(grade.score) as any}
                                                            size="small"
                                                        />
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        <Typography
                                                            variant="body2"
                                                            fontWeight="bold"
                                                            color={getGradeColor(grade.score) === 'success' ? 'success.main' : 
                                                                   getGradeColor(grade.score) === 'primary' ? 'primary.main' :
                                                                   getGradeColor(grade.score) === 'warning' ? 'warning.main' : 'error.main'}
                                                        >
                                                            {percentage.toFixed(1)}%
                                                        </Typography>
                                                    </TableCell>
                                                    {isTeacher && (
                                                        <TableCell>
                                                            {grade.grader?.full_name || 'Unknown'}
                                                        </TableCell>
                                                    )}
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        ) : (
                            <Alert severity="info">
                                {selectedCourseId === 'all'
                                    ? 'No grades available yet.'
                                    : 'No grades available for this course.'}
                            </Alert>
                        )}

                        {/* Feedback Section for Students */}
                        {!isTeacher && filteredGrades.length > 0 && (
                            <Box sx={{ mt: 3 }}>
                                <Typography variant="h6" gutterBottom>
                                    Detailed Feedback
                                </Typography>
                                <Grid container spacing={2}>
                                    {filteredGrades
                                        .filter(g => g.feedback_text)
                                        .map((grade) => (
                                            <Grid item xs={12} key={grade.id}>
                                                <Card variant="outlined">
                                                    <CardContent>
                                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                                                            <Typography variant="h6">
                                                                {grade.submission.assignment.title}
                                                            </Typography>
                                                            <Chip
                                                                label={`${grade.score}/100`}
                                                                color={getGradeColor(grade.score) as any}
                                                                size="small"
                                                            />
                                                        </Box>
                                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                                            {grade.submission.assignment.course.name}
                                                        </Typography>
                                                        <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                                                            {grade.feedback_text}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                                            Graded on: {new Date(grade.graded_at).toLocaleString('en-US', { hour12: false })}
                                                        </Typography>
                                                    </CardContent>
                                                </Card>
                                            </Grid>
                                        ))}
                                </Grid>
                            </Box>
                        )}
                    </>
                )}
            </Box>
        </AppLayout>
    );
}

