import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Card,
    CardContent,
    Grid,
    Alert,
    CircularProgress,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip,
    Button,
    Slider,
} from '@mui/material';
import { ArrowBack, Security, Warning } from '@mui/icons-material';
import AppLayout from '@/shared/components/Layout/AppLayout';
import apiClient from '@/shared/api/client';

interface PlagiarismMatch {
    id: string;
    assignment_id: string;
    submission1_id: string;
    submission2_id: string;
    similarity_score: number;
    checked_at: string;
    student1: {
        id: string;
        full_name: string;
    };
    student2: {
        id: string;
        full_name: string;
    };
}

interface PlagiarismReport {
    assignment_id: string;
    total_submissions: number;
    total_comparisons: number;
    matches: PlagiarismMatch[];
    high_similarity_count: number;
    medium_similarity_count: number;
}

export default function PlagiarismReportPage() {
    const { assignmentId } = useParams<{ assignmentId: string }>();
    const navigate = useNavigate();
    const [report, setReport] = useState<PlagiarismReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [threshold, setThreshold] = useState(70);

    useEffect(() => {
        if (assignmentId) {
            fetchReport();
        }
    }, [assignmentId, threshold]);

    const fetchReport = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get(
                `/api/plagiarism/assignments/${assignmentId}/plagiarism-report?threshold=${threshold}`
            );
            setReport(response.data);
            setError(null);
        } catch (err: any) {
            console.error('Failed to fetch plagiarism report:', err);
            setError(err.response?.data?.detail || 'Failed to load plagiarism report');
        } finally {
            setLoading(false);
        }
    };

    const getSeverityColor = (score: number): 'error' | 'warning' | 'info' => {
        if (score > 70) return 'error';
        if (score >= 50) return 'warning';
        return 'info';
    };

    const getSeverityLabel = (score: number): string => {
        if (score > 70) return 'High Risk';
        if (score >= 50) return 'Medium Risk';
        return 'Low Risk';
    };

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

    if (!report) {
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
                    <Alert severity="info">No plagiarism report available</Alert>
                </Box>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <Box>
                <Button
                    startIcon={<ArrowBack />}
                    onClick={() => navigate(-1)}
                    sx={{ mb: 3 }}
                >
                    Back to Assignment
                </Button>

                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <Security sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
                    <Typography variant="h4" fontWeight="bold">
                        Plagiarism Report
                    </Typography>
                </Box>

                {/* Summary Cards */}
                <Grid container spacing={3} sx={{ mb: 4 }}>
                    <Grid item xs={12} md={3}>
                        <Card>
                            <CardContent>
                                <Typography variant="h4" fontWeight="bold">
                                    {report.total_submissions}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Total Submissions
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <Card>
                            <CardContent>
                                <Typography variant="h4" fontWeight="bold">
                                    {report.total_comparisons}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Total Comparisons
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <Card sx={{ bgcolor: 'error.light' }}>
                            <CardContent>
                                <Typography variant="h4" fontWeight="bold" color="error.dark">
                                    {report.high_similarity_count}
                                </Typography>
                                <Typography variant="body2" color="error.dark">
                                    High Similarity (&gt;70%)
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <Card sx={{ bgcolor: 'warning.light' }}>
                            <CardContent>
                                <Typography variant="h4" fontWeight="bold" color="warning.dark">
                                    {report.medium_similarity_count}
                                </Typography>
                                <Typography variant="body2" color="warning.dark">
                                    Medium Similarity (50-70%)
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>

                {/* Threshold Slider */}
                <Card sx={{ mb: 3 }}>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            Similarity Threshold: {threshold}%
                        </Typography>
                        <Slider
                            value={threshold}
                            onChange={(_, value) => setThreshold(value as number)}
                            min={0}
                            max={100}
                            step={5}
                            marks
                            valueLabelDisplay="auto"
                        />
                        <Typography variant="caption" color="text.secondary">
                            Only showing matches with similarity &ge; {threshold}%
                        </Typography>
                    </CardContent>
                </Card>

                {/* Matches Table */}
                {report.matches.length === 0 ? (
                    <Alert severity="success" icon={<Security />}>
                        No plagiarism matches found above {threshold}% similarity threshold.
                    </Alert>
                ) : (
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                                <Warning sx={{ mr: 1, color: 'warning.main' }} />
                                Detected Matches ({report.matches.length})
                            </Typography>
                            <TableContainer component={Paper} variant="outlined">
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell><strong>Student 1</strong></TableCell>
                                            <TableCell><strong>Student 2</strong></TableCell>
                                            <TableCell align="center"><strong>Similarity</strong></TableCell>
                                            <TableCell align="center"><strong>Severity</strong></TableCell>
                                            <TableCell><strong>Checked At</strong></TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {report.matches.map((match) => {
                                            const similarity = Number(match.similarity_score);
                                            return (
                                            <TableRow key={match.id} hover>
                                                <TableCell>{match.student1.full_name}</TableCell>
                                                <TableCell>{match.student2.full_name}</TableCell>
                                                <TableCell align="center">
                                                    <Typography
                                                        variant="h6"
                                                        color={
                                                            similarity > 70
                                                                ? 'error.main'
                                                                : similarity >= 50
                                                                ? 'warning.main'
                                                                : 'info.main'
                                                        }
                                                        fontWeight="bold"
                                                    >
                                                        {similarity.toFixed(1)}%
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Chip
                                                        label={getSeverityLabel(similarity)}
                                                        color={getSeverityColor(similarity)}
                                                        size="small"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    {new Date(match.checked_at).toLocaleString('vi-VN')}
                                                </TableCell>
                                            </TableRow>
                                            );
                                        })}
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

