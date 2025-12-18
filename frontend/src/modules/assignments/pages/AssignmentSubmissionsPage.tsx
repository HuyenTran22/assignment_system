import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Alert,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
} from '@mui/material';
import {
    ArrowBack,
    Grade,
    Edit,
    Download,
    InsertDriveFile,
} from '@mui/icons-material';
import AppLayout from '@/shared/components/Layout/AppLayout';
import { useAuthStore } from '@/shared/store/authStore';
import apiClient from '@/shared/api/client';
import { useSnackbar } from 'notistack';
import CreateRubricDialog from '../components/CreateRubricDialog';
import GradeWithRubricDialog from '../components/GradeWithRubricDialog';

interface Submission {
    id: string;
    submitted_at: string;
    status: string;
    comment?: string;
    student: {
        id: string;
        full_name: string;
        email: string;
    };
    grade?: {
        score: number;
        graded_at: string;
    };
    files: Array<{
        id: string;
        original_name: string;
        file_size?: number;
    }>;
}

interface Assignment {
    id: string;
    title: string;
    course: {
        id: string;
        name: string;
    };
}

export default function AssignmentSubmissionsPage() {
    const { assignmentId } = useParams<{ assignmentId: string }>();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const { enqueueSnackbar } = useSnackbar();
    const [assignment, setAssignment] = useState<Assignment | null>(null);
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [rubricDialogOpen, setRubricDialogOpen] = useState(false);
    const [gradeDialogOpen, setGradeDialogOpen] = useState(false);
    const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
    const [rubric, setRubric] = useState<any>(null);

    const isTeacher = user?.role === 'TEACHER' || user?.role === 'ADMIN' || user?.role === 'MANAGER';

    useEffect(() => {
        if (assignmentId) {
            fetchAssignment();
            fetchSubmissions();
            fetchRubric();
        }
    }, [assignmentId]);

    const fetchAssignment = async () => {
        try {
            const response = await apiClient.get(`/api/assignments/${assignmentId}`);
            setAssignment(response.data);
        } catch (err: any) {
            console.error('Failed to fetch assignment:', err);
            setError(err.response?.data?.detail || 'Failed to load assignment');
        }
    };

    const fetchSubmissions = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get(`/api/assignments/${assignmentId}/submissions?limit=100`);
            setSubmissions(response.data.items || []);
        } catch (err: any) {
            console.error('Failed to fetch submissions:', err);
            setError(err.response?.data?.detail || 'Failed to load submissions');
        } finally {
            setLoading(false);
        }
    };

    const fetchRubric = async () => {
        try {
            const response = await apiClient.get(`/api/rubrics/assignments/${assignmentId}/rubric`);
            setRubric(response.data);
        } catch (err: any) {
            // 404 is OK - no rubric yet
            if (err.response?.status !== 404) {
                console.error('Failed to fetch rubric:', err);
            }
        }
    };

    const handleGradeClick = (submission: Submission) => {
        if (!rubric) {
            enqueueSnackbar('Please create a rubric first', { variant: 'warning' });
            setRubricDialogOpen(true);
            return;
        }
        setSelectedSubmission(submission);
        setGradeDialogOpen(true);
    };

    const handleGradeSuccess = () => {
        fetchSubmissions();
        setGradeDialogOpen(false);
        setSelectedSubmission(null);
        enqueueSnackbar('Submission graded successfully', { variant: 'success' });
    };

    const handleRubricCreated = () => {
        fetchRubric();
        setRubricDialogOpen(false);
        enqueueSnackbar('Rubric created successfully', { variant: 'success' });
    };

    const handleDownloadFile = async (fileId: string, fileName: string) => {
        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch(`/api/submissions/files/${fileId}/download`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Download failed');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Download error:', error);
            enqueueSnackbar('Failed to download file', { variant: 'error' });
        }
    };

    if (loading && !assignment) {
        return (
            <AppLayout>
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                    <CircularProgress />
                </Box>
            </AppLayout>
        );
    }

    if (error && !assignment) {
        return (
            <AppLayout>
                <Box sx={{ p: 3 }}>
                    <Alert severity="error">{error}</Alert>
                    <Button onClick={() => navigate('/assignments')} sx={{ mt: 2 }}>
                        Back to Assignments
                    </Button>
                </Box>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <Box sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <IconButton onClick={() => navigate(`/assignments/${assignmentId}`)} sx={{ mr: 1 }}>
                        <ArrowBack />
                    </IconButton>
                    <Box>
                        <Typography variant="h4" gutterBottom>
                            Submissions
                        </Typography>
                        {assignment && (
                            <Typography variant="body1" color="text.secondary">
                                {assignment.title} - {assignment.course.name}
                            </Typography>
                        )}
                    </Box>
                </Box>

                {isTeacher && (
                    <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
                        <Button
                            variant="outlined"
                            onClick={() => setRubricDialogOpen(true)}
                            startIcon={<Edit />}
                        >
                            {rubric ? 'Edit Rubric' : 'Create Rubric'}
                        </Button>
                    </Box>
                )}

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}

                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : submissions.length === 0 ? (
                    <Card>
                        <CardContent>
                            <Typography variant="body1" color="text.secondary" align="center">
                                No submissions yet
                            </Typography>
                        </CardContent>
                    </Card>
                ) : (
                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Student</TableCell>
                                    <TableCell>Submitted At</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Files</TableCell>
                                    <TableCell>Grade</TableCell>
                                    {isTeacher && <TableCell>Actions</TableCell>}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {submissions.map((submission) => (
                                    <TableRow key={submission.id} hover>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight="medium">
                                                {submission.student.full_name}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {submission.student.email}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            {new Date(submission.submitted_at).toLocaleString()}
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={submission.status}
                                                size="small"
                                                color={
                                                    submission.status === 'SUBMITTED'
                                                        ? 'success'
                                                        : submission.status === 'LATE'
                                                        ? 'warning'
                                                        : 'default'
                                                }
                                            />
                                        </TableCell>
                                        <TableCell>
                                            {submission.files && submission.files.length > 0 ? (
                                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                                    {submission.files.map((file) => (
                                                        <Box key={file.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                            <InsertDriveFile fontSize="small" color="action" />
                                                            <Typography variant="caption" sx={{ flex: 1 }}>
                                                                {file.original_name}
                                                            </Typography>
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => handleDownloadFile(file.id, file.original_name)}
                                                                title="Download"
                                                            >
                                                                <Download fontSize="small" />
                                                            </IconButton>
                                                        </Box>
                                                    ))}
                                                </Box>
                                            ) : (
                                                <Typography variant="body2" color="text.secondary">
                                                    No files
                                                </Typography>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {submission.grade ? (
                                                <Chip
                                                    label={`${submission.grade.score}/100`}
                                                    color="primary"
                                                    size="small"
                                                />
                                            ) : (
                                                <Chip label="Not Graded" size="small" />
                                            )}
                                        </TableCell>
                                        {isTeacher && (
                                            <TableCell>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleGradeClick(submission)}
                                                    color="primary"
                                                >
                                                    <Grade />
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

            {/* Create/Edit Rubric Dialog */}
            <CreateRubricDialog
                open={rubricDialogOpen}
                onClose={() => setRubricDialogOpen(false)}
                assignmentId={assignmentId!}
                rubric={rubric}
                onSuccess={handleRubricCreated}
            />

            {/* Grade with Rubric Dialog */}
            {selectedSubmission && (
                <GradeWithRubricDialog
                    open={gradeDialogOpen}
                    onClose={() => {
                        setGradeDialogOpen(false);
                        setSelectedSubmission(null);
                    }}
                    submission={selectedSubmission}
                    rubric={rubric}
                    onSuccess={handleGradeSuccess}
                />
            )}
        </AppLayout>
    );
}

