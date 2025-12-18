import React, { useState } from 'react';
import {
    Box, Typography, Paper, Button, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Alert, LinearProgress, Checkbox, FormControlLabel
} from '@mui/material';
import { CloudUpload, Download, ArrowBack } from '@mui/icons-material';
import { adminApi } from '../api/adminApi';
import { CSVImportResponse } from '../types/admin.types';
import { useNavigate } from 'react-router-dom';

export default function CSVImportPage() {
    const navigate = useNavigate();
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<CSVImportResponse | null>(null);
    const [sendEmails, setSendEmails] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            setFile(event.target.files[0]);
            setResult(null);
            setError(null);
        }
    };

    const handleUpload = async () => {
        if (!file) return;
        setLoading(true);
        setError(null);
        try {
            const data = await adminApi.importUsers(file, sendEmails);
            setResult(data);
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to upload CSV');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            <Button startIcon={<ArrowBack />} onClick={() => navigate('/admin/users')} sx={{ mb: 2 }}>
                Back to Users
            </Button>

            <Typography variant="h4" gutterBottom>Import Users from CSV</Typography>

            <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>1. Download Template</Typography>
                <Typography variant="body2" color="textSecondary" paragraph>
                    Download the CSV template to ensure your data is formatted correctly.
                </Typography>
                <Button variant="outlined" startIcon={<Download />} onClick={adminApi.downloadTemplate}>
                    Download Template
                </Button>

                <Box sx={{ my: 3, borderTop: '1px solid #eee' }} />

                <Typography variant="h6" gutterBottom>2. Upload CSV File</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Button
                        variant="contained"
                        component="label"
                        startIcon={<CloudUpload />}
                    >
                        Select File
                        <input type="file" hidden accept=".csv" onChange={handleFileChange} />
                    </Button>
                    <Typography>{file ? file.name : 'No file selected'}</Typography>
                </Box>

                <FormControlLabel
                    control={<Checkbox checked={sendEmails} onChange={(e) => setSendEmails(e.target.checked)} />}
                    label="Send welcome emails to new users"
                />

                <Box sx={{ mt: 2 }}>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleUpload}
                        disabled={!file || loading}
                    >
                        {loading ? 'Importing...' : 'Import Users'}
                    </Button>
                </Box>

                {loading && <LinearProgress sx={{ mt: 2 }} />}
                {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
            </Paper>

            {result && (
                <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>Import Results</Typography>
                    <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                        <Alert severity="success">Created: {result.created}</Alert>
                        <Alert severity="error">Failed: {result.failed}</Alert>
                    </Box>

                    {result.users.length > 0 && (
                        <>
                            <Alert severity="warning" sx={{ mb: 2 }}>
                                <strong>IMPORTANT:</strong> Copy these passwords now. They will NOT be shown again.
                            </Alert>
                            <TableContainer sx={{ maxHeight: 400 }}>
                                <Table stickyHeader>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Email</TableCell>
                                            <TableCell>Name</TableCell>
                                            <TableCell>Role</TableCell>
                                            <TableCell>Password (One-time)</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {result.users.map((user, index) => (
                                            <TableRow key={index}>
                                                <TableCell>{user.email}</TableCell>
                                                <TableCell>{user.full_name}</TableCell>
                                                <TableCell>{user.role}</TableCell>
                                                <TableCell sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                                                    {user.password}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </>
                    )}

                    {result.errors.length > 0 && (
                        <Box sx={{ mt: 3 }}>
                            <Typography variant="h6" color="error" gutterBottom>Errors</Typography>
                            <TableContainer sx={{ maxHeight: 300 }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Row</TableCell>
                                            <TableCell>Error</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {result.errors.map((err, index) => (
                                            <TableRow key={index}>
                                                <TableCell>{err.row}</TableCell>
                                                <TableCell>{err.error}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Box>
                    )}
                </Paper>
            )}
        </Box>
    );
}
