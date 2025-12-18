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
    Alert,
    Divider,
    Grid,
    Paper,
    CircularProgress,
} from '@mui/material';
import apiClient from '@/shared/api/client';

interface RubricItem {
    id: string;
    description: string;
    max_score: number;
    weight: number;
    order_index: number;
}

interface Rubric {
    id: string;
    title: string;
    items: RubricItem[];
}

interface Submission {
    id: string;
    student: {
        full_name: string;
    };
}

interface RubricScore {
    rubric_item_id: string;
    score: number;
    comment?: string;
}

interface GradeWithRubricDialogProps {
    open: boolean;
    onClose: () => void;
    submission: Submission;
    rubric: Rubric | null;
    onSuccess: () => void;
}

export default function GradeWithRubricDialog({
    open,
    onClose,
    submission,
    rubric,
    onSuccess,
}: GradeWithRubricDialogProps) {
    const [scores, setScores] = useState<Record<string, RubricScore>>({});
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (open && rubric) {
            // Initialize scores
            const initialScores: Record<string, RubricScore> = {};
            rubric.items.forEach((item) => {
                initialScores[item.id] = {
                    rubric_item_id: item.id,
                    score: 0,
                    comment: '',
                };
            });
            setScores(initialScores);

            // Fetch existing scores if any
            fetchExistingScores();
        }
    }, [open, rubric, submission.id]);

    const fetchExistingScores = async () => {
        if (!rubric) return;

        setFetching(true);
        try {
            const response = await apiClient.get(`/api/rubrics/submissions/${submission.id}/rubric-scores`);
            const existingScores = response.data;

            if (existingScores && existingScores.length > 0) {
                const updatedScores = { ...scores };
                existingScores.forEach((score: any) => {
                    updatedScores[score.rubric_item_id] = {
                        rubric_item_id: score.rubric_item_id,
                        score: parseFloat(score.score.toString()),
                        comment: score.comment || '',
                    };
                });
                setScores(updatedScores);
            }
        } catch (err: any) {
            // 404 is OK - no scores yet
            if (err.response?.status !== 404) {
                console.error('Failed to fetch existing scores:', err);
            }
        } finally {
            setFetching(false);
        }
    };

    const handleScoreChange = (itemId: string, field: 'score' | 'comment', value: any) => {
        setScores({
            ...scores,
            [itemId]: {
                ...scores[itemId],
                [field]: value,
            },
        });
    };

    const calculateTotalScore = () => {
        if (!rubric) return 0;

        let totalWeightedScore = 0;
        let totalWeightedMax = 0;

        rubric.items.forEach((item) => {
            const score = scores[item.id]?.score || 0;
            totalWeightedScore += score * parseFloat(item.weight.toString());
            totalWeightedMax += parseFloat(item.max_score.toString()) * parseFloat(item.weight.toString());
        });

        if (totalWeightedMax === 0) return 0;
        return (totalWeightedScore / totalWeightedMax) * 100;
    };

    const handleSubmit = async () => {
        if (!rubric) return;

        // Validate all items are scored
        for (const item of rubric.items) {
            const score = scores[item.id];
            if (!score || score.score < 0) {
                setError(`Please enter a score for "${item.description}"`);
                return;
            }
            if (score.score > item.max_score) {
                setError(`Score for "${item.description}" cannot exceed ${item.max_score}`);
                return;
            }
        }

        setLoading(true);
        setError(null);

        try {
            const payload = {
                scores: rubric.items.map((item) => ({
                    rubric_item_id: item.id,
                    score: scores[item.id].score,
                    comment: scores[item.id].comment || null,
                })),
            };

            await apiClient.post(`/api/rubrics/submissions/${submission.id}/rubric-scores`, payload);
            onSuccess();
        } catch (err: any) {
            console.error('Failed to grade submission:', err);
            setError(err.response?.data?.detail || 'Failed to grade submission');
        } finally {
            setLoading(false);
        }
    };

    if (!rubric) {
        return (
            <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
                <DialogTitle>Grade Submission</DialogTitle>
                <DialogContent>
                    <Alert severity="error">No rubric found for this assignment</Alert>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose}>Close</Button>
                </DialogActions>
            </Dialog>
        );
    }

    const totalScore = calculateTotalScore();
    const sortedItems = [...rubric.items].sort((a, b) => a.order_index - b.order_index);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>
                Grade Submission - {submission.student.full_name}
            </DialogTitle>
            <DialogContent>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}

                {fetching ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 2 }}>
                        <Typography variant="h6">{rubric.title}</Typography>

                        {sortedItems.map((item, index) => {
                            const score = scores[item.id] || {
                                rubric_item_id: item.id,
                                score: 0,
                                comment: '',
                            };

                            return (
                                <Paper key={item.id} variant="outlined" sx={{ p: 2 }}>
                                    <Typography variant="subtitle1" gutterBottom>
                                        {index + 1}. {item.description}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                                        Max Score: {item.max_score} | Weight: {item.weight}
                                    </Typography>

                                    <Grid container spacing={2}>
                                        <Grid item xs={12} sm={4}>
                                            <TextField
                                                fullWidth
                                                label="Score"
                                                type="number"
                                                value={score.score}
                                                onChange={(e) =>
                                                    handleScoreChange(
                                                        item.id,
                                                        'score',
                                                        parseFloat(e.target.value) || 0
                                                    )
                                                }
                                                required
                                                inputProps={{
                                                    min: 0,
                                                    max: item.max_score,
                                                    step: 0.1,
                                                }}
                                                helperText={`Max: ${item.max_score}`}
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={8}>
                                            <TextField
                                                fullWidth
                                                label="Comment (Optional)"
                                                value={score.comment || ''}
                                                onChange={(e) =>
                                                    handleScoreChange(item.id, 'comment', e.target.value)
                                                }
                                                multiline
                                                rows={2}
                                                placeholder="Provide feedback for this criterion..."
                                            />
                                        </Grid>
                                    </Grid>
                                </Paper>
                            );
                        })}

                        <Divider />

                        <Box sx={{ p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
                            <Typography variant="h6" color="primary.contrastText">
                                Total Score: {totalScore.toFixed(2)}/100
                            </Typography>
                        </Box>
                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={loading}>
                    Cancel
                </Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    disabled={loading || fetching}
                >
                    {loading ? 'Grading...' : 'Submit Grade'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

