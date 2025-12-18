import { useState, useEffect } from 'react';
import {
    Box, Typography, Avatar, Button, TextField, Grid,
    Card, CardContent, Divider, IconButton, CircularProgress, Chip
} from '@mui/material';

import { Edit, Save, Cancel, PhotoCamera, Lock } from '@mui/icons-material';
import AppLayout from '@/shared/components/Layout/AppLayout';
import { useAuthStore } from '@/shared/store/authStore';
import apiClient from '@/shared/api/client';
import { useSnackbar } from 'notistack';
import { useNavigate } from 'react-router-dom';

interface UserProfile {
    id: string;
    user_id: string;
    avatar_url?: string;
    bio?: string;
    phone?: string;
    address?: string;
    social_links?: Record<string, string>;
    preferences?: Record<string, any>;
    created_at: string;
    updated_at: string;
}

export default function ProfilePage() {
    const { user } = useAuthStore();
    const { enqueueSnackbar } = useSnackbar();
    const navigate = useNavigate();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [formData, setFormData] = useState({
        bio: '',
        phone: '',
        address: '',
        social_links: {} as Record<string, string>
    });
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const response = await apiClient.get('/api/users/me/profile');
            const data = response.data;
            setProfile(data);
            setFormData({
                bio: data.bio || '',
                phone: data.phone || '',
                address: data.address || '',
                social_links: data.social_links || {}
            });
            if (data.avatar_url) {
                setAvatarPreview(data.avatar_url);
            }
        } catch (error: any) {
            console.error('Failed to fetch profile:', error);
            enqueueSnackbar('Failed to load profile', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = () => {
        setEditing(true);
    };

    const handleCancel = () => {
        if (profile) {
            setFormData({
                bio: profile.bio || '',
                phone: profile.phone || '',
                address: profile.address || '',
                social_links: profile.social_links || {}
            });
        }
        setEditing(false);
        setAvatarFile(null);
        setAvatarPreview(profile?.avatar_url || null);
    };

    const handleSave = async () => {
        try {
            const response = await apiClient.put('/api/users/me/profile', formData);
            setProfile(response.data);
            setEditing(false);
            enqueueSnackbar('Profile updated successfully', { variant: 'success' });

            // Upload avatar if selected
            if (avatarFile) {
                await uploadAvatar();
            }
        } catch (error: any) {
            console.error('Failed to update profile:', error);
            enqueueSnackbar(error.message || 'Failed to update profile', { variant: 'error' });
        }
    };

    const uploadAvatar = async () => {
        if (!avatarFile) return;

        try {
            const formData = new FormData();
            formData.append('file', avatarFile);

            const response = await apiClient.post('/api/users/me/profile/avatar', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            setProfile(response.data);
            setAvatarFile(null);
            enqueueSnackbar('Avatar updated successfully', { variant: 'success' });
        } catch (error: any) {
            console.error('Failed to upload avatar:', error);
            enqueueSnackbar('Failed to upload avatar', { variant: 'error' });
        }
    };

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setAvatarFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatarPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleChangePassword = () => {
        navigate('/change-password');
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

    return (
        <AppLayout>
            <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h4" fontWeight="bold">
                        My Profile
                    </Typography>
                    {!editing && (
                        <Button
                            variant="contained"
                            startIcon={<Edit />}
                            onClick={handleEdit}
                        >
                            Edit Profile
                        </Button>
                    )}
                </Box>

                <Grid container spacing={3}>
                    {/* Profile Card */}
                    <Grid item xs={12} md={4}>
                        <Card>
                            <CardContent sx={{ textAlign: 'center', pt: 4 }}>
                                <Box sx={{ position: 'relative', display: 'inline-block', mb: 2 }}>
                                    <Avatar
                                        src={avatarPreview || undefined}
                                        sx={{ width: 120, height: 120, mx: 'auto', mb: 2 }}
                                    >
                                        {user?.full_name?.charAt(0).toUpperCase()}
                                    </Avatar>
                                    {editing && (
                                        <IconButton
                                            component="label"
                                            sx={{
                                                position: 'absolute',
                                                bottom: 0,
                                                right: 0,
                                                bgcolor: 'primary.main',
                                                color: 'white',
                                                '&:hover': { bgcolor: 'primary.dark' }
                                            }}
                                        >
                                            <PhotoCamera />
                                            <input
                                                type="file"
                                                hidden
                                                accept="image/*"
                                                onChange={handleAvatarChange}
                                            />
                                        </IconButton>
                                    )}
                                </Box>
                                <Typography variant="h5" fontWeight="bold">
                                    {user?.full_name}
                                </Typography>
                                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                                    {user?.email}
                                </Typography>
                                <Chip
                                    label={user?.role}
                                    color={user?.role === 'ADMIN' ? 'error' : user?.role === 'TEACHER' ? 'primary' : 'default'}
                                    sx={{ mb: 2 }}
                                />
                            </CardContent>
                        </Card>

                        {/* Change Password Card */}
                        <Card sx={{ mt: 2 }}>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    Security
                                </Typography>
                                <Button
                                    fullWidth
                                    variant="outlined"
                                    startIcon={<Lock />}
                                    onClick={handleChangePassword}
                                >
                                    Change Password
                                </Button>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Profile Details */}
                    <Grid item xs={12} md={8}>
                        <Card>
                            <CardContent>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                                    <Typography variant="h6">
                                        Profile Information
                                    </Typography>
                                    {editing && (
                                        <Box sx={{ display: 'flex', gap: 1 }}>
                                            <Button
                                                variant="contained"
                                                startIcon={<Save />}
                                                onClick={handleSave}
                                            >
                                                Save
                                            </Button>
                                            <Button
                                                variant="outlined"
                                                startIcon={<Cancel />}
                                                onClick={handleCancel}
                                            >
                                                Cancel
                                            </Button>
                                        </Box>
                                    )}
                                </Box>

                                <Divider sx={{ mb: 3 }} />

                                <Grid container spacing={3}>
                                    <Grid item xs={12}>
                                        <TextField
                                            fullWidth
                                            label="Bio"
                                            multiline
                                            rows={4}
                                            value={formData.bio}
                                            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                            disabled={!editing}
                                            placeholder="Tell us about yourself..."
                                        />
                                    </Grid>

                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            fullWidth
                                            label="Phone"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            disabled={!editing}
                                        />
                                    </Grid>

                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            fullWidth
                                            label="Address"
                                            value={formData.address}
                                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                            disabled={!editing}
                                        />
                                    </Grid>

                                    <Grid item xs={12}>
                                        <Typography variant="subtitle2" gutterBottom>
                                            Social Links
                                        </Typography>
                                        <TextField
                                            fullWidth
                                            label="LinkedIn"
                                            value={formData.social_links?.linkedin || ''}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                social_links: { ...formData.social_links, linkedin: e.target.value }
                                            })}
                                            disabled={!editing}
                                            sx={{ mb: 2 }}
                                        />
                                        <TextField
                                            fullWidth
                                            label="GitHub"
                                            value={formData.social_links?.github || ''}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                social_links: { ...formData.social_links, github: e.target.value }
                                            })}
                                            disabled={!editing}
                                        />
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            </Box>
        </AppLayout>
    );
}

