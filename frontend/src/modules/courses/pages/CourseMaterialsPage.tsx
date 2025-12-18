import { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, Button, Grid, Card, CardContent,
    List, ListItem, ListItemText, ListItemButton, Divider,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField,
    Select, MenuItem, FormControl, InputLabel, IconButton,
    CircularProgress, Alert, Chip, LinearProgress, Tabs, Tab
} from '@mui/material';
import {
    Add, VideoLibrary, Description, MenuBook, Upload,
    Edit, Delete, PlayArrow, Download, CheckCircle
} from '@mui/icons-material';
import AppLayout from '@/shared/components/Layout/AppLayout';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '@/shared/api/client';
import { useSnackbar } from 'notistack';
import { useAuthStore } from '@/shared/store/authStore';

interface CourseModule {
    id: string;
    title: string;
    description?: string;
    order_index: number;
}

interface CourseMaterial {
    id: string;
    title: string;
    type: 'lesson' | 'video' | 'document';
    description?: string;
    content?: string;
    file_path?: string;
    video_url?: string;
    order_index: number;
    module_id?: string;
}

interface UserProgress {
    material_id: string;
    progress_percentage: number;
    completed_at?: string;
}

export default function CourseMaterialsPage() {
    const { courseId } = useParams<{ courseId: string }>();
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();
    const { user } = useAuthStore();
    const isTeacher = user?.role === 'TEACHER' || user?.role === 'MANAGER' || user?.role === 'ADMIN';

    const [modules, setModules] = useState<CourseModule[]>([]);
    const [materials, setMaterials] = useState<CourseMaterial[]>([]);
    const [progress, setProgress] = useState<Record<string, UserProgress>>({});
    const [selectedModule, setSelectedModule] = useState<string | null>(null);
    const [selectedMaterial, setSelectedMaterial] = useState<CourseMaterial | null>(null);
    const [loading, setLoading] = useState(true);
    const [tabValue, setTabValue] = useState(0);

    // Dialog states
    const [moduleDialogOpen, setModuleDialogOpen] = useState(false);
    const [materialDialogOpen, setMaterialDialogOpen] = useState(false);
    const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
    const [editingModule, setEditingModule] = useState<CourseModule | null>(null);
    const [editingMaterial, setEditingMaterial] = useState<CourseMaterial | null>(null);
    const [moduleForm, setModuleForm] = useState({ title: '', description: '' });
    const [materialForm, setMaterialForm] = useState({
        title: '', type: 'lesson' as 'lesson' | 'video' | 'document',
        description: '', content: '', video_url: '', module_id: ''
    });
    const [uploadFile, setUploadFile] = useState<File | null>(null);

    useEffect(() => {
        if (courseId) {
            fetchModules();
            fetchMaterials();
            fetchProgress();
        }
    }, [courseId]);

    const fetchModules = async () => {
        try {
            const response = await apiClient.get(`/api/courses/${courseId}/modules`);
            setModules(response.data);
        } catch (error: any) {
            console.error('Failed to fetch modules:', error);
            enqueueSnackbar('Failed to load modules', { variant: 'error' });
        }
    };

    const fetchMaterials = async () => {
        try {
            const response = await apiClient.get(`/api/courses/${courseId}/materials`);
            setMaterials(response.data);
        } catch (error: any) {
            console.error('Failed to fetch materials:', error);
            enqueueSnackbar('Failed to load materials', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const fetchProgress = async () => {
        try {
            const response = await apiClient.get(`/api/courses/${courseId}/progress`);
            const progressMap: Record<string, UserProgress> = {};
            response.data.forEach((p: UserProgress) => {
                progressMap[p.material_id] = p;
            });
            setProgress(progressMap);
        } catch (error) {
            console.error('Failed to fetch progress:', error);
        }
    };

    const handleCreateModule = async () => {
        try {
            await apiClient.post(`/api/courses/${courseId}/modules`, {
                ...moduleForm,
                course_id: courseId
            });
            enqueueSnackbar('Module created successfully', { variant: 'success' });
            setModuleDialogOpen(false);
            setEditingModule(null);
            setModuleForm({ title: '', description: '' });
            fetchModules();
        } catch (error: any) {
            enqueueSnackbar(error.response?.data?.detail || 'Failed to create module', { variant: 'error' });
        }
    };

    const handleUpdateModule = async () => {
        if (!editingModule) return;
        try {
            await apiClient.put(`/api/courses/modules/${editingModule.id}`, moduleForm);
            enqueueSnackbar('Module updated successfully', { variant: 'success' });
            setModuleDialogOpen(false);
            setEditingModule(null);
            setModuleForm({ title: '', description: '' });
            fetchModules();
        } catch (error: any) {
            enqueueSnackbar(error.response?.data?.detail || 'Failed to update module', { variant: 'error' });
        }
    };

    const handleDeleteModule = async (moduleId: string) => {
        if (!window.confirm('Are you sure you want to delete this module? All materials in this module will be moved to "All Materials".')) {
            return;
        }
        
        // Optimistic update
        const previousModules = [...modules];
        setModules(modules.filter(m => m.id !== moduleId));
        
        try {
            await apiClient.delete(`/api/courses/modules/${moduleId}`);
            enqueueSnackbar('Module deleted successfully', { variant: 'success' });
            fetchModules(); // Refresh to ensure consistency
            if (selectedModule === moduleId) {
                setSelectedModule(null);
            }
        } catch (error: any) {
            // Revert optimistic update
            setModules(previousModules);
            enqueueSnackbar(error.response?.data?.detail || 'Failed to delete module', { variant: 'error' });
        }
    };

    const handleOpenModuleDialog = (module?: CourseModule) => {
        if (module) {
            setEditingModule(module);
            setModuleForm({ title: module.title, description: module.description || '' });
        } else {
            setEditingModule(null);
            setModuleForm({ title: '', description: '' });
        }
        setModuleDialogOpen(true);
    };

    const handleCreateMaterial = async () => {
        // Validation
        if (!materialForm.title || materialForm.title.trim() === '') {
            enqueueSnackbar('Title is required', { variant: 'warning' });
            return;
        }

        if (materialForm.type === 'video' && (!materialForm.video_url || materialForm.video_url.trim() === '')) {
            enqueueSnackbar('Video URL is required for video type', { variant: 'warning' });
            return;
        }

        if (materialForm.type === 'lesson' && (!materialForm.content || materialForm.content.trim() === '')) {
            enqueueSnackbar('Content is required for lesson type', { variant: 'warning' });
            return;
        }

        try {
            const payload: any = {
                course_id: courseId, // Required by schema
                title: materialForm.title.trim(),
                type: materialForm.type,
                description: materialForm.description?.trim() || null,
                order_index: 0
            };

            // Only include module_id if it's not empty and is a valid UUID
            if (materialForm.module_id && materialForm.module_id !== '') {
                // Validate UUID format
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                if (uuidRegex.test(materialForm.module_id)) {
                    payload.module_id = materialForm.module_id;
                } else {
                    enqueueSnackbar('Invalid module ID format', { variant: 'warning' });
                    return;
                }
            }

            if (materialForm.type === 'lesson') {
                payload.content = materialForm.content.trim();
            } else if (materialForm.type === 'video') {
                payload.video_url = materialForm.video_url.trim();
            }

            console.log('[CreateMaterial] Sending payload:', payload);
            await apiClient.post(`/api/courses/${courseId}/materials`, payload);
            enqueueSnackbar('Material created successfully', { variant: 'success' });
            setMaterialDialogOpen(false);
            setEditingMaterial(null);
            setMaterialForm({
                title: '', type: 'lesson', description: '', content: '', video_url: '', module_id: ''
            });
            fetchMaterials();
        } catch (error: any) {
            console.error('Error creating material:', error);
            const errorMessage = error.response?.data?.detail || error.message || 'Failed to create material';
            enqueueSnackbar(errorMessage, { variant: 'error' });
        }
    };

    const handleUpdateMaterial = async () => {
        if (!editingMaterial) return;
        try {
            await apiClient.put(`/api/courses/materials/${editingMaterial.id}`, materialForm);
            enqueueSnackbar('Material updated successfully', { variant: 'success' });
            setMaterialDialogOpen(false);
            setEditingMaterial(null);
            setMaterialForm({
                title: '', type: 'lesson', description: '', content: '', video_url: '', module_id: ''
            });
            fetchMaterials();
        } catch (error: any) {
            enqueueSnackbar(error.response?.data?.detail || 'Failed to update material', { variant: 'error' });
        }
    };

    const handleDeleteMaterial = async (materialId: string) => {
        if (!window.confirm('Are you sure you want to delete this material?')) {
            return;
        }
        
        // Optimistic update
        const previousMaterials = [...materials];
        setMaterials(materials.filter(m => m.id !== materialId));
        
        try {
            await apiClient.delete(`/api/courses/materials/${materialId}`);
            enqueueSnackbar('Material deleted successfully', { variant: 'success' });
            fetchMaterials(); // Refresh to ensure consistency
            if (selectedMaterial?.id === materialId) {
                setSelectedMaterial(null);
                setTabValue(0);
            }
        } catch (error: any) {
            // Revert optimistic update
            setMaterials(previousMaterials);
            enqueueSnackbar(error.response?.data?.detail || 'Failed to delete material', { variant: 'error' });
        }
    };

    const handleOpenMaterialDialog = (material?: CourseMaterial) => {
        if (material) {
            setEditingMaterial(material);
            setMaterialForm({
                title: material.title,
                type: material.type,
                description: material.description || '',
                content: material.content || '',
                video_url: material.video_url || '',
                module_id: material.module_id || ''
            });
        } else {
            setEditingMaterial(null);
            setMaterialForm({
                title: '', type: 'lesson', description: '', content: '', video_url: '', module_id: ''
            });
        }
        setMaterialDialogOpen(true);
    };

    const handleUploadMaterial = async () => {
        if (!uploadFile) return;

        try {
            const formData = new FormData();
            formData.append('file', uploadFile);
            formData.append('title', materialForm.title);
            formData.append('type', 'document'); // Always document for upload
            formData.append('description', materialForm.description || '');
            if (materialForm.module_id) {
                formData.append('module_id', materialForm.module_id);
            }

            await apiClient.post(`/api/courses/${courseId}/materials/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            enqueueSnackbar('Material uploaded successfully', { variant: 'success' });
            setUploadDialogOpen(false);
            setUploadFile(null);
            setMaterialForm({
                title: '', type: 'document', description: '', content: '', video_url: '', module_id: ''
            });
            fetchMaterials();
        } catch (error: any) {
            enqueueSnackbar(error.response?.data?.detail || 'Failed to upload material', { variant: 'error' });
        }
    };

    const handleMarkComplete = async (materialId: string) => {
        try {
            await apiClient.post(`/api/courses/materials/${materialId}/complete`);
            fetchProgress();
            enqueueSnackbar('Material marked as complete', { variant: 'success' });
        } catch (error: any) {
            enqueueSnackbar('Failed to mark as complete', { variant: 'error' });
        }
    };

    const filteredMaterials = selectedModule
        ? materials.filter(m => m.module_id === selectedModule)
        : materials.filter(m => !m.module_id);

    const getMaterialIcon = (type: string) => {
        switch (type) {
            case 'video': return <VideoLibrary />;
            case 'document': return <Description />;
            default: return <MenuBook />;
        }
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
                        Course Materials
                    </Typography>
                    {isTeacher && (
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <Button
                                variant="contained"
                                startIcon={<Add />}
                                onClick={() => handleOpenModuleDialog()}
                            >
                                Add Module
                            </Button>
                            <Button
                                variant="outlined"
                                startIcon={<Add />}
                                onClick={() => handleOpenMaterialDialog()}
                            >
                                Add Material
                            </Button>
                        </Box>
                    )}
                </Box>

                <Grid container spacing={3}>
                    {/* Sidebar - Modules */}
                    <Grid item xs={12} md={3}>
                        <Paper sx={{ p: 2 }}>
                            <Typography variant="h6" gutterBottom>
                                Modules
                            </Typography>
                            <List>
                                <ListItemButton
                                    selected={selectedModule === null}
                                    onClick={() => setSelectedModule(null)}
                                >
                                    <ListItemText primary="All Materials" />
                                </ListItemButton>
                                <Divider />
                                {modules.map((module) => (
                                    <ListItem
                                        key={module.id}
                                        secondaryAction={
                                            isTeacher && (
                                                <Box>
                                                    <IconButton
                                                        edge="end"
                                                        size="small"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleOpenModuleDialog(module);
                                                        }}
                                                    >
                                                        <Edit fontSize="small" />
                                                    </IconButton>
                                                    <IconButton
                                                        edge="end"
                                                        size="small"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteModule(module.id);
                                                        }}
                                                    >
                                                        <Delete fontSize="small" />
                                                    </IconButton>
                                                </Box>
                                            )
                                        }
                                    >
                                        <ListItemButton
                                            selected={selectedModule === module.id}
                                            onClick={() => setSelectedModule(module.id)}
                                        >
                                            <ListItemText
                                                primary={module.title}
                                                secondary={module.description}
                                            />
                                        </ListItemButton>
                                    </ListItem>
                                ))}
                            </List>
                        </Paper>
                    </Grid>

                    {/* Main Content - Materials */}
                    <Grid item xs={12} md={9}>
                        <Paper sx={{ p: 3 }}>
                            <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ mb: 2 }}>
                                <Tab label="Materials" />
                                {selectedMaterial && <Tab label="Viewer" />}
                            </Tabs>

                            {tabValue === 0 && (
                                <Box>
                                    {filteredMaterials.length === 0 ? (
                                        <Alert severity="info">No materials in this section</Alert>
                                    ) : (
                                        <List>
                                            {filteredMaterials.map((material) => {
                                                const materialProgress = progress[material.id];
                                                const isComplete = materialProgress?.progress_percentage === 100;

                                                return (
                                                    <Card key={material.id} sx={{ mb: 2 }}>
                                                        <CardContent>
                                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                                                <Box sx={{ flex: 1 }}>
                                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                                                        {getMaterialIcon(material.type)}
                                                                        <Typography variant="h6">
                                                                            {material.title}
                                                                        </Typography>
                                                                        <Chip
                                                                            label={material.type}
                                                                            size="small"
                                                                            color={material.type === 'video' ? 'primary' : material.type === 'document' ? 'secondary' : 'default'}
                                                                        />
                                                                        {isComplete && (
                                                                            <Chip
                                                                                icon={<CheckCircle />}
                                                                                label="Completed"
                                                                                color="success"
                                                                                size="small"
                                                                            />
                                                                        )}
                                                                    </Box>
                                                                    {material.description && (
                                                                        <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                                                                            {material.description}
                                                                        </Typography>
                                                                    )}
                                                                    {materialProgress && !isComplete && (
                                                                        <Box sx={{ mt: 1 }}>
                                                                            <LinearProgress
                                                                                variant="determinate"
                                                                                value={materialProgress.progress_percentage}
                                                                                sx={{ mb: 0.5 }}
                                                                            />
                                                                            <Typography variant="caption">
                                                                                {materialProgress.progress_percentage}% complete
                                                                            </Typography>
                                                                        </Box>
                                                                    )}
                                                                </Box>
                                                                <Box sx={{ display: 'flex', gap: 1 }}>
                                                                    {!isTeacher && !isComplete && (
                                                                        <Button
                                                                            size="small"
                                                                            variant="outlined"
                                                                            onClick={() => handleMarkComplete(material.id)}
                                                                        >
                                                                            Mark Complete
                                                                        </Button>
                                                                    )}
                                                                    {isTeacher && (
                                                                        <>
                                                                            <IconButton
                                                                                size="small"
                                                                                onClick={() => handleOpenMaterialDialog(material)}
                                                                            >
                                                                                <Edit fontSize="small" />
                                                                            </IconButton>
                                                                            <IconButton
                                                                                size="small"
                                                                                onClick={() => handleDeleteMaterial(material.id)}
                                                                            >
                                                                                <Delete fontSize="small" />
                                                                            </IconButton>
                                                                        </>
                                                                    )}
                                                                    <Button
                                                                        size="small"
                                                                        variant="contained"
                                                                        onClick={() => {
                                                                            setSelectedMaterial(material);
                                                                            setTabValue(1);
                                                                        }}
                                                                    >
                                                                        View
                                                                    </Button>
                                                                </Box>
                                                            </Box>
                                                        </CardContent>
                                                    </Card>
                                                );
                                            })}
                                        </List>
                                    )}
                                </Box>
                            )}

                            {tabValue === 1 && selectedMaterial && (
                                <MaterialViewer
                                    material={selectedMaterial}
                                    onBack={() => {
                                        setTabValue(0);
                                        setSelectedMaterial(null);
                                    }}
                                />
                            )}
                        </Paper>
                    </Grid>
                </Grid>

                {/* Create/Edit Module Dialog */}
                <Dialog open={moduleDialogOpen} onClose={() => {
                    setModuleDialogOpen(false);
                    setEditingModule(null);
                    setModuleForm({ title: '', description: '' });
                }} maxWidth="sm" fullWidth>
                    <DialogTitle>{editingModule ? 'Edit Module' : 'Create Module'}</DialogTitle>
                    <DialogContent>
                        <TextField
                            fullWidth
                            label="Title"
                            value={moduleForm.title}
                            onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })}
                            sx={{ mt: 2 }}
                        />
                        <TextField
                            fullWidth
                            label="Description"
                            multiline
                            rows={3}
                            value={moduleForm.description}
                            onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value })}
                            sx={{ mt: 2 }}
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => {
                            setModuleDialogOpen(false);
                            setEditingModule(null);
                            setModuleForm({ title: '', description: '' });
                        }}>Cancel</Button>
                        <Button 
                            onClick={editingModule ? handleUpdateModule : handleCreateModule} 
                            variant="contained"
                        >
                            {editingModule ? 'Update' : 'Create'}
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Create/Edit Material Dialog */}
                <Dialog open={materialDialogOpen} onClose={() => {
                    setMaterialDialogOpen(false);
                    setEditingMaterial(null);
                    setMaterialForm({
                        title: '', type: 'lesson', description: '', content: '', video_url: '', module_id: ''
                    });
                }} maxWidth="md" fullWidth>
                    <DialogTitle>{editingMaterial ? 'Edit Material' : 'Create Material'}</DialogTitle>
                    <DialogContent sx={{ pt: 3 }}>
                        <TextField
                            fullWidth
                            label="Title"
                            value={materialForm.title}
                            onChange={(e) => setMaterialForm({ ...materialForm, title: e.target.value })}
                            required
                            sx={{ mb: 2 }}
                        />
                        <FormControl fullWidth sx={{ mb: 2 }}>
                            <InputLabel>Type</InputLabel>
                            <Select
                                value={materialForm.type}
                                onChange={(e) => setMaterialForm({ ...materialForm, type: e.target.value as any })}
                                label="Type"
                            >
                                <MenuItem value="lesson">Lesson</MenuItem>
                                <MenuItem value="video">Video (YouTube URL)</MenuItem>
                                <MenuItem value="document">Document (Upload)</MenuItem>
                            </Select>
                        </FormControl>
                        {materialForm.type === 'document' && (
                            <Button
                                variant="outlined"
                                startIcon={<Upload />}
                                onClick={() => {
                                    setMaterialDialogOpen(false);
                                    setMaterialForm({ ...materialForm, type: 'document' });
                                    setUploadDialogOpen(true);
                                }}
                                sx={{ mb: 2 }}
                            >
                                Upload File Instead
                            </Button>
                        )}
                        {materialForm.type === 'lesson' && (
                            <TextField
                                fullWidth
                                label="Content (Markdown)"
                                multiline
                                rows={10}
                                value={materialForm.content}
                                onChange={(e) => setMaterialForm({ ...materialForm, content: e.target.value })}
                                sx={{ mb: 2 }}
                            />
                        )}
                        {materialForm.type === 'video' && (
                            <TextField
                                fullWidth
                                label="YouTube URL"
                                value={materialForm.video_url}
                                onChange={(e) => setMaterialForm({ ...materialForm, video_url: e.target.value })}
                                sx={{ mb: 2 }}
                                placeholder="https://www.youtube.com/watch?v=..."
                                required
                            />
                        )}
                        <FormControl fullWidth sx={{ mb: 2 }}>
                            <InputLabel>Module (Optional)</InputLabel>
                            <Select
                                value={materialForm.module_id}
                                onChange={(e) => setMaterialForm({ ...materialForm, module_id: e.target.value })}
                                label="Module (Optional)"
                            >
                                <MenuItem value="">None</MenuItem>
                                {modules.map((m) => (
                                    <MenuItem key={m.id} value={m.id}>{m.title}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => {
                            setMaterialDialogOpen(false);
                            setEditingMaterial(null);
                            setMaterialForm({
                                title: '', type: 'lesson', description: '', content: '', video_url: '', module_id: ''
                            });
                        }}>Cancel</Button>
                        <Button 
                            onClick={editingMaterial ? handleUpdateMaterial : handleCreateMaterial} 
                            variant="contained"
                        >
                            {editingMaterial ? 'Update' : 'Create'}
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Upload Material Dialog */}
                <Dialog open={uploadDialogOpen} onClose={() => {
                    setUploadDialogOpen(false);
                    setUploadFile(null);
                    setMaterialForm({
                        title: '', type: 'document', description: '', content: '', video_url: '', module_id: ''
                    });
                }} maxWidth="sm" fullWidth>
                    <DialogTitle>Upload Material</DialogTitle>
                    <DialogContent sx={{ pt: 3 }}>
                        <TextField
                            fullWidth
                            label="Title"
                            value={materialForm.title}
                            onChange={(e) => setMaterialForm({ ...materialForm, title: e.target.value })}
                            required
                            sx={{ mb: 2 }}
                        />
                        <Button
                            variant="outlined"
                            component="label"
                            startIcon={<Upload />}
                            sx={{ mt: 2, mb: 2 }}
                            fullWidth
                        >
                            Select File
                            <input
                                type="file"
                                hidden
                                accept=".pdf,.doc,.docx,.pptx,.txt"
                                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                            />
                        </Button>
                        {uploadFile && (
                            <Typography variant="body2" sx={{ mt: 1 }}>
                                Selected: {uploadFile.name}
                            </Typography>
                        )}
                        <FormControl fullWidth sx={{ mt: 2 }}>
                            <InputLabel>Module (Optional)</InputLabel>
                            <Select
                                value={materialForm.module_id}
                                onChange={(e) => setMaterialForm({ ...materialForm, module_id: e.target.value })}
                            >
                                <MenuItem value="">None</MenuItem>
                                {modules.map((m) => (
                                    <MenuItem key={m.id} value={m.id}>{m.title}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setUploadDialogOpen(false)}>Cancel</Button>
                        <Button
                            onClick={handleUploadMaterial}
                            variant="contained"
                            disabled={!uploadFile || !materialForm.title}
                        >
                            Upload
                        </Button>
                    </DialogActions>
                </Dialog>
            </Box>
        </AppLayout>
    );
}

// Material Viewer Component
function MaterialViewer({ material, onBack }: { material: CourseMaterial; onBack: () => void }) {
    if (material.type === 'video') {
        return <VideoPlayer material={material} onBack={onBack} />;
    } else if (material.type === 'document') {
        return <DocumentViewer material={material} onBack={onBack} />;
    } else {
        return <LessonViewer material={material} onBack={onBack} />;
    }
}

// Video Player Component
function VideoPlayer({ material, onBack }: { material: CourseMaterial; onBack: () => void }) {
    const getYouTubeEmbedUrl = (url: string) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        const videoId = (match && match[2].length === 11) ? match[2] : null;
        return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    };

    const embedUrl = material.video_url ? getYouTubeEmbedUrl(material.video_url) : null;
    const fileUrl = material.file_path ? `/uploads/${material.file_path}` : null;

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5">{material.title}</Typography>
                <Button onClick={onBack}>Back</Button>
            </Box>
            {embedUrl ? (
                <Box sx={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden' }}>
                    <iframe
                        src={embedUrl}
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            border: 0
                        }}
                        allowFullScreen
                    />
                </Box>
            ) : fileUrl ? (
                <video controls style={{ width: '100%', maxHeight: '600px' }}>
                    <source src={fileUrl} />
                    Your browser does not support the video tag.
                </video>
            ) : (
                <Alert severity="warning">No video available</Alert>
            )}
            {material.description && (
                <Typography variant="body1" sx={{ mt: 2 }}>
                    {material.description}
                </Typography>
            )}
        </Box>
    );
}

// Document Viewer Component
function DocumentViewer({ material, onBack }: { material: CourseMaterial; onBack: () => void }) {
    const downloadUrl = material.id ? `/api/courses/materials/${material.id}/download` : null;
    const previewUrl = material.file_path ? `/uploads/${material.file_path}` : null;

    const handleDownload = async () => {
        if (!downloadUrl) return;
        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch(downloadUrl, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) throw new Error('Download failed');
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = material.title + (material.file_path?.match(/\.[^.]+$/) || ['.pdf'])[0];
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Download error:', error);
            // Fallback to direct link
            window.open(downloadUrl, '_blank');
        }
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5">{material.title}</Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    {downloadUrl && (
                        <Button
                            variant="outlined"
                            startIcon={<Download />}
                            onClick={handleDownload}
                        >
                            Download
                        </Button>
                    )}
                    <Button onClick={onBack}>Back</Button>
                </Box>
            </Box>
            {previewUrl ? (
                <Box sx={{ height: '600px', border: '1px solid #ddd', borderRadius: 1 }}>
                    {material.file_path?.endsWith('.pdf') ? (
                        <iframe
                            src={previewUrl}
                            style={{ width: '100%', height: '100%', border: 'none' }}
                        />
                    ) : (
                        <Box sx={{ p: 3, textAlign: 'center' }}>
                            <Description sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                            <Typography variant="h6" gutterBottom>
                                {material.title}
                            </Typography>
                            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                                {material.description}
                            </Typography>
                            {downloadUrl && (
                                <Button
                                    variant="contained"
                                    startIcon={<Download />}
                                    onClick={handleDownload}
                                >
                                    Download Document
                                </Button>
                            )}
                        </Box>
                    )}
                </Box>
            ) : (
                <Alert severity="warning">No document available</Alert>
            )}
        </Box>
    );
}

// Lesson Viewer Component
function LessonViewer({ material, onBack }: { material: CourseMaterial; onBack: () => void }) {
    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5">{material.title}</Typography>
                <Button onClick={onBack}>Back</Button>
            </Box>
            {material.description && (
                <Typography variant="body1" color="textSecondary" sx={{ mb: 2 }}>
                    {material.description}
                </Typography>
            )}
            <Paper sx={{ p: 3, whiteSpace: 'pre-wrap' }}>
                {material.content || 'No content available'}
            </Paper>
        </Box>
    );
}

