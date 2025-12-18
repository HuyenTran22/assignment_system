import { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Chip, CircularProgress, Alert, Button, IconButton
} from '@mui/material';
import { ArrowBack, Delete, PersonAdd } from '@mui/icons-material';
import AppLayout from '@/shared/components/Layout/AppLayout';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/shared/store/authStore';
import apiClient from '@/shared/api/client';
import { useSnackbar } from 'notistack';
import { Enrollment } from '../types/course.types';

export default function CourseStudentsPage() {
    const { courseId } = useParams<{ courseId: string }>();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const { enqueueSnackbar } = useSnackbar();
    
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    
    const isAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER';
    
    useEffect(() => {
        if (courseId) {
            fetchEnrollments();
        }
    }, [courseId]);
    
    const fetchEnrollments = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await apiClient.get(`/api/courses/${courseId}/enrollments`);
            setEnrollments(Array.isArray(response.data) ? response.data : []);
        } catch (err: any) {
            console.error('Failed to fetch enrollments:', err);
            setError(err.response?.data?.detail || 'Failed to load students');
            enqueueSnackbar('Failed to load students', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };
    
    const handleDeleteEnrollment = async (enrollmentId: string) => {
        if (!isAdmin) {
            enqueueSnackbar('Only admins can remove students', { variant: 'warning' });
            return;
        }
        
        if (!confirm('Are you sure you want to remove this student from the course?')) {
            return;
        }
        
        setDeletingId(enrollmentId);
        try {
            await apiClient.delete(`/api/courses/${courseId}/enrollments/${enrollmentId}`);
            enqueueSnackbar('Student removed successfully', { variant: 'success' });
            fetchEnrollments();
        } catch (err: any) {
            console.error('Failed to delete enrollment:', err);
            enqueueSnackbar(err.response?.data?.detail || 'Failed to remove student', { variant: 'error' });
        } finally {
            setDeletingId(null);
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
    
    if (error && enrollments.length === 0) {
        return (
            <AppLayout>
                <Box sx={{ p: 3 }}>
                    <Button startIcon={<ArrowBack />} onClick={() => navigate(`/courses/${courseId}`)} sx={{ mb: 2 }}>
                        Back to Course
                    </Button>
                    <Alert severity="error">{error}</Alert>
                </Box>
            </AppLayout>
        );
    }
    
    const students = enrollments.filter(e => 
        e.role_in_course === 'student' || e.role === 'STUDENT'
    );
    const teachers = enrollments.filter(e => 
        e.role_in_course === 'teacher' || e.role === 'TEACHER'
    );
    
    return (
        <AppLayout>
            <Box sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <Button 
                        startIcon={<ArrowBack />} 
                        onClick={() => navigate(`/courses/${courseId}`)}
                        sx={{ mr: 2 }}
                    >
                        Back
                    </Button>
                    <Typography variant="h4">Students</Typography>
                </Box>
                
                {!isAdmin && (
                    <Alert severity="info" sx={{ mb: 3 }}>
                        You are viewing students in read-only mode. Only administrators can add or remove students.
                    </Alert>
                )}
                
                {isAdmin && (
                    <Alert severity="info" sx={{ mb: 3 }}>
                        You have administrator privileges. You can add or remove students from this course.
                    </Alert>
                )}
                
                {/* Teachers Section */}
                {teachers.length > 0 && (
                    <Box sx={{ mb: 4 }}>
                        <Typography variant="h6" gutterBottom>
                            Teachers ({teachers.length})
                        </Typography>
                        <TableContainer component={Paper} variant="outlined">
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Name</TableCell>
                                        <TableCell>Email</TableCell>
                                        <TableCell>Student ID</TableCell>
                                        <TableCell>Role</TableCell>
                                        {isAdmin && <TableCell align="right">Actions</TableCell>}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {teachers.map((enrollment) => (
                                        <TableRow key={enrollment.id}>
                                            <TableCell>{enrollment.user?.full_name || 'N/A'}</TableCell>
                                            <TableCell>{enrollment.user?.email || 'N/A'}</TableCell>
                                            <TableCell>{enrollment.user?.student_id || '-'}</TableCell>
                                            <TableCell>
                                                <Chip 
                                                    label="Teacher" 
                                                    size="small"
                                                    color="primary"
                                                />
                                            </TableCell>
                                            {isAdmin && (
                                                <TableCell align="right">
                                                    <IconButton
                                                        size="small"
                                                        color="error"
                                                        onClick={() => handleDeleteEnrollment(enrollment.id)}
                                                        disabled={deletingId === enrollment.id}
                                                    >
                                                        <Delete />
                                                    </IconButton>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                )}
                
                {/* Students Section */}
                <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6">
                            Students ({students.length})
                        </Typography>
                        {isAdmin && (
                            <Button
                                variant="contained"
                                startIcon={<PersonAdd />}
                                onClick={() => navigate(`/admin/courses`)}
                            >
                                Add Student
                            </Button>
                        )}
                    </Box>
                    
                    {students.length === 0 ? (
                        <Paper sx={{ p: 3, textAlign: 'center' }}>
                            <Typography color="textSecondary">
                                No students enrolled in this course yet.
                            </Typography>
                        </Paper>
                    ) : (
                        <TableContainer component={Paper} variant="outlined">
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Name</TableCell>
                                        <TableCell>Email</TableCell>
                                        <TableCell>Student ID</TableCell>
                                        <TableCell>Enrolled At</TableCell>
                                        {isAdmin && <TableCell align="right">Actions</TableCell>}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {students.map((enrollment) => (
                                        <TableRow key={enrollment.id}>
                                            <TableCell>{enrollment.user?.full_name || 'N/A'}</TableCell>
                                            <TableCell>{enrollment.user?.email || 'N/A'}</TableCell>
                                            <TableCell>{enrollment.user?.student_id || '-'}</TableCell>
                                            <TableCell>
                                                {enrollment.enrolled_at 
                                                    ? new Date(enrollment.enrolled_at).toLocaleDateString()
                                                    : enrollment.joined_at
                                                        ? new Date(enrollment.joined_at).toLocaleDateString()
                                                        : '-'
                                                }
                                            </TableCell>
                                            {isAdmin && (
                                                <TableCell align="right">
                                                    <IconButton
                                                        size="small"
                                                        color="error"
                                                        onClick={() => handleDeleteEnrollment(enrollment.id)}
                                                        disabled={deletingId === enrollment.id}
                                                    >
                                                        <Delete />
                                                    </IconButton>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </Box>
            </Box>
        </AppLayout>
    );
}

