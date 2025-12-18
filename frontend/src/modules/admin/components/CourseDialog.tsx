import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Button, Alert
} from '@mui/material';
import { Course, CourseCreate } from '@/modules/courses/types/course.types';

interface CourseDialogProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: CourseCreate) => Promise<void>;
    course?: Course | null;
}

export default function CourseDialog({ open, onClose, onSubmit, course }: CourseDialogProps) {
    const [formData, setFormData] = useState<CourseCreate>({
        name: '',
        code: '',
        description: '',
    });
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (course) {
            setFormData({
                name: course.name,
                code: course.code,
                description: course.description || '',
            });
        } else {
            setFormData({
                name: '',
                code: '',
                description: '',
            });
        }
        setError(null);
    }, [course, open]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            await onSubmit(formData);
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to save course');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>{course ? 'Edit Course' : 'Create New Course'}</DialogTitle>
            <form onSubmit={handleSubmit}>
                <DialogContent>
                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                    <TextField
                        fullWidth
                        label="Course Name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        margin="normal"
                    />

                    <TextField
                        fullWidth
                        label="Course Code"
                        name="code"
                        value={formData.code}
                        onChange={handleChange}
                        required
                        margin="normal"
                        helperText="Unique code (e.g., CS101)"
                        disabled={!!course} // Code is usually immutable or requires special check
                    />

                    <TextField
                        fullWidth
                        label="Description"
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        multiline
                        rows={3}
                        margin="normal"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose}>Cancel</Button>
                    <Button type="submit" variant="contained" disabled={loading}>
                        {loading ? 'Saving...' : (course ? 'Update' : 'Create')}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}
