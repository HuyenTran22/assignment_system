import { useEffect, useState } from 'react';
import {
    Box,
    Typography,
    Button,
    CircularProgress,
    Alert,
} from '@mui/material';
import AppLayout from '@/shared/components/Layout/AppLayout';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '@/shared/api/client';
import { useSnackbar } from 'notistack';
import { Certificate } from '../types/certificate.types';

export default function CertificateViewPage() {
    const { courseId, certificateId } = useParams<{ courseId: string; certificateId: string }>();
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();

    const [certificate, setCertificate] = useState<Certificate | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchCertificate = async () => {
            if (!certificateId) return;
            setLoading(true);
            setError(null);
            try {
                const response = await apiClient.get(`/api/courses/certificates/${certificateId}`);
                setCertificate(response.data);
            } catch (err: any) {
                console.error('Failed to load certificate:', err);
                const msg = err.response?.data?.detail || err.message || 'Failed to load certificate';
                setError(msg);
                enqueueSnackbar(msg, { variant: 'error' });
            } finally {
                setLoading(false);
            }
        };

        fetchCertificate();
    }, [certificateId]);

    const handlePrint = () => {
        window.print();
    };

    if (loading) {
        return (
            <AppLayout>
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                    <CircularProgress />
                </Box>
            </AppLayout>
        );
    }

    if (error || !certificate) {
        return (
            <AppLayout>
                <Box sx={{ p: 3 }}>
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error || 'Certificate not found'}
                    </Alert>
                    <Button
                        variant="contained"
                        onClick={() => navigate(`/courses/${courseId}/certificates`)}
                    >
                        Back to Certificates
                    </Button>
                </Box>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Box sx={{ mb: 2, alignSelf: 'flex-start' }}>
                    <Button onClick={() => navigate(`/courses/${courseId}/certificates`)}>
                        Back to Certificates
                    </Button>
                </Box>

                <Box
                    sx={{
                        width: '100%',
                        maxWidth: 900,
                        bgcolor: '#fdfaf4',
                        borderRadius: 4,
                        boxShadow: 6,
                        border: '2px solid #d4af37',
                        p: 6,
                        position: 'relative',
                        backgroundImage: 'radial-gradient(circle at top left, #fff7e6, transparent 55%), radial-gradient(circle at bottom right, #e6f3ff, transparent 55%)',
                    }}
                >
                    <Box
                        sx={{
                            position: 'absolute',
                            inset: 24,
                            border: '1px dashed rgba(0,0,0,0.08)',
                            borderRadius: 3,
                            pointerEvents: 'none',
                        }}
                    />

                    <Box sx={{ textAlign: 'center', mb: 4, position: 'relative' }}>
                        <Typography variant="h5" sx={{ letterSpacing: 6, textTransform: 'uppercase', color: 'text.secondary' }}>
                            Certificate of Completion
                        </Typography>
                        <Typography variant="h3" sx={{ mt: 2, fontWeight: 700, letterSpacing: 3 }}>
                            {certificate.course_name}
                        </Typography>
                    </Box>

                    <Box sx={{ textAlign: 'center', mb: 4 }}>
                        <Typography variant="subtitle1" sx={{ mb: 1, color: 'text.secondary' }}>
                            This is to certify that
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                            {certificate.student_name}
                        </Typography>
                        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                            has successfully completed the course with the following achievement
                        </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4 }}>
                        <Box>
                            <Typography variant="body2" color="text.secondary">
                                Completion Date
                            </Typography>
                            <Typography variant="body1">
                                {new Date(certificate.completion_date).toLocaleDateString()}
                            </Typography>
                        </Box>
                        {certificate.grade && (
                            <Box>
                                <Typography variant="body2" color="text.secondary">
                                    Achievement
                                </Typography>
                                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                    {certificate.grade}
                                </Typography>
                            </Box>
                        )}
                        <Box>
                            <Typography variant="body2" color="text.secondary">
                                Certificate No.
                            </Typography>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                {certificate.certificate_number}
                            </Typography>
                        </Box>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 6 }}>
                        <Box>
                            <Typography variant="body2" color="text.secondary">
                                Verification Code
                            </Typography>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                {certificate.verification_code}
                            </Typography>
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="body2" color="text.secondary">
                                Issued by
                            </Typography>
                            <Typography variant="body1">
                                {certificate.issuer_name || 'Course Instructor'}
                            </Typography>
                        </Box>
                    </Box>
                </Box>

                <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                    <Button variant="contained" onClick={handlePrint}>
                        Download / Print PDF
                    </Button>
                </Box>
            </Box>
        </AppLayout>
    );
}


