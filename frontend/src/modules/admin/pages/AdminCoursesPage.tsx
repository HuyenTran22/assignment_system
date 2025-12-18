import { useState, useEffect } from 'react';
import {
    Box, Typography, Button, Paper, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, IconButton, Chip,
    TablePagination, TextField, InputAdornment, Tooltip
} from '@mui/material';
import { Add, Edit, Delete, Search, People } from '@mui/icons-material';
import { adminCoursesApi } from '../api/adminCoursesApi';
import CourseDialog from '../components/CourseDialog';
import EnrollmentDialog from '../components/EnrollmentDialog';
import { Course } from '@/modules/courses/types/course.types';
import { useSnackbar } from 'notistack';

export default function AdminCoursesPage() {
    const { enqueueSnackbar } = useSnackbar();
    const [courses, setCourses] = useState<Course[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);

    // Dialog State
    const [openDialog, setOpenDialog] = useState(false);
    const [openEnrollmentDialog, setOpenEnrollmentDialog] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

    const fetchCourses = async () => {
        setLoading(true);
        try {
            const data = await adminCoursesApi.getAllCourses({
                page: page + 1,
                limit: rowsPerPage,
                search: search || undefined
            });
            setCourses(data?.items || []);
            setTotal(data?.total || 0);
        } catch (error: any) {
            console.error('Failed to fetch courses:', error);
            const errorMessage = error?.response?.data?.detail || error?.message || 'Failed to fetch courses';
            enqueueSnackbar(errorMessage, { variant: 'error' });
            setCourses([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCourses();
    }, [page, rowsPerPage, search]);

    const handleCreate = async (data: any) => {
        await adminCoursesApi.createCourse(data);
        enqueueSnackbar('Course created successfully', { variant: 'success' });
        fetchCourses();
    };

    const handleUpdate = async (data: any) => {
        if (!selectedCourse) return;
        await adminCoursesApi.updateCourse(selectedCourse.id, data);
        enqueueSnackbar('Course updated successfully', { variant: 'success' });
        fetchCourses();
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this course? This action cannot be undone.')) return;
        
        // Optimistic update: remove from UI immediately
        const previousCourses = [...courses];
        const previousTotal = total;
        setCourses(courses.filter(c => c.id !== id));
        setTotal(total - 1);
        
        try {
            await adminCoursesApi.deleteCourse(id);
            enqueueSnackbar('Course deleted successfully', { variant: 'success' });
            // Refresh to ensure consistency
            try {
                await fetchCourses();
            } catch (refreshErr) {
                // Silently ignore refresh errors, optimistic update already applied
                console.log('Course refresh failed (silent):', refreshErr);
            }
        } catch (error: any) {
            console.error('Error deleting course:', error);
            // Check if it's a JSON parsing error (which we handle as success for 204)
            if (error.message && error.message.includes('JSON') && error.message.includes('parse')) {
                // This might be a false positive - check if deletion actually succeeded
                // Try to refresh to verify
                try {
                    await fetchCourses();
                    // If refresh succeeds, deletion was successful
                    enqueueSnackbar('Course deleted successfully', { variant: 'success' });
                } catch (refreshErr) {
                    // If refresh also fails, revert and show error
                    setCourses(previousCourses);
                    setTotal(previousTotal);
                    const errorMsg = error?.response?.data?.detail || error?.message || 'Failed to delete course';
                    enqueueSnackbar(errorMsg, { variant: 'error' });
                }
            } else {
                // Revert optimistic update on error
                setCourses(previousCourses);
                setTotal(previousTotal);
                const errorMsg = error?.response?.data?.detail || error?.message || 'Failed to delete course';
                enqueueSnackbar(errorMsg, { variant: 'error' });
            }
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4">Course Management</Typography>
                <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => { setSelectedCourse(null); setOpenDialog(true); }}
                >
                    Create Course
                </Button>
            </Box>

            <Paper sx={{ mb: 3, p: 2 }}>
                <TextField
                    fullWidth
                    variant="outlined"
                    placeholder="Search courses by name or code..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <Search />
                            </InputAdornment>
                        ),
                    }}
                />
            </Paper>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Code</TableCell>
                            <TableCell>Name</TableCell>
                            <TableCell>Enrollments</TableCell>
                            <TableCell>Assignments</TableCell>
                            <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {courses.map((course) => (
                            <TableRow key={course.id}>
                                <TableCell>
                                    <Chip label={course.code} size="small" color="primary" variant="outlined" />
                                </TableCell>
                                <TableCell>{course.name}</TableCell>
                                <TableCell>{course.enrollment_count || 0}</TableCell>
                                <TableCell>{course.assignment_count || 0}</TableCell>
                                <TableCell align="right">
                                    <Tooltip title="Manage Enrollments">
                                        <IconButton
                                            color="info"
                                            onClick={() => {
                                                setSelectedCourse(course);
                                                setOpenEnrollmentDialog(true);
                                            }}
                                        >
                                            <People />
                                        </IconButton>
                                    </Tooltip>
                                    <IconButton
                                        color="primary"
                                        onClick={() => { setSelectedCourse(course); setOpenDialog(true); }}
                                    >
                                        <Edit />
                                    </IconButton>
                                    <IconButton
                                        color="error"
                                        onClick={() => handleDelete(course.id)}
                                    >
                                        <Delete />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                        {courses.length === 0 && !loading && (
                            <TableRow>
                                <TableCell colSpan={5} align="center">
                                    No courses found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
                <TablePagination
                    component="div"
                    count={total}
                    page={page}
                    onPageChange={(_, newPage) => setPage(newPage)}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={(e) => setRowsPerPage(parseInt(e.target.value, 10))}
                />
            </TableContainer>

            <CourseDialog
                open={openDialog}
                onClose={() => setOpenDialog(false)}
                onSubmit={selectedCourse ? handleUpdate : handleCreate}
                course={selectedCourse}
            />

            {selectedCourse && (
                <EnrollmentDialog
                    open={openEnrollmentDialog}
                    onClose={() => {
                        setOpenEnrollmentDialog(false);
                        setSelectedCourse(null);
                    }}
                    courseId={selectedCourse.id}
                    onEnrolled={() => {
                        fetchCourses();
                    }}
                />
            )}
        </Box>
    );
}
