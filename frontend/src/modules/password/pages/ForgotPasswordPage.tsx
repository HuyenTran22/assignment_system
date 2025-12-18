import React, { useState } from 'react';
import { Box, Paper, Typography, TextField, Button, Alert, Link } from '@mui/material';
import { passwordApi } from '../api/passwordApi';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            await passwordApi.forgotPassword(email);
            setSubmitted(true);
        } catch (err) {
            setError('Failed to process request. Please try again.');
        }
    };

    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: '#f5f5f5' }}>
            <Paper sx={{ p: 4, maxWidth: 400, width: '100%' }}>
                <Typography variant="h5" gutterBottom align="center">Forgot Password</Typography>

                {submitted ? (
                    <Box sx={{ textAlign: 'center' }}>
                        <Alert severity="success" sx={{ mb: 2 }}>
                            If an account exists with that email, we have sent a password reset link.
                        </Alert>
                        <Link href="/login" variant="body2">Back to Login</Link>
                    </Box>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                            Enter your email address and we'll send you a link to reset your password.
                        </Typography>

                        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                        <TextField
                            fullWidth
                            label="Email Address"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            sx={{ mb: 3 }}
                        />

                        <Button type="submit" variant="contained" fullWidth size="large" sx={{ mb: 2 }}>
                            Send Reset Link
                        </Button>

                        <Box sx={{ textAlign: 'center' }}>
                            <Link href="/login" variant="body2">Back to Login</Link>
                        </Box>
                    </form>
                )}
            </Paper>
        </Box>
    );
}
