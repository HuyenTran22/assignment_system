import { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    TablePagination, TextField, MenuItem, IconButton, Button, Chip, Dialog, DialogTitle,
    DialogContent, DialogActions, FormControl, InputLabel, Select, Alert, Tooltip, CircularProgress
} from '@mui/material';
import { Edit, Delete, VpnKey, Search, Add } from '@mui/icons-material';
import { adminApi } from '../api/adminApi';
import { User, UserRole } from '../types/admin.types';
import { useSnackbar } from 'notistack';

export default function UserManagementPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState<UserRole | ''>('');
    const [loading, setLoading] = useState(false);
    const { enqueueSnackbar } = useSnackbar();

    // Dialog states
    const [editUser, setEditUser] = useState<User | null>(null);
    const [deleteUser, setDeleteUser] = useState<User | null>(null);
    const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
    const [resetLink, setResetLink] = useState<string | null>(null);

    useEffect(() => {
        fetchUsers();
    }, [page, rowsPerPage, search, roleFilter]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const data = await adminApi.getUsers({
                skip: page * rowsPerPage,
                limit: rowsPerPage,
                search: search || undefined,
                role: roleFilter || undefined
            });
            setUsers(data?.users || []);
            setTotal(data?.total || 0);
        } catch (error: any) {
            console.error('Failed to fetch users:', error);
            const errorMessage = error?.response?.data?.detail || error?.message || 'Failed to fetch users';
            enqueueSnackbar(errorMessage, { variant: 'error' });
            setUsers([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    };

    const handleEditSave = async () => {
        if (!editUser) return;
        try {
            await adminApi.updateUser(editUser.id, {
                full_name: editUser.full_name,
                email: editUser.email,
                student_id: editUser.student_id,
                class_name: editUser.class_name,
                role: editUser.role
            });
            enqueueSnackbar('User updated successfully', { variant: 'success' });
            setEditUser(null);
            fetchUsers();
        } catch (error) {
            enqueueSnackbar('Failed to update user', { variant: 'error' });
        }
    };

    const handleDeleteConfirm = async () => {
        if (!deleteUser) return;
        try {
            await adminApi.deleteUser(deleteUser.id);
            enqueueSnackbar('User deleted successfully', { variant: 'success' });
            setDeleteUser(null);
            fetchUsers();
        } catch (error) {
            enqueueSnackbar('Failed to delete user', { variant: 'error' });
        }
    };

    const handleResetPassword = async () => {
        if (!resetPasswordUser) return;
        try {
            const result = await adminApi.generateResetLink(resetPasswordUser.id, true);
            setResetLink(result.reset_link);
            enqueueSnackbar('Reset link generated and sent via email', { variant: 'success' });
        } catch (error) {
            enqueueSnackbar('Failed to generate reset link', { variant: 'error' });
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h4">User Management</Typography>
                <Button variant="contained" startIcon={<Add />} href="/admin/import">
                    Import Users
                </Button>
            </Box>

            <Paper sx={{ p: 2, mb: 3 }}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField
                        label="Search"
                        variant="outlined"
                        size="small"
                        fullWidth
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        InputProps={{ startAdornment: <Search color="action" /> }}
                    />
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                        <InputLabel>Role</InputLabel>
                        <Select
                            value={roleFilter}
                            label="Role"
                            onChange={(e) => setRoleFilter(e.target.value as UserRole)}
                        >
                            <MenuItem value="">All Roles</MenuItem>
                            <MenuItem value={UserRole.STUDENT}>Student</MenuItem>
                            <MenuItem value={UserRole.TEACHER}>Teacher</MenuItem>
                            <MenuItem value={UserRole.ADMIN}>Admin</MenuItem>
                        </Select>
                    </FormControl>
                </Box>
            </Paper>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Name</TableCell>
                            <TableCell>Email</TableCell>
                            <TableCell>Role</TableCell>
                            <TableCell>Student ID</TableCell>
                            <TableCell>Class</TableCell>
                            <TableCell>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} align="center"><CircularProgress /></TableCell>
                            </TableRow>
                        ) : users.map((user) => (
                            <TableRow key={user.id}>
                                <TableCell>{user.full_name}</TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>
                                    <Chip
                                        label={user.role}
                                        color={user.role === UserRole.ADMIN ? 'error' : user.role === UserRole.TEACHER ? 'warning' : 'primary'}
                                        size="small"
                                    />
                                </TableCell>
                                <TableCell>{user.student_id || '-'}</TableCell>
                                <TableCell>{user.class_name || '-'}</TableCell>
                                <TableCell>
                                    <Tooltip title="Edit">
                                        <IconButton onClick={() => setEditUser(user)}><Edit /></IconButton>
                                    </Tooltip>
                                    <Tooltip title="Reset Password">
                                        <IconButton onClick={() => setResetPasswordUser(user)}><VpnKey /></IconButton>
                                    </Tooltip>
                                    <Tooltip title="Delete">
                                        <IconButton color="error" onClick={() => setDeleteUser(user)}><Delete /></IconButton>
                                    </Tooltip>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                <TablePagination
                    component="div"
                    count={total}
                    page={page}
                    onPageChange={(_, p) => setPage(p)}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={(e) => setRowsPerPage(parseInt(e.target.value, 10))}
                />
            </TableContainer>

            {/* Edit Dialog */}
            <Dialog open={!!editUser} onClose={() => setEditUser(null)} maxWidth="sm" fullWidth>
                <DialogTitle>Edit User</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                        <TextField
                            label="Full Name"
                            value={editUser?.full_name || ''}
                            onChange={(e) => setEditUser(prev => prev ? { ...prev, full_name: e.target.value } : null)}
                        />
                        <TextField
                            label="Email"
                            value={editUser?.email || ''}
                            onChange={(e) => setEditUser(prev => prev ? { ...prev, email: e.target.value } : null)}
                        />
                        <FormControl>
                            <InputLabel>Role</InputLabel>
                            <Select
                                value={editUser?.role || ''}
                                label="Role"
                                onChange={(e) => setEditUser(prev => prev ? { ...prev, role: e.target.value as UserRole } : null)}
                            >
                                <MenuItem value={UserRole.STUDENT}>Student</MenuItem>
                                <MenuItem value={UserRole.TEACHER}>Teacher</MenuItem>
                                <MenuItem value={UserRole.ADMIN}>Admin</MenuItem>
                            </Select>
                        </FormControl>
                        <TextField
                            label="Student ID"
                            value={editUser?.student_id || ''}
                            onChange={(e) => setEditUser(prev => prev ? { ...prev, student_id: e.target.value } : null)}
                        />
                        <TextField
                            label="Class Name"
                            value={editUser?.class_name || ''}
                            onChange={(e) => setEditUser(prev => prev ? { ...prev, class_name: e.target.value } : null)}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditUser(null)}>Cancel</Button>
                    <Button onClick={handleEditSave} variant="contained">Save</Button>
                </DialogActions>
            </Dialog>

            {/* Delete Dialog */}
            <Dialog open={!!deleteUser} onClose={() => setDeleteUser(null)}>
                <DialogTitle>Delete User</DialogTitle>
                <DialogContent>
                    <Typography>Are you sure you want to delete {deleteUser?.full_name}?</Typography>
                    <Typography variant="caption" color="error">This action cannot be undone.</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteUser(null)}>Cancel</Button>
                    <Button onClick={handleDeleteConfirm} color="error" variant="contained">Delete</Button>
                </DialogActions>
            </Dialog>

            {/* Reset Password Dialog */}
            <Dialog open={!!resetPasswordUser} onClose={() => { setResetPasswordUser(null); setResetLink(null); }}>
                <DialogTitle>Reset Password</DialogTitle>
                <DialogContent>
                    {!resetLink ? (
                        <Typography>Generate a password reset link for {resetPasswordUser?.full_name}?</Typography>
                    ) : (
                        <Box>
                            <Alert severity="success" sx={{ mb: 2 }}>Reset link generated!</Alert>
                            <TextField
                                fullWidth
                                value={resetLink}
                                InputProps={{ readOnly: true }}
                                label="Reset Link"
                            />
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => { setResetPasswordUser(null); setResetLink(null); }}>Close</Button>
                    {!resetLink && (
                        <Button onClick={handleResetPassword} variant="contained">Generate Link</Button>
                    )}
                </DialogActions>
            </Dialog>
        </Box>
    );
}
