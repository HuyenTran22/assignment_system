import { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, Button, Grid, Card, CardContent, CardActions,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField,
    IconButton, CircularProgress, Alert, Chip, MenuItem, Select,
    FormControl, InputLabel
} from '@mui/material';
import {
    Add, Download, Verified, VerifiedUser, School, Person, CalendarToday,
    CheckCircle, ContentCopy
} from '@mui/icons-material';
import AppLayout from '@/shared/components/Layout/AppLayout';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '@/shared/api/client';
import { useSnackbar } from 'notistack';
import { useAuthStore } from '@/shared/store/authStore';
import { Certificate, CertificateGenerateRequest } from '../types/certificate.types';
import { Enrollment } from '../types/course.types';

export default function CertificatesPage() {
    const { courseId } = useParams<{ courseId: string }>();
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();
    const { user } = useAuthStore();
    const isTeacher = user?.role === 'TEACHER' || user?.role === 'MANAGER' || user?.role === 'ADMIN';

    const [certificates, setCertificates] = useState<Certificate[]>([]);
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingEnrollments, setLoadingEnrollments] = useState(false);
    const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
    const [importDialogOpen, setImportDialogOpen] = useState(false);
    const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
    const [verifyCode, setVerifyCode] = useState('');
    const [verifyResult, setVerifyResult] = useState<any>(null);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [generateForm, setGenerateForm] = useState<CertificateGenerateRequest>({
        course_id: courseId || '',
        user_id: '',
        grade: ''
    });

    useEffect(() => {
        if (courseId) {
            fetchCertificates();
            if (isTeacher) {
                fetchEnrollments();
            }
        }
    }, [courseId]);
    
    const fetchEnrollments = async () => {
        setLoadingEnrollments(true);
        try {
            const response = await apiClient.get(`/api/courses/${courseId}/enrollments`);
            const enrollmentsList = Array.isArray(response.data) ? response.data : [];
            // Filter only students
            const students = enrollmentsList.filter((e: Enrollment) => 
                e.role_in_course === 'student' || e.role === 'STUDENT'
            );
            setEnrollments(students);
        } catch (error: any) {
            console.error('Failed to fetch enrollments:', error);
            // Don't show error snackbar, just log
        } finally {
            setLoadingEnrollments(false);
        }
    };

    const fetchCertificates = async () => {
        if (!courseId) return;
        try {
            setLoading(true);
            // Use course-specific endpoint to avoid query param issues
            const response = await apiClient.get(`/api/courses/${courseId}/certificates`);
            setCertificates(response.data || []);
        } catch (error: any) {
            console.error('Failed to fetch certificates:', error);
            const errorMessage = error.response?.data?.detail || error.message || 'Failed to load certificates';
            enqueueSnackbar(errorMessage, { variant: 'error' });
            setCertificates([]);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async () => {
        try {
            await apiClient.post(`/api/courses/${courseId}/certificates/generate`, generateForm);
            enqueueSnackbar('Certificate generated successfully', { variant: 'success' });
            setGenerateDialogOpen(false);
            setGenerateForm({
                course_id: courseId || '',
                user_id: '',
                grade: ''
            });
            fetchCertificates();
        } catch (error: any) {
            console.error('Failed to generate certificate:', error);
            const errorMessage = error.response?.data?.detail || error.message || 'Failed to generate certificate';
            enqueueSnackbar(errorMessage, { variant: 'error' });
        }
    };

    const handleVerify = async () => {
        try {
            const response = await apiClient.get(`/api/courses/certificates/verify/${verifyCode}`);
            setVerifyResult(response.data);
            if (response.data.is_valid) {
                enqueueSnackbar('Certificate verified successfully', { variant: 'success' });
            } else {
                enqueueSnackbar(response.data.message, { variant: 'error' });
            }
        } catch (error: any) {
            console.error('Failed to verify certificate:', error);
            enqueueSnackbar(error.message || 'Failed to verify certificate', { variant: 'error' });
        }
    };

    const handleCopyVerificationCode = (code: string) => {
        navigator.clipboard.writeText(code);
        enqueueSnackbar('Verification code copied to clipboard', { variant: 'success' });
    };

    if (loading) {
        return (
            <AppLayout>
                <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                    <CircularProgress />
                </Box>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <Box p={3}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                    <Typography variant="h4" component="h1">
                        Certificates
                    </Typography>
                    <Box display="flex" gap={2}>
                        <Button
                            variant="outlined"
                            onClick={() => setVerifyDialogOpen(true)}
                        >
                            Verify Certificate
                        </Button>
                        {isTeacher && (
                            <>
                                <Button
                                    variant="outlined"
                                    onClick={() => setImportDialogOpen(true)}
                                >
                                    Import CSV
                                </Button>
                                <Button
                                    variant="contained"
                                    startIcon={<Add />}
                                    onClick={() => setGenerateDialogOpen(true)}
                                >
                                    Generate Certificate
                                </Button>
                            </>
                        )}
                    </Box>
                </Box>

                {certificates.length === 0 ? (
                    <Paper sx={{ p: 4, textAlign: 'center' }}>
                        <Verified sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                        <Typography variant="h6" color="text.secondary" gutterBottom>
                            No certificates yet
                        </Typography>
                        {isTeacher && (
                            <Typography variant="body2" color="text.secondary" mb={2}>
                                Generate certificates for students who completed the course
                            </Typography>
                        )}
                    </Paper>
                ) : (
                    <Grid container spacing={3}>
                        {certificates.map((certificate) => (
                            <Grid item xs={12} md={6} lg={4} key={certificate.id}>
                                <Card>
                                    <CardContent>
                                        <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                                            <Box display="flex" alignItems="center" gap={1}>
                                                <VerifiedUser color="primary" />
                                                <Typography variant="h6" component="h2">
                                                    {certificate.course_name}
                                                </Typography>
                                            </Box>
                                            {certificate.is_verified && (
                                                <Chip
                                                    icon={<CheckCircle />}
                                                    label="Verified"
                                                    color="success"
                                                    size="small"
                                                />
                                            )}
                                        </Box>

                                        <Box mb={2}>
                                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                                <Person fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                                                {certificate.student_name}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                                <School fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                                                {certificate.course_name}
                                            </Typography>
                                            {certificate.grade && (
                                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                                    Grade: {certificate.grade}
                                                </Typography>
                                            )}
                                            <Typography variant="body2" color="text.secondary">
                                                <CalendarToday fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                                                {new Date(certificate.completion_date).toLocaleDateString()}
                                            </Typography>
                                        </Box>

                                        <Box mb={2}>
                                            <Typography variant="caption" color="text.secondary" display="block">
                                                Certificate Number:
                                            </Typography>
                                            <Typography variant="body2" fontFamily="monospace">
                                                {certificate.certificate_number}
                                            </Typography>
                                        </Box>

                                        <Box>
                                            <Typography variant="caption" color="text.secondary" display="block">
                                                Verification Code:
                                            </Typography>
                                            <Box display="flex" alignItems="center" gap={1}>
                                                <Typography variant="body2" fontFamily="monospace" sx={{ flex: 1 }}>
                                                    {certificate.verification_code}
                                                </Typography>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleCopyVerificationCode(certificate.verification_code)}
                                                >
                                                    <ContentCopy fontSize="small" />
                                                </IconButton>
                                            </Box>
                                        </Box>
                                    </CardContent>
                                    <CardActions>
                                        <Button
                                            size="small"
                                            startIcon={<Download />}
                                            onClick={() => navigate(`/courses/${courseId}/certificates/${certificate.id}`)}
                                        >
                                            View / Download
                                        </Button>
                                    </CardActions>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                )}

                {/* Generate Certificate Dialog */}
                <Dialog open={generateDialogOpen} onClose={() => {
                    setGenerateDialogOpen(false);
                    setGenerateForm({
                        course_id: courseId || '',
                        user_id: '',
                        grade: ''
                    });
                }} maxWidth="sm" fullWidth>
                    <DialogTitle>Generate Certificate</DialogTitle>
                    <DialogContent>
                        <Box sx={{ pt: 2 }}>
                            <FormControl fullWidth margin="normal" required>
                                <InputLabel>Select Student</InputLabel>
                                <Select
                                    value={generateForm.user_id}
                                    onChange={(e) => setGenerateForm({ ...generateForm, user_id: e.target.value })}
                                    label="Select Student"
                                    disabled={loadingEnrollments}
                                >
                                    {enrollments.length === 0 ? (
                                        <MenuItem disabled>
                                            {loadingEnrollments ? 'Loading students...' : 'No students enrolled'}
                                        </MenuItem>
                                    ) : (
                                        enrollments.map((enrollment) => (
                                            <MenuItem key={enrollment.user_id} value={enrollment.user_id}>
                                                {enrollment.user?.full_name || 'Unknown'} 
                                                {enrollment.user?.student_id && ` (${enrollment.user.student_id})`}
                                                {enrollment.user?.email && ` - ${enrollment.user.email}`}
                                            </MenuItem>
                                        ))
                                    )}
                                </Select>
                            </FormControl>
                            <TextField
                                fullWidth
                                label="Grade (Optional)"
                                value={generateForm.grade}
                                onChange={(e) => setGenerateForm({ ...generateForm, grade: e.target.value })}
                                margin="normal"
                                placeholder="e.g., A, 95%, Excellent"
                            />
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => {
                            setGenerateDialogOpen(false);
                            setGenerateForm({
                                course_id: courseId || '',
                                user_id: '',
                                grade: ''
                            });
                        }}>Cancel</Button>
                        <Button onClick={handleGenerate} variant="contained" disabled={!generateForm.user_id || loadingEnrollments}>
                            Generate
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Import Certificates CSV Dialog */}
                <Dialog
                    open={importDialogOpen}
                    onClose={() => {
                        setImportDialogOpen(false);
                        setImportFile(null);
                    }}
                    maxWidth="sm"
                    fullWidth
                >
                    <DialogTitle>Import Certificates from CSV</DialogTitle>
                    <DialogContent>
                        <Box sx={{ pt: 2 }}>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                Upload a CSV file with columns: <strong>course_name</strong> (optional), <strong>student_email</strong>, <strong>score</strong> (0-10).
                                Each row will generate a certificate for the corresponding enrolled student.
                            </Typography>
                            <Button
                                variant="outlined"
                                component="label"
                                sx={{ mt: 1 }}
                            >
                                Select CSV File
                                <input
                                    type="file"
                                    accept=".csv"
                                    hidden
                                    onChange={(e) => {
                                        const file = e.target.files?.[0] || null;
                                        setImportFile(file);
                                    }}
                                />
                            </Button>
                            {importFile && (
                                <Typography variant="body2" sx={{ mt: 1 }}>
                                    Selected file: {importFile.name}
                                </Typography>
                            )}
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button
                            onClick={() => {
                                setImportDialogOpen(false);
                                setImportFile(null);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="contained"
                            disabled={!importFile || !courseId}
                            onClick={async () => {
                                if (!importFile || !courseId) return;
                                try {
                                    const formData = new FormData();
                                    formData.append('file', importFile);
                                    await apiClient.post(`/api/courses/${courseId}/certificates/import-csv`, formData, {
                                        headers: { 'Content-Type': 'multipart/form-data' }
                                    });
                                    enqueueSnackbar('Certificates imported successfully', { variant: 'success' });
                                    setImportDialogOpen(false);
                                    setImportFile(null);
                                    fetchCertificates();
                                } catch (error: any) {
                                    console.error('Failed to import certificates:', error);
                                    const errorMessage = error.response?.data?.detail || error.message || 'Failed to import certificates';
                                    enqueueSnackbar(errorMessage, { variant: 'error' });
                                }
                            }}
                        >
                            Import
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Verify Certificate Dialog */}
                <Dialog open={verifyDialogOpen} onClose={() => {
                    setVerifyDialogOpen(false);
                    setVerifyCode('');
                    setVerifyResult(null);
                }} maxWidth="sm" fullWidth>
                    <DialogTitle>Verify Certificate</DialogTitle>
                    <DialogContent>
                        <Box sx={{ pt: 2 }}>
                            <TextField
                                fullWidth
                                label="Verification Code"
                                value={verifyCode}
                                onChange={(e) => setVerifyCode(e.target.value)}
                                margin="normal"
                                required
                                placeholder="Enter verification code"
                                autoComplete="off"
                                inputProps={{
                                    autoComplete: 'off',
                                    'data-form-type': 'other'
                                }}
                            />
                            <Button
                                variant="contained"
                                onClick={handleVerify}
                                disabled={!verifyCode}
                                sx={{ mt: 2 }}
                            >
                                Verify
                            </Button>
                            {verifyResult && (
                                <Box sx={{ mt: 3 }}>
                                    {verifyResult.is_valid ? (
                                        <Alert severity="success" sx={{ mb: 2 }}>
                                            {verifyResult.message}
                                        </Alert>
                                    ) : (
                                        <Alert severity="error" sx={{ mb: 2 }}>
                                            {verifyResult.message}
                                        </Alert>
                                    )}
                                    {verifyResult.certificate && (
                                        <Paper sx={{ p: 2 }}>
                                            <Typography variant="subtitle1" gutterBottom>
                                                Certificate Details
                                            </Typography>
                                            <Typography variant="body2">
                                                <strong>Student:</strong> {verifyResult.certificate.student_name}
                                            </Typography>
                                            <Typography variant="body2">
                                                <strong>Course:</strong> {verifyResult.certificate.course_name}
                                            </Typography>
                                            <Typography variant="body2">
                                                <strong>Issued:</strong> {new Date(verifyResult.certificate.issued_at).toLocaleDateString()}
                                            </Typography>
                                            <Typography variant="body2" fontFamily="monospace" sx={{ mt: 1 }}>
                                                Certificate #: {verifyResult.certificate.certificate_number}
                                            </Typography>
                                        </Paper>
                                    )}
                                </Box>
                            )}
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => {
                            setVerifyDialogOpen(false);
                            setVerifyCode('');
                            setVerifyResult(null);
                        }}>
                            Close
                        </Button>
                    </DialogActions>
                </Dialog>
            </Box>
        </AppLayout>
    );
}

