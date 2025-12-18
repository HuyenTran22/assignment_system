import { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Typography, Alert } from '@mui/material';
import { useAuthStore } from '@/shared/store/authStore';
import { passwordApi } from '../api/passwordApi';

export default function ForcePasswordChange() {
    const { user, logout } = useAuthStore();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');

    if (!user?.must_change_password) return null;

    const handleSubmit = async () => {
        setError('');
        if (newPassword !== confirmPassword) {
            setError('New passwords do not match');
            return;
        }

        try {
            await passwordApi.changePassword({
                current_password: currentPassword,
                new_password: newPassword
            });
            // Reload page to refresh user state (or update store)
            window.location.reload();
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to change password');
        }
    };

    return (
        <Dialog open={true} maxWidth="sm" fullWidth disableEscapeKeyDown>
            <DialogTitle>Change Password Required</DialogTitle>
            <DialogContent>
                <Typography paragraph color="textSecondary">
                    For security reasons, you must change your password before proceeding.
                </Typography>

                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                <TextField
                    fullWidth
                    label="Current Password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    sx={{ mb: 2, mt: 1 }}
                />
                <TextField
                    fullWidth
                    label="New Password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    helperText="Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char"
                    sx={{ mb: 2 }}
                />
                <TextField
                    fullWidth
                    label="Confirm New Password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    sx={{ mb: 2 }}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={logout} color="secondary">Logout</Button>
                <Button onClick={handleSubmit} variant="contained">Change Password</Button>
            </DialogActions>
        </Dialog>
    );
}
