import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Card,
    CardContent,
    CircularProgress,
    Alert,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip,
    Button,
    Grid,
} from '@mui/material';
import { ArrowBack, School, TrendingUp, People } from '@mui/icons-material';
import AppLayout from '@/shared/components/Layout/AppLayout';
import apiClient from '@/shared/api/client';

interface StudentGrade {
    id: string;
    score: number;
    feedback_text?: string;
    graded_at: string;
    submission: {
        id: string;
        submitted_at: string;
        status: string;
        student: {
            id: string;
            full_name: string;
            email: string;
            student_id?: string;
        };
    };
    assignment: {
        id: string;
        title: string;
        due_at: string;
    };
    grader?: {
        id: string;
        full_name: string;
    };
}

interface Course {
    id: string;
    name: string;
    code: string;
}

export default function CourseGradesPage() {
    const { courseId } = useParams<{ courseId: string }>();
    const navigate = useNavigate();
    const [course, setCourse] = useState<Course | null>(null);
    const [grades, setGrades] = useState<StudentGrade[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (courseId) {
            fetchCourse();
            fetchGrades();
        }
    }, [courseId]);

    const fetchCourse = async () => {
        try {
            const response = await apiClient.get(`/api/courses/${courseId}`);
            setCourse(response.data);
        } catch (err) {
            console.error('Failed to fetch course:', err);
        }
    };

    const fetchGrades = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get(`/api/grades/courses/${courseId}/grades`);
            setGrades(response.data);
            setError(null);
        } catch (err: any) {
            console.error('Failed to fetch grades:', err);
            setError(err.response?.data?.detail || 'Failed to load grades');
        } finally {
            setLoading(false);
        }
    };

    const getScoreColor = (score: number): 'success' | 'primary' | 'warning' | 'error' => {
        if (score >= 90) return 'success';
        if (score >= 80) return 'primary';
        if (score >= 70) return 'warning';
        return 'error';
    };

    const avgScore = grades.length > 0 
        ? grades.reduce((sum, g) => sum + g.score, 0) / grades.length 
        : 0;

    const uniqueStudents = new Set(grades.map(g => g.submission.student.id)).size;

    if (loading) {
        return (
            <AppLayout>
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                    <CircularProgress />
                </Box>
            </AppLayout>
        );
    }

    if (error) {
        return (
            <AppLayout>
                <Box>
                    <Button
                        startIcon={<ArrowBack />}
                        onClick={() => navigate(-1)}
                        sx={{ mb: 2 }}
                    >
                        Back
                    </Button>
                    <Alert severity="error">{error}</Alert>
                </Box>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <Box>
                <Button
                    startIcon={<ArrowBack />}
                    onClick={() => navigate(`/courses/${courseId}`)}
                    sx={{ mb: 3 }}
                >
                    Back to Course
                </Button>

                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <School sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
                    <Box>
                        <Typography variant="h4" fontWeight="bold">
                            Course Grades
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            {course?.name} ({course?.code})
                        </Typography>
                    </Box>
                </Box>

                {/* Summary Cards */}
                <Grid container spacing={3} sx={{ mb: 4 }}>
                    <Grid item xs={12} md={4}>
                        <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <TrendingUp sx={{ fontSize: 50 }} />
                                    <Box>
                                        <Typography variant="h3" fontWeight="bold">
                                            {avgScore.toFixed(1)}
                                        </Typography>
                                        <Typography variant="body1">Average Score</Typography>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <Card>
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <People sx={{ fontSize: 50, color: 'primary.main' }} />
                                    <Box>
                                        <Typography variant="h3" fontWeight="bold">
                                            {uniqueStudents}
                                        </Typography>
                                        <Typography variant="body1" color="text.secondary">
                                            Students Graded
                                        </Typography>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <Card>
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <School sx={{ fontSize: 50, color: 'success.main' }} />
                                    <Box>
                                        <Typography variant="h3" fontWeight="bold">
                                            {grades.length}
                                        </Typography>
                                        <Typography variant="body1" color="text.secondary">
                                            Total Grades
                                        </Typography>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>

                {/* Grades Table */}
                {grades.length === 0 ? (
                    <Alert severity="info">No grades available yet for this course.</Alert>
                ) : (
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                All Grades
                            </Typography>
                            <TableContainer component={Paper} variant="outlined">
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell><strong>Student</strong></TableCell>
                                            <TableCell><strong>Student ID</strong></TableCell>
                                            <TableCell><strong>Assignment</strong></TableCell>
                                            <TableCell align="center"><strong>Score</strong></TableCell>
                                            <TableCell><strong>Submitted</strong></TableCell>
                                            <TableCell><strong>Graded</strong></TableCell>
                                            <TableCell><strong>Graded By</strong></TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {grades.map((grade) => (
                                            <TableRow key={grade.id} hover>
                                                <TableCell>
                                                    <Typography variant="body2" fontWeight="medium">
                                                        {grade.submission.student.full_name}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {grade.submission.student.email}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    {grade.submission.student.student_id || 'N/A'}
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2">
                                                        {grade.assignment.title}
                                                    </Typography>
                                                    {grade.feedback_text && (
                                                        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                                            💬 {grade.feedback_text.substring(0, 50)}
                                                            {grade.feedback_text.length > 50 ? '...' : ''}
                                                        </Typography>
                                                    )}
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Chip
                                                        label={`${grade.score}/100`}
                                                        color={getScoreColor(grade.score)}
                                                        size="small"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="caption">
                                                        {new Date(grade.submission.submitted_at).toLocaleDateString('vi-VN')}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="caption">
                                                        {new Date(grade.graded_at).toLocaleDateString('vi-VN')}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    {grade.grader?.full_name || 'N/A'}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </CardContent>
                    </Card>
                )}
            </Box>
        </AppLayout>
    );
}

