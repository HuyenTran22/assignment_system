import { useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    TextField,
    Button,
    Typography,
    Link,
    Alert,
    InputAdornment,
    IconButton,
    CircularProgress,
} from '@mui/material';
import { Visibility, VisibilityOff, Email, Lock } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/shared/store/authStore';

export default function LoginPage() {
    const navigate = useNavigate();
    const { login, isLoading, error, clearError } = useAuthStore();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [formError, setFormError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError('');
        clearError();

        // Validation
        if (!email || !password) {
            setFormError('Please fill in all fields');
            return;
        }

        try {
            await login(email, password);
            const user = useAuthStore.getState().user;
            if (user?.role === 'ADMIN') {
                navigate('/admin');
            } else {
                navigate('/dashboard');
            }
        } catch (err: any) {
            // Error is handled by store, but log for debugging
            console.error('Login error:', err);
        }
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                padding: 2,
            }}
        >
            <Card
                sx={{
                    maxWidth: 450,
                    width: '100%',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                }}
            >
                <CardContent sx={{ p: 4 }}>
                    {/* Header */}
                    <Box sx={{ textAlign: 'center', mb: 4 }}>
                        <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
                            Welcome Back
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Sign in to your account to continue
                        </Typography>
                    </Box>

                    {/* Error Alert */}
                    {(error || formError) && (
                        <Alert severity="error" sx={{ mb: 3 }}>
                            {error || formError}
                        </Alert>
                    )}

                    {/* Login Form */}
                    <form onSubmit={handleSubmit}>
                        <TextField
                            fullWidth
                            label="Email Address"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            margin="normal"
                            required
                            autoFocus
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Email color="action" />
                                    </InputAdornment>
                                ),
                            }}
                        />

                        <TextField
                            fullWidth
                            label="Password"
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            margin="normal"
                            required
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Lock color="action" />
                                    </InputAdornment>
                                ),
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            onClick={() => setShowPassword(!showPassword)}
                                            edge="end"
                                        >
                                            {showPassword ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />

                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            size="large"
                            disabled={isLoading}
                            sx={{
                                mt: 3,
                                mb: 2,
                                py: 1.5,
                                fontSize: '1rem',
                                fontWeight: 600,
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                '&:hover': {
                                    background: 'linear-gradient(135deg, #5568d3 0%, #6a4190 100%)',
                                },
                            }}
                        >
                            {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
                        </Button>

                        {/* Forgot Password Link */}
                        <Box sx={{ textAlign: 'center', mt: 2 }}>
                            <Link
                                href="/forgot-password"
                                underline="hover"
                                sx={{ fontWeight: 600, cursor: 'pointer', color: 'text.secondary' }}
                                onClick={(e) => {
                                    e.preventDefault();
                                    navigate('/forgot-password');
                                }}
                            >
                                Forgot Password?
                            </Link>
                        </Box>
                    </form>
                </CardContent>
            </Card>
        </Box>
    );
}
