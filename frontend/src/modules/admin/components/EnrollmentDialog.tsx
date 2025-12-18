import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Button, Alert, Autocomplete, FormControl, InputLabel, Select, MenuItem, 
    CircularProgress, Box, Table, TableBody, TableCell, TableContainer, TableHead, 
    TableRow, Paper, IconButton, Chip, Divider, Typography
} from '@mui/material';
import { Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';
import apiClient from '@/shared/api/client';
import { adminCoursesApi } from '../api/adminCoursesApi';
import { useSnackbar } from 'notistack';
import { Enrollment } from '@/modules/courses/types/course.types';

interface User {
    id: string;
    email: string;
    full_name: string;
    role: string;
}

interface EnrollmentDialogProps {
    open: boolean;
    onClose: () => void;
    courseId: string;
    onEnrolled: () => void;
}

export default function EnrollmentDialog({ open, onClose, courseId, onEnrolled }: EnrollmentDialogProps) {
    const { enqueueSnackbar } = useSnackbar();
    const [users, setUsers] = useState<User[]>([]);
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [roleInCourse, setRoleInCourse] = useState<'student' | 'teacher'>('student');
    const [loading, setLoading] = useState(false);
    const [fetchingUsers, setFetchingUsers] = useState(false);
    const [fetchingEnrollments, setFetchingEnrollments] = useState(false);
    const [deletingEnrollmentId, setDeletingEnrollmentId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (open) {
            fetchUsers();
            fetchEnrollments();
            // Reset form state when dialog opens
            setSelectedUser(null);
            setRoleInCourse('student');
            setError(null);
        }
    }, [open, courseId]);

    const fetchUsers = async () => {
        setFetchingUsers(true);
        try {
            const response = await apiClient.get('/api/admin/users?limit=1000');
            // Handle both response formats: {users: []} or {items: []}
            const usersList = response?.data?.users || response?.data?.items || [];
            setUsers(Array.isArray(usersList) ? usersList : []);
        } catch (err: any) {
            console.error('Failed to fetch users:', err);
            const errorMessage = err?.response?.data?.detail || err?.message || 'Failed to load users';
            enqueueSnackbar(errorMessage, { variant: 'error' });
            setUsers([]);
        } finally {
            setFetchingUsers(false);
        }
    };

    const fetchEnrollments = async (silent: boolean = false) => {
        setFetchingEnrollments(true);
        try {
            const data = await adminCoursesApi.getEnrollments(courseId);
            setEnrollments(Array.isArray(data) ? data : []);
        } catch (err: any) {
            console.error('Failed to fetch enrollments:', err);
            const errorMessage = err?.response?.data?.detail || err?.message || 'Failed to load enrollments';
            // Only show error snackbar if not silent (e.g., after delete)
            if (!silent) {
                enqueueSnackbar(errorMessage, { variant: 'error' });
            }
            // Don't clear enrollments on error, keep existing data
            // setEnrollments([]); // Removed - don't clear on error
        } finally {
            setFetchingEnrollments(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser) {
            setError('Please select a user');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            await adminCoursesApi.enrollUser(courseId, {
                user_id: selectedUser.id,
                role: roleInCourse.toUpperCase() as 'STUDENT' | 'TEACHER'
            });
            enqueueSnackbar(`Successfully enrolled ${selectedUser.full_name} as ${roleInCourse}`, { variant: 'success' });
            setSelectedUser(null);
            setRoleInCourse('student');
            // Refresh enrollments to get updated list with correct roles
            await fetchEnrollments();
            onEnrolled();
        } catch (err: any) {
            const errorMsg = err.response?.data?.detail || 'Failed to enroll user';
            setError(errorMsg);
            enqueueSnackbar(errorMsg, { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteEnrollment = async (enrollmentId: string, userName: string) => {
        if (!window.confirm(`Are you sure you want to remove ${userName} from this course?`)) {
            return;
        }

        setDeletingEnrollmentId(enrollmentId);
        // Optimistic update: remove from UI immediately
        const previousEnrollments = [...enrollments];
        setEnrollments(enrollments.filter(e => e.id !== enrollmentId));
        
        try {
            await adminCoursesApi.unenrollUser(courseId, enrollmentId);
            enqueueSnackbar(`Successfully removed ${userName} from course`, { variant: 'success' });
            // Refresh enrollments list to ensure consistency (silent mode - don't show error if fails)
            try {
                await fetchEnrollments(true);
            } catch (refreshErr) {
                // Silently ignore refresh errors, optimistic update already applied
                console.log('Enrollment refresh failed (silent):', refreshErr);
            }
            onEnrolled();
        } catch (err: any) {
            console.error('Error deleting enrollment:', err);
            // Revert optimistic update on error
            setEnrollments(previousEnrollments);
            // Check if it's a JSON parsing error (which we handle as success for 204)
            if (err.message && err.message.includes('JSON') && err.message.includes('parse')) {
                // This might be a false positive - check if deletion actually succeeded
                // Try to refresh to verify
                try {
                    await fetchEnrollments(true);
                    // If refresh succeeds, deletion was successful
                    enqueueSnackbar(`Successfully removed ${userName} from course`, { variant: 'success' });
                    onEnrolled();
                } catch (refreshErr) {
                    // If refresh also fails, show error
                    const errorMsg = err.response?.data?.detail || err.message || 'Failed to remove enrollment';
                    enqueueSnackbar(errorMsg, { variant: 'error' });
                }
            } else {
                const errorMsg = err.response?.data?.detail || err.message || 'Failed to remove enrollment';
                enqueueSnackbar(errorMsg, { variant: 'error' });
            }
        } finally {
            setDeletingEnrollmentId(null);
        }
    };

    // Filter out already enrolled users
    const enrolledUserIds = new Set(enrollments.map(e => e.user_id));
    const availableUsers = users.filter(user => !enrolledUserIds.has(user.id));

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>Manage Course Enrollments</DialogTitle>
            <DialogContent>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                {/* Existing Enrollments */}
                <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        Current Enrollments ({enrollments.length})
                    </Typography>
                    {fetchingEnrollments ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                            <CircularProgress />
                        </Box>
                    ) : enrollments.length === 0 ? (
                        <Alert severity="info">No enrollments yet. Add users below.</Alert>
                    ) : (
                        <TableContainer component={Paper} variant="outlined">
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Name</TableCell>
                                        <TableCell>Email</TableCell>
                                        <TableCell>Role</TableCell>
                                        <TableCell align="right">Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {enrollments.map((enrollment) => (
                                        <TableRow key={enrollment.id}>
                                            <TableCell>{enrollment.user?.full_name || 'N/A'}</TableCell>
                                            <TableCell>{enrollment.user?.email || 'N/A'}</TableCell>
                                            <TableCell>
                                                <Chip 
                                                    label={enrollment.role_in_course || enrollment.role || 'student'} 
                                                    size="small"
                                                    color={(enrollment.role_in_course === 'teacher' || enrollment.role === 'TEACHER') ? 'primary' : 'default'}
                                                />
                                            </TableCell>
                                            <TableCell align="right">
                                                <IconButton
                                                    size="small"
                                                    color="error"
                                                    onClick={() => handleDeleteEnrollment(
                                                        enrollment.id, 
                                                        enrollment.user?.full_name || 'user'
                                                    )}
                                                    disabled={deletingEnrollmentId === enrollment.id}
                                                >
                                                    {deletingEnrollmentId === enrollment.id ? (
                                                        <CircularProgress size={20} />
                                                    ) : (
                                                        <DeleteIcon />
                                                    )}
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </Box>

                <Divider sx={{ my: 3 }} />

                {/* Add New Enrollment */}
                <Typography variant="h6" gutterBottom>
                    Add New Enrollment
                </Typography>
                <form onSubmit={handleSubmit}>
                    {fetchingUsers ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <>
                            <Autocomplete
                                options={availableUsers}
                                getOptionLabel={(option) => `${option.full_name} (${option.email}) - ${option.role}`}
                                value={selectedUser}
                                onChange={(_, newValue) => setSelectedUser(newValue)}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Select User"
                                        required
                                        margin="normal"
                                        fullWidth
                                        helperText={
                                            fetchingEnrollments || fetchingUsers 
                                                ? "Loading..." 
                                                : availableUsers.length === 0 
                                                    ? "All users are already enrolled" 
                                                    : ""
                                        }
                                        disabled={fetchingEnrollments || fetchingUsers}
                                    />
                                )}
                                sx={{ mt: 2 }}
                                disabled={fetchingEnrollments || fetchingUsers || (availableUsers.length === 0 && !fetchingEnrollments && !fetchingUsers)}
                                loading={fetchingUsers || fetchingEnrollments}
                            />

                            <FormControl fullWidth margin="normal">
                                <InputLabel>Role in Course</InputLabel>
                                <Select
                                    value={roleInCourse}
                                    label="Role in Course"
                                    onChange={(e) => setRoleInCourse(e.target.value as 'student' | 'teacher')}
                                >
                                    <MenuItem value="student">Student</MenuItem>
                                    <MenuItem value="teacher">Teacher</MenuItem>
                                </Select>
                            </FormControl>

                            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                                <Button 
                                    type="submit" 
                                    variant="contained" 
                                    startIcon={<AddIcon />}
                                    disabled={loading || !selectedUser || availableUsers.length === 0}
                                >
                                    {loading ? 'Enrolling...' : 'Enroll User'}
                                </Button>
                            </Box>
                        </>
                    )}
                </form>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
}
