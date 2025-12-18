import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Box,
    Typography,
    IconButton,
    Alert,
    Divider,
    Grid,
    Paper,
} from '@mui/material';
import { Add, Delete } from '@mui/icons-material';
import apiClient from '@/shared/api/client';

interface RubricItem {
    description: string;
    max_score: number;
    weight: number;
    order_index: number;
}

interface Rubric {
    id: string;
    title: string;
    items: Array<{
        id: string;
        description: string;
        max_score: number;
        weight: number;
        order_index: number;
    }>;
}

interface CreateRubricDialogProps {
    open: boolean;
    onClose: () => void;
    assignmentId: string;
    rubric?: Rubric | null;
    onSuccess: () => void;
}

export default function CreateRubricDialog({
    open,
    onClose,
    assignmentId,
    rubric,
    onSuccess,
}: CreateRubricDialogProps) {
    const [title, setTitle] = useState('');
    const [items, setItems] = useState<RubricItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (open) {
            if (rubric) {
                setTitle(rubric.title);
                setItems(
                    rubric.items.map((item) => ({
                        description: item.description,
                        max_score: parseFloat(item.max_score.toString()),
                        weight: parseFloat(item.weight.toString()),
                        order_index: item.order_index,
                    }))
                );
            } else {
                setTitle('');
                setItems([
                    {
                        description: '',
                        max_score: 10,
                        weight: 1.0,
                        order_index: 0,
                    },
                ]);
            }
        }
    }, [open, rubric]);

    const handleAddItem = () => {
        setItems([
            ...items,
            {
                description: '',
                max_score: 10,
                weight: 1.0,
                order_index: items.length,
            },
        ]);
    };

    const handleRemoveItem = (index: number) => {
        const newItems = items.filter((_, i) => i !== index);
        // Update order_index
        newItems.forEach((item, i) => {
            item.order_index = i;
        });
        setItems(newItems);
    };

    const handleItemChange = (index: number, field: keyof RubricItem, value: any) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    const handleSubmit = async () => {
        if (!title.trim()) {
            setError('Please enter a rubric title');
            return;
        }

        if (items.length === 0) {
            setError('Please add at least one rubric item');
            return;
        }

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (!item.description.trim()) {
                setError(`Please enter description for item ${i + 1}`);
                return;
            }
            if (item.max_score <= 0) {
                setError(`Max score must be greater than 0 for item ${i + 1}`);
                return;
            }
            if (item.weight < 0) {
                setError(`Weight must be non-negative for item ${i + 1}`);
                return;
            }
        }

        setLoading(true);
        setError(null);

        try {
            const payload = {
                title,
                items: items.map((item, index) => ({
                    description: item.description,
                    max_score: item.max_score,
                    weight: item.weight,
                    order_index: index,
                })),
            };

            if (rubric) {
                await apiClient.put(`/api/rubrics/rubrics/${rubric.id}`, payload);
            } else {
                await apiClient.post(`/api/rubrics/assignments/${assignmentId}/rubric`, payload);
            }

            onSuccess();
        } catch (err: any) {
            console.error('Failed to save rubric:', err);
            setError(err.response?.data?.detail || 'Failed to save rubric');
        } finally {
            setLoading(false);
        }
    };

    const totalMaxScore = items.reduce((sum, item) => sum + item.max_score * item.weight, 0);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>{rubric ? 'Edit Rubric' : 'Create Rubric'}</DialogTitle>
            <DialogContent>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 2 }}>
                    <TextField
                        fullWidth
                        label="Rubric Title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                        placeholder="e.g., Essay Grading Rubric"
                    />

                    <Divider />

                    <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6">Rubric Items</Typography>
                            <Button
                                startIcon={<Add />}
                                onClick={handleAddItem}
                                variant="outlined"
                                size="small"
                            >
                                Add Item
                            </Button>
                        </Box>

                        {items.map((item, index) => (
                            <Paper key={index} variant="outlined" sx={{ p: 2, mb: 2 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                                    <Typography variant="subtitle2">Item {index + 1}</Typography>
                                    {items.length > 1 && (
                                        <IconButton
                                            size="small"
                                            onClick={() => handleRemoveItem(index)}
                                            color="error"
                                        >
                                            <Delete />
                                        </IconButton>
                                    )}
                                </Box>

                                <Grid container spacing={2}>
                                    <Grid item xs={12}>
                                        <TextField
                                            fullWidth
                                            label="Description"
                                            value={item.description}
                                            onChange={(e) =>
                                                handleItemChange(index, 'description', e.target.value)
                                            }
                                            required
                                            multiline
                                            rows={2}
                                            placeholder="e.g., Content Quality, Grammar, Structure"
                                        />
                                    </Grid>
                                    <Grid item xs={6}>
                                        <TextField
                                            fullWidth
                                            label="Max Score"
                                            type="number"
                                            value={item.max_score}
                                            onChange={(e) =>
                                                handleItemChange(
                                                    index,
                                                    'max_score',
                                                    parseFloat(e.target.value) || 0
                                                )
                                            }
                                            required
                                            inputProps={{ min: 0, step: 0.1 }}
                                        />
                                    </Grid>
                                    <Grid item xs={6}>
                                        <TextField
                                            fullWidth
                                            label="Weight"
                                            type="number"
                                            value={item.weight}
                                            onChange={(e) =>
                                                handleItemChange(
                                                    index,
                                                    'weight',
                                                    parseFloat(e.target.value) || 0
                                                )
                                            }
                                            required
                                            inputProps={{ min: 0, step: 0.1 }}
                                            helperText="Relative importance (e.g., 1.0 = normal, 2.0 = double weight)"
                                        />
                                    </Grid>
                                </Grid>
                            </Paper>
                        ))}

                        {items.length > 0 && (
                            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                                <Typography variant="body2" color="text.secondary">
                                    Total Weighted Max Score: {totalMaxScore.toFixed(2)}
                                </Typography>
                            </Box>
                        )}
                    </Box>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={loading}>
                    Cancel
                </Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    disabled={loading || !title || items.length === 0}
                >
                    {loading ? 'Saving...' : rubric ? 'Update Rubric' : 'Create Rubric'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

