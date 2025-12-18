import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Grid, Card, CardContent, Chip, CircularProgress, Alert, Select, MenuItem, FormControl, InputLabel, IconButton, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from '@mui/material';
import { Add, Assignment as AssignmentIcon, CalendarToday, Delete } from '@mui/icons-material';
import AppLayout from '@/shared/components/Layout/AppLayout';
import { useAuthStore } from '@/shared/store/authStore';
import apiClient from '@/shared/api/client';
import { Course } from '@/modules/courses/types/course.types';
import CreateAssignmentDialog from '../components/CreateAssignmentDialog';
import { useSnackbar } from 'notistack';

interface Assignment {
    id: string;
    title: string;
    description: string;
    due_at: string; // Changed from due_date to due_at
    course_id: string;
    course?: Course;
}

export default function AssignmentsPage() {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [selectedCourse, setSelectedCourse] = useState<string>('all');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [assignmentToDelete, setAssignmentToDelete] = useState<Assignment | null>(null);
    const [deleting, setDeleting] = useState(false);


    const fetchData = async () => {
        try {
            setLoading(true);
            // Fetch courses first
            const coursesRes = await apiClient.get('/api/courses?limit=100');
            setCourses(coursesRes.data.items);

            // Fetch assignments - assignments have their own endpoint
            const assignmentsRes = await apiClient.get('/api/assignments?limit=100');
            const assignmentsWithCourses = assignmentsRes.data.items.map((assignment: Assignment) => ({
                ...assignment,
                course: coursesRes.data.items.find((c: Course) => c.id === assignment.course_id)
            }));
            setAssignments(assignmentsWithCourses);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch data:', err);
            setError('Failed to load assignments. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const getStatusColor = (dueDate: string) => {
        if (!dueDate) return 'default';
        const now = new Date();
        const due = new Date(dueDate);
        if (isNaN(due.getTime())) return 'default';
        const daysUntilDue = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (daysUntilDue < 0) return 'error'; // Overdue
        if (daysUntilDue <= 3) return 'warning'; // Due soon
        return 'success'; // Plenty of time
    };

    const handleDeleteClick = (e: React.MouseEvent, assignment: Assignment) => {
        e.stopPropagation(); // Prevent card click
        setAssignmentToDelete(assignment);
        setDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!assignmentToDelete) return;

        setDeleting(true);
        try {
            await apiClient.delete(`/api/assignments/${assignmentToDelete.id}`);
            enqueueSnackbar('Assignment deleted successfully', { variant: 'success' });
            setDeleteDialogOpen(false);
            setAssignmentToDelete(null);
            // Refresh assignments list
            await fetchData();
        } catch (err: any) {
            console.error('Failed to delete assignment:', err);
            enqueueSnackbar(err.response?.data?.detail || 'Failed to delete assignment', { variant: 'error' });
        } finally {
            setDeleting(false);
        }
    };

    const filteredAssignments = selectedCourse === 'all'
        ? assignments
        : assignments.filter(a => a.course_id === selectedCourse);

    const isTeacherOrAdmin = user?.role === 'TEACHER' || user?.role === 'ADMIN' || user?.role === 'MANAGER';

    return (
        <AppLayout>
            <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h4" fontWeight="bold">
                        Assignments
                    </Typography>
                    {isTeacherOrAdmin && (
                        <Button
                            variant="contained"
                            startIcon={<Add />}
                            onClick={() => {
                                console.log('Create Assignment button clicked, opening dialog...');
                                setCreateDialogOpen(true);
                            }}
                        >
                            Create Assignment
                        </Button>
                    )}
                </Box>

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
                    <Grid container spacing={3}>
                        {filteredAssignments.map((assignment) => (
                            <Grid item xs={12} key={assignment.id}>
                                <Card
                                    sx={{ cursor: 'pointer', '&:hover': { boxShadow: 4 } }}
                                    onClick={() => navigate(`/assignments/${assignment.id}`)}
                                >
                                    <CardContent>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                            <Box sx={{ display: 'flex', gap: 2, flex: 1 }}>
                                                <AssignmentIcon color="primary" sx={{ fontSize: 40 }} />
                                                <Box sx={{ flex: 1 }}>
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                                                        <Typography variant="h6">{assignment.title}</Typography>
                                                        {isTeacherOrAdmin && (
                                                            <IconButton
                                                                size="small"
                                                                color="error"
                                                                onClick={(e) => handleDeleteClick(e, assignment)}
                                                                sx={{ ml: 1 }}
                                                            >
                                                                <Delete fontSize="small" />
                                                            </IconButton>
                                                        )}
                                                    </Box>
                                                    <Typography variant="body2" color="text.secondary" paragraph>
                                                        {assignment.description}
                                                    </Typography>
                                                    <Typography variant="body2" color="text.secondary">
                                                        Course: {assignment.course?.name || 'Unknown'}
                                                    </Typography>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                                                        <CalendarToday fontSize="small" color="action" />
                                                        <Typography variant="body2">
                                                            Due: {assignment.due_at ? new Date(assignment.due_at).toLocaleString('en-US', { hour12: false }) : 'N/A'}
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                            </Box>
                                            <Chip
                                                label={assignment.due_at && new Date(assignment.due_at) > new Date() ? 'ACTIVE' : 'OVERDUE'}
                                                color={getStatusColor(assignment.due_at) as any}
                                                size="small"
                                            />
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                        {filteredAssignments.length === 0 && (
                            <Grid item xs={12}>
                                <Alert severity="info">No assignments found.</Alert>
                            </Grid>
                        )}
                    </Grid>
                )}
            </Box>

            <CreateAssignmentDialog
                open={createDialogOpen}
                onClose={() => setCreateDialogOpen(false)}
                onSuccess={() => {
                    setCreateDialogOpen(false);
                    fetchData();
                }}
            />

            <Dialog
                open={deleteDialogOpen}
                onClose={() => !deleting && setDeleteDialogOpen(false)}
            >
                <DialogTitle>Delete Assignment</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to delete "{assignmentToDelete?.title}"? This action cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
                        Cancel
                    </Button>
                    <Button onClick={handleDeleteConfirm} color="error" variant="contained" disabled={deleting}>
                        {deleting ? 'Deleting...' : 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>
        </AppLayout>
    );
}

