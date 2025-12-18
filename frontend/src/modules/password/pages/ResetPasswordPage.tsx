import React, { useState } from 'react';
import { Box, Paper, Typography, TextField, Button, Alert, Link } from '@mui/material';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { passwordApi } from '../api/passwordApi';

export default function ResetPasswordPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    if (!token) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: '#f5f5f5' }}>
                <Paper sx={{ p: 4 }}>
                    <Alert severity="error">Invalid or missing reset token.</Alert>
                    <Box sx={{ mt: 2, textAlign: 'center' }}>
                        <Link href="/login">Back to Login</Link>
                    </Box>
                </Paper>
            </Box>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        try {
            await passwordApi.resetPassword({ token, new_password: password });
            setSuccess(true);
            setTimeout(() => navigate('/login'), 3000);
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to reset password');
        }
    };

    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: '#f5f5f5' }}>
            <Paper sx={{ p: 4, maxWidth: 400, width: '100%' }}>
                <Typography variant="h5" gutterBottom align="center">Reset Password</Typography>

                {success ? (
                    <Box>
                        <Alert severity="success" sx={{ mb: 2 }}>
                            Password reset successfully! Redirecting to login...
                        </Alert>
                    </Box>
                ) : (
                    <form onSubmit={handleSubmit}>
                        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                        <TextField
                            fullWidth
                            label="New Password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            sx={{ mb: 2 }}
                            helperText="Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char"
                        />

                        <TextField
                            fullWidth
                            label="Confirm Password"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            sx={{ mb: 3 }}
                        />

                        <Button type="submit" variant="contained" fullWidth size="large">
                            Reset Password
                        </Button>
                    </form>
                )}
            </Paper>
        </Box>
    );
}
