import { useState, useEffect, useRef } from 'react';
import {
    Box, Typography, Button, Paper, Card, CardContent,
    CircularProgress, Alert, Chip, Dialog, DialogTitle,
    DialogContent, DialogActions, IconButton, List, ListItem,
    ListItemText, ListItemAvatar, Avatar
} from '@mui/material';
import {
    VideoCall, ExitToApp, Lock, LockOpen, People, Close,
    Person, CheckCircle
} from '@mui/icons-material';
import AppLayout from '@/shared/components/Layout/AppLayout';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/shared/store/authStore';
import apiClient from '@/shared/api/client';
import { useSnackbar } from 'notistack';

declare global {
    interface Window {
        JitsiMeetExternalAPI: any;
    }
}

export default function VideoCallPage() {
    const { courseId } = useParams<{ courseId: string }>();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const { enqueueSnackbar } = useSnackbar();

    const [room, setRoom] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [joining, setJoining] = useState(false);
    const [participants, setParticipants] = useState<any[]>([]);
    const [showParticipants, setShowParticipants] = useState(false);
    const [jitsiApi, setJitsiApi] = useState<any>(null);
    const [hasAutoJoined, setHasAutoJoined] = useState(false); // Track if we've auto-joined
    const jitsiContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (courseId) {
            fetchRoom();
        }

        // Set active session flag for auto-logout exception
        localStorage.setItem('active_live_session', 'true');

        return () => {
            // Cleanup Jitsi on unmount
            if (jitsiApi) {
                jitsiApi.dispose();
            }
            // Clear active session flag
            localStorage.removeItem('active_live_session');
        };
    }, [courseId]);

    // Auto-join when room is loaded (only once)
    useEffect(() => {
        if (room && !jitsiApi && !joining && !hasAutoJoined) {
            // Auto-join video call when page loads
            setHasAutoJoined(true); // Mark as joined to prevent loop
            handleJoin();
        }
    }, [room, jitsiApi, joining, hasAutoJoined]);

    const fetchRoom = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get(`/api/courses/${courseId}/video-call`);
            setRoom(response.data);
            setParticipants(response.data.active_participants || []);
        } catch (error: any) {
            console.error('Failed to fetch video call room:', error);
            enqueueSnackbar(error.message || 'Failed to load video call room', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleJoin = async () => {
        try {
            setJoining(true);
            const response = await apiClient.post(`/api/courses/${courseId}/video-call/join`);
            const { jitsi_url } = response.data;

            // Simple approach: Use iframe embed to avoid External API security issues on HTTP
            if (jitsiContainerRef.current && !jitsiApi) {
                loadJitsiIframe(jitsi_url);
            }

            enqueueSnackbar('Joined video call successfully', { variant: 'success' });
        } catch (error: any) {
            console.error('Failed to join video call:', error);
            const errorMsg = error.response?.data?.detail || error.message || 'Failed to join video call';
            enqueueSnackbar(errorMsg, { variant: 'error' });
        } finally {
            setJoining(false);
        }
    };

    const loadJitsiIframe = (jitsiUrl: string) => {
        if (!jitsiContainerRef.current) return;

        // Extract room name from URL
        const urlParts = jitsiUrl.split('/');
        const roomName = urlParts[urlParts.length - 1].split('?')[0];
        
        // Build Jitsi URL with configs as URL params to bypass External API security issues
        const displayName = encodeURIComponent(user?.full_name || user?.email || 'User');
        
        // Jitsi iframe URL with configs
        const iframeUrl = `https://meet.jit.si/${roomName}#` +
            `config.startWithAudioMuted=true&` +
            `config.startWithVideoMuted=true&` +
            `config.prejoinPageEnabled=false&` +
            `config.disableDeepLinking=true&` +
            `userInfo.displayName=${displayName}`;

        // Create iframe with explicit permissions for Cốc Cốc browser
        const iframe = document.createElement('iframe');
        iframe.src = iframeUrl;
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        
        // Explicit allow with wildcard for better Cốc Cốc compatibility
        iframe.setAttribute('allow', 'camera *; microphone *; fullscreen *; display-capture *; autoplay *; encrypted-media *');
        iframe.setAttribute('allowfullscreen', 'true');
        
        // Additional attributes for Vietnamese browsers (Cốc Cốc)
        iframe.setAttribute('allowusermedia', 'true');
        iframe.setAttribute('sandbox', 'allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-presentation');

        // Clear container and add iframe
        jitsiContainerRef.current.innerHTML = '';
        jitsiContainerRef.current.appendChild(iframe);
        
        // Store iframe reference
        setJitsiApi({ iframe, dispose: () => iframe.remove() } as any);
        
        console.log('✅ Jitsi iframe loaded successfully');
    };

    const initializeJitsi = (jitsiUrl: string) => {
        if (!jitsiContainerRef.current) return;

        // Extract room name from URL - use meet.jit.si domain
        const urlParts = jitsiUrl.split('/');
        const roomName = urlParts[urlParts.length - 1].split('?')[0];

        // Always use meet.jit.si for public free Jitsi
        const domain = 'meet.jit.si';

        const options = {
            roomName: roomName,
            parentNode: jitsiContainerRef.current,
            width: '100%',
            height: '100%',
            configOverwrite: {
                // Start with both audio AND video muted - user can enable later
                startWithAudioMuted: true,
                startWithVideoMuted: true,

                // CRITICAL: Disable prejoin AND lobby for direct entry
                prejoinPageEnabled: false,
                
                // Disable lobby - join directly without waiting for moderator
                lobbyEnabled: false,
                
                // Everyone is moderator - no need to wait
                disableModeratorIndicator: true,

                // Disable deep linking (mobile app prompt)
                disableDeepLinking: true,

                // Security settings
                enableInsecureRoomNameWarning: false,
                requireDisplayName: false,

                // Meeting settings - allow joining without media
                startAudioOnly: false,
                enableWelcomePage: false,
                enableClosePage: false,
                
                // Constraints - reduce resolution requirements
                constraints: {
                    video: {
                        height: {
                            ideal: 720,
                            max: 720,
                            min: 180
                        },
                        width: {
                            ideal: 1280,
                            max: 1280,
                            min: 320
                        }
                    }
                },

                // Performance
                channelLastN: -1,
                disableSimulcast: false,
            },
            interfaceConfigOverwrite: {
                // Essential toolbar buttons
                TOOLBAR_BUTTONS: [
                    'microphone',
                    'camera',
                    'desktop',
                    'fullscreen',
                    'hangup',
                    'chat',
                    'raisehand',
                    'tileview',
                    'settings',
                ],

                // Hide some branding (may not work on public server)
                SHOW_JITSI_WATERMARK: false,
                SHOW_WATERMARK_FOR_GUESTS: false,

                // Mobile app prompts
                MOBILE_APP_PROMO: false,

                // Film strip settings
                FILM_STRIP_MAX_HEIGHT: 120,
            },
            userInfo: {
                displayName: user?.full_name || user?.email || 'User',
                email: user?.email || '',
            },
            // Important: Set room password to empty if you want anyone to join
            onload: () => {
                console.log('Jitsi iframe loaded');
            }
        };

        try {
            const api = new window.JitsiMeetExternalAPI(domain, options);
            setJitsiApi(api);

            // Event listeners (only essential ones to avoid too many API calls)
            api.addEventListener('videoConferenceJoined', () => {
                console.log('✅ Successfully joined video conference');
            });

            api.addEventListener('videoConferenceLeft', () => {
                console.log('Left video conference');
                handleLeave();
            });

            api.addEventListener('readyToClose', () => {
                console.log('Ready to close');
                handleLeave();
            });

            // Participant events (without fetchRoom to avoid loops)
            api.addEventListener('participantJoined', (event: any) => {
                console.log('Participant joined:', event);
                const participantName = event.displayName || 'Someone';
                enqueueSnackbar(`${participantName} joined the call`, {
                    variant: 'success',
                    autoHideDuration: 2000
                });
            });

            api.addEventListener('participantLeft', (event: any) => {
                console.log('Participant left:', event);
                const participantName = event.displayName || 'Someone';
                enqueueSnackbar(`${participantName} left the call`, {
                    variant: 'info',
                    autoHideDuration: 2000
                });
            });

            // Error handling
            api.addEventListener('error', (error: any) => {
                console.error('Jitsi error:', error);
                enqueueSnackbar('An error occurred in the video call', { variant: 'error' });
            });

        } catch (error) {
            console.error('Error initializing Jitsi:', error);
            enqueueSnackbar('Failed to initialize video call', { variant: 'error' });
        }
    };

    const handleLeave = async () => {
        try {
            // Dispose Jitsi API
            if (jitsiApi) {
                jitsiApi.dispose();
                setJitsiApi(null);
            }

            // Clear container
            if (jitsiContainerRef.current) {
                jitsiContainerRef.current.innerHTML = '';
            }

            // Clear active session flag for auto-logout
            localStorage.removeItem('active_live_session');

            // Call leave API
            await apiClient.post(`/api/courses/${courseId}/video-call/leave`);
            enqueueSnackbar('Left video call', { variant: 'info' });
            fetchRoom();
        } catch (error: any) {
            console.error('Failed to leave video call:', error);
        }
    };

    const handleToggleLock = async () => {
        try {
            await apiClient.put(`/api/courses/${courseId}/video-call`, {
                is_locked: !room.is_locked
            });
            enqueueSnackbar(`Room ${room.is_locked ? 'unlocked' : 'locked'}`, { variant: 'success' });
            fetchRoom();
        } catch (error: any) {
            console.error('Failed to toggle lock:', error);
            enqueueSnackbar(error.message || 'Failed to update room settings', { variant: 'error' });
        }
    };

    const isTeacher = user?.role === 'TEACHER' || user?.role === 'MANAGER' || user?.role === 'ADMIN';

    if (loading) {
        return (
            <AppLayout>
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                    <CircularProgress />
                </Box>
            </AppLayout>
        );
    }

    if (!room) {
        return (
            <AppLayout>
                <Box sx={{ p: 3 }}>
                    <Alert severity="error">Video call room not found</Alert>
                    <Button onClick={() => navigate(`/courses/${courseId}`)} sx={{ mt: 2 }}>
                        Back to Course
                    </Button>
                </Box>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <Box sx={{ p: 3 }}>
                {/* Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <VideoCall sx={{ fontSize: 40, color: 'primary.main' }} />
                        <Box>
                            <Typography variant="h4" fontWeight="bold">
                                Video Call
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                <Chip
                                    label={room.status}
                                    color={room.status === 'active' ? 'success' : 'default'}
                                    size="small"
                                />
                                {room.is_locked && (
                                    <Chip
                                        icon={<Lock />}
                                        label="Locked"
                                        color="warning"
                                        size="small"
                                    />
                                )}
                                <Chip
                                    icon={<People />}
                                    label={`${room.participant_count} participants`}
                                    size="small"
                                />
                            </Box>
                        </Box>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        {isTeacher && (
                            <Button
                                variant="outlined"
                                startIcon={room.is_locked ? <LockOpen /> : <Lock />}
                                onClick={handleToggleLock}
                            >
                                {room.is_locked ? 'Unlock' : 'Lock'}
                            </Button>
                        )}
                        <Button
                            variant="outlined"
                            startIcon={<People />}
                            onClick={() => setShowParticipants(true)}
                        >
                            Participants ({room.participant_count})
                        </Button>
                        {jitsiApi && (
                            <Button
                                variant="contained"
                                color="error"
                                startIcon={<ExitToApp />}
                                onClick={handleLeave}
                            >
                                Leave Call
                            </Button>
                        )}
                    </Box>
                </Box>

                {/* Video Call Container */}
                <Paper
                    sx={{
                        height: 'calc(100vh - 250px)',
                        minHeight: '600px',
                        position: 'relative',
                        overflow: 'hidden',
                        bgcolor: '#1c1c1e' // Dark background like Google Meet
                    }}
                >
                    <Box
                        ref={jitsiContainerRef}
                        sx={{
                            width: '100%',
                            height: '100%',
                            borderRadius: 1,
                            '& iframe': {
                                border: 'none',
                                borderRadius: 1
                            }
                        }}
                    />

                    {/* Overlay khi chưa join */}
                    {!jitsiApi && (
                        <Box
                            sx={{
                                position: 'absolute',
                                inset: 0,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                bgcolor: 'rgba(0,0,0,0.7)',
                                textAlign: 'center',
                                px: 3,
                            }}
                        >
                            <VideoCall sx={{ fontSize: 80, mb: 2 }} />
                            <Typography variant="h5" gutterBottom>
                                Ready to join video call?
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 3, maxWidth: 480 }}>
                                Click the button below to join the live video room for this course.
                                You will be able to use video/audio, screen sharing, chat, raise hand and more.
                            </Typography>
                            <Button
                                variant="contained"
                                size="large"
                                startIcon={<VideoCall />}
                                onClick={handleJoin}
                                disabled={joining}
                            >
                                {joining ? 'Joining...' : 'Join Video Call'}
                            </Button>
                            {room.is_locked && !isTeacher && (
                                <Alert severity="warning" sx={{ mt: 2, maxWidth: 500, mx: 'auto' }}>
                                    This room is locked. Only teachers can join.
                                </Alert>
                            )}
                        </Box>
                    )}

                    {/* Info overlay khi đã join */}
                    {jitsiApi && (
                        <Box
                            sx={{
                                position: 'absolute',
                                top: 16,
                                left: 16,
                                bgcolor: 'rgba(0, 0, 0, 0.6)',
                                color: 'white',
                                px: 2,
                                py: 1,
                                borderRadius: 1,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                zIndex: 1000
                            }}
                        >
                            <VideoCall sx={{ fontSize: 20 }} />
                            <Typography variant="body2" fontWeight="bold">
                                {room.room_name}
                            </Typography>
                            <Chip
                                label={`${room.participant_count} online`}
                                size="small"
                                sx={{
                                    bgcolor: 'rgba(255, 255, 255, 0.2)',
                                    color: 'white',
                                    height: 20
                                }}
                            />
                        </Box>
                    )}
                </Paper>

                {/* Participants Dialog */}
                <Dialog open={showParticipants} onClose={() => setShowParticipants(false)} maxWidth="sm" fullWidth>
                    <DialogTitle>
                        Participants ({participants.length})
                    </DialogTitle>
                    <DialogContent>
                        <List>
                            {participants.length === 0 ? (
                                <ListItem>
                                    <ListItemText primary="No active participants" />
                                </ListItem>
                            ) : (
                                participants.map((participant) => (
                                    <ListItem key={participant.id}>
                                        <ListItemAvatar>
                                            <Avatar>
                                                <Person />
                                            </Avatar>
                                        </ListItemAvatar>
                                        <ListItemText
                                            primary={participant.user_name}
                                            secondary={participant.user_email}
                                        />
                                        {participant.is_active && (
                                            <CheckCircle color="success" />
                                        )}
                                    </ListItem>
                                ))
                            )}
                        </List>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setShowParticipants(false)}>Close</Button>
                    </DialogActions>
                </Dialog>
            </Box>
        </AppLayout>
    );
}

