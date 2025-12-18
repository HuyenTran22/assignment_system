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
    FormControl,
    InputLabel,
    Select,
    MenuItem,
} from '@mui/material';
import { Visibility, VisibilityOff, Email, Lock, Person } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/shared/store/authStore';

export default function RegisterPage() {
    const navigate = useNavigate();
    const { register, isLoading, error, clearError } = useAuthStore();

    const [email, setEmail] = useState('');
    const [fullName, setFullName] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [role, setRole] = useState<'STUDENT' | 'TEACHER'>('STUDENT');
    const [showPassword, setShowPassword] = useState(false);
    const [formError, setFormError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError('');
        clearError();

        // Validation
        if (!email || !fullName || !password || !confirmPassword) {
            setFormError('Please fill in all fields');
            return;
        }

        if (password !== confirmPassword) {
            setFormError('Passwords do not match');
            return;
        }

        if (password.length < 8) {
            setFormError('Password must be at least 8 characters');
            return;
        }

        try {
            await register(email, fullName, password, role);
            navigate('/dashboard');
        } catch (err) {
            // Error is handled by store
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
                    maxWidth: 500,
                    width: '100%',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                }}
            >
                <CardContent sx={{ p: 4 }}>
                    {/* Header */}
                    <Box sx={{ textAlign: 'center', mb: 4 }}>
                        <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
                            Create Account
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Join us to manage your assignments
                        </Typography>
                    </Box>

                    {/* Error Alert */}
                    {(error || formError) && (
                        <Alert severity="error" sx={{ mb: 3 }}>
                            {error || formError}
                        </Alert>
                    )}

                    {/* Register Form */}
                    <form onSubmit={handleSubmit}>
                        <TextField
                            fullWidth
                            label="Full Name"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            margin="normal"
                            required
                            autoFocus
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Person color="action" />
                                    </InputAdornment>
                                ),
                            }}
                        />

                        <TextField
                            fullWidth
                            label="Email Address"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            margin="normal"
                            required
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Email color="action" />
                                    </InputAdornment>
                                ),
                            }}
                        />

                        <FormControl fullWidth margin="normal">
                            <InputLabel>Role</InputLabel>
                            <Select
                                value={role}
                                label="Role"
                                onChange={(e) => setRole(e.target.value as 'STUDENT' | 'TEACHER')}
                            >
                                <MenuItem value="STUDENT">Student</MenuItem>
                                <MenuItem value="TEACHER">Teacher</MenuItem>
                            </Select>
                        </FormControl>

                        <TextField
                            fullWidth
                            label="Password"
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            margin="normal"
                            required
                            helperText="At least 8 characters"
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

                        <TextField
                            fullWidth
                            label="Confirm Password"
                            type={showPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            margin="normal"
                            required
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Lock color="action" />
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
                            {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Create Account'}
                        </Button>

                        {/* Login Link */}
                        <Box sx={{ textAlign: 'center', mt: 2 }}>
                            <Typography variant="body2" color="text.secondary">
                                Already have an account?{' '}
                                <Link
                                    href="/login"
                                    underline="hover"
                                    sx={{ fontWeight: 600, cursor: 'pointer' }}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        navigate('/login');
                                    }}
                                >
                                    Sign In
                                </Link>
                            </Typography>
                        </Box>
                    </form>
                </CardContent>
            </Card>
        </Box>
    );
}
