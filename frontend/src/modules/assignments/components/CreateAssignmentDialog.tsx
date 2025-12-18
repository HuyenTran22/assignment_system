import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    FormControlLabel,
    Checkbox,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Box,
    Typography,
    Divider,
    Alert,
} from '@mui/material';
import apiClient from '@/shared/api/client';
import { Course } from '@/modules/courses/types/course.types';

interface CreateAssignmentDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    courseId?: string; // Optional: if provided, pre-select this course
}

export default function CreateAssignmentDialog({
    open,
    onClose,
    onSuccess,
    courseId,
}: CreateAssignmentDialogProps) {
    const [courses, setCourses] = useState<Course[]>([]);
    const [selectedCourseId, setSelectedCourseId] = useState<string>(courseId || '');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    // Format: YYYY-MM-DDTHH:mm for datetime-local input
    const defaultDueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const [dueDate, setDueDate] = useState<string>(
        defaultDueDate.toISOString().slice(0, 16) // Format: YYYY-MM-DDTHH:mm
    );
    const [allowLateSubmission, setAllowLateSubmission] = useState(false);
    const [allowPeerReview, setAllowPeerReview] = useState(false);
    const [enablePlagiarismCheck, setEnablePlagiarismCheck] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        console.log('CreateAssignmentDialog - open changed:', open);
        if (open) {
            console.log('CreateAssignmentDialog - fetching courses...');
            fetchCourses();
            if (courseId) {
                setSelectedCourseId(courseId);
            }
        }
    }, [open, courseId]);

    const fetchCourses = async () => {
        try {
            const response = await apiClient.get('/api/courses?limit=100');
            setCourses(response.data.items || []);
        } catch (err) {
            console.error('Failed to fetch courses:', err);
        }
    };

    const handleSubmit = async () => {
        if (!selectedCourseId || !title || !dueDate) {
            setError('Please fill in all required fields');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Convert datetime-local string to ISO string
            const dueDateISO = new Date(dueDate).toISOString();
            
            const payload = {
                title,
                description: description || null,
                due_at: dueDateISO,
                allow_late_submission: allowLateSubmission,
                allow_peer_review: allowPeerReview,
                enable_plagiarism_check: enablePlagiarismCheck,
            };

            console.log('Creating assignment with payload:', payload);
            await apiClient.post(`/api/courses/${selectedCourseId}/assignments`, payload);
            
            // Reset form
            setTitle('');
            setDescription('');
            const newDefaultDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            setDueDate(newDefaultDate.toISOString().slice(0, 16));
            setAllowLateSubmission(false);
            setAllowPeerReview(false);
            setEnablePlagiarismCheck(true);
            setSelectedCourseId(courseId || '');
            
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Failed to create assignment:', err);
            setError(err.response?.data?.detail || err.message || 'Failed to create assignment');
        } finally {
            setLoading(false);
        }
    };

    console.log('CreateAssignmentDialog render - open:', open);

    return (
        <Dialog 
            open={open} 
            onClose={onClose} 
            maxWidth="md" 
            fullWidth
            onBackdropClick={onClose}
        >
            <DialogTitle>Create New Assignment</DialogTitle>
            <DialogContent>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 2 }}>
                    <FormControl fullWidth required>
                        <InputLabel>Course</InputLabel>
                        <Select
                            value={selectedCourseId}
                            label="Course"
                            onChange={(e) => setSelectedCourseId(e.target.value)}
                            disabled={!!courseId}
                        >
                            {courses.map((course) => (
                                <MenuItem key={course.id} value={course.id}>
                                    {course.name} ({course.code})
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <TextField
                        fullWidth
                        label="Assignment Title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                        placeholder="e.g., Midterm Exam, Final Project"
                    />

                    <TextField
                        fullWidth
                        label="Description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        multiline
                        rows={4}
                        placeholder="Provide detailed instructions for students..."
                    />

                    <TextField
                        fullWidth
                        label="Due Date & Time"
                        type="datetime-local"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        required
                        InputLabelProps={{
                            shrink: true,
                        }}
                        inputProps={{
                            min: new Date().toISOString().slice(0, 16), // Prevent past dates
                        }}
                        helperText="Select date and time (24-hour format)"
                    />

                        <Divider />

                        <Typography variant="h6" gutterBottom>
                            Assignment Settings
                        </Typography>

                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={allowLateSubmission}
                                    onChange={(e) => setAllowLateSubmission(e.target.checked)}
                                />
                            }
                            label="Allow Late Submission"
                        />

                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={allowPeerReview}
                                    onChange={(e) => setAllowPeerReview(e.target.checked)}
                                />
                            }
                            label="Enable Peer Review (Students review each other's work)"
                        />

                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={enablePlagiarismCheck}
                                    onChange={(e) => setEnablePlagiarismCheck(e.target.checked)}
                                />
                            }
                            label="Enable Plagiarism Check (Automatically compare submissions for similarity)"
                        />

                        <Alert severity="info" sx={{ mt: 1 }}>
                            <Typography variant="body2">
                                <strong>Evaluation Workflow:</strong>
                                <br />
                                1. Students submit their work
                                <br />
                                2. System automatically checks for plagiarism
                                <br />
                                {allowPeerReview && '3. Submissions are distributed for peer review\n'}
                                {!allowPeerReview && '3. Teacher grades using rubric\n'}
                                {allowPeerReview && '4. Teacher reviews and finalizes grades\n'}
                                {!allowPeerReview && '4. Grades are recorded and tracked\n'}
                                5. Results are available to students
                            </Typography>
                        </Alert>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        variant="contained"
                        disabled={loading || !selectedCourseId || !title || !dueDate}
                    >
                        {loading ? 'Creating...' : 'Create Assignment'}
                    </Button>
                </DialogActions>
        </Dialog>
    );
}

