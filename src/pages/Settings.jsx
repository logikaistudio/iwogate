import React, { useState, useEffect } from 'react';
import { getUsers, getDepartments, getRoles, createUser, updateUser, deleteUser, createRole, updateRole, deleteRole } from '../lib/api.js';
import { Loader2, Plus, User, Edit, Trash2, ArrowLeft, Eye, EyeOff, CheckSquare, Square, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import '../components/Modal.css';
import './Settings.css';

// Permission groups for role form
const PERMISSION_GROUPS = [
    {
        category: 'Tugas',
        icon: '📋',
        items: [
            { key: 'view_task', label: 'Lihat Tugas' },
            { key: 'create_task', label: 'Buat Tugas' },
            { key: 'edit_task', label: 'Edit Tugas' },
            { key: 'delete_task', label: 'Hapus Tugas' },
            { key: 'update_status', label: 'Update Status Tugas' },
        ]
    },
    {
        category: 'Pengguna',
        icon: '👥',
        items: [
            { key: 'manage_users', label: 'Kelola Pengguna' },
            { key: 'view_profile', label: 'Lihat Profil' },
        ]
    },
    {
        category: 'Departemen',
        icon: '🏢',
        items: [
            { key: 'view_dept', label: 'Lihat Departemen' },
            { key: 'manage_dept', label: 'Kelola Departemen' },
        ]
    },
    {
        category: 'Laporan & Riwayat',
        icon: '📊',
        items: [
            { key: 'view_report', label: 'Lihat Laporan' },
            { key: 'view_history', label: 'Lihat Riwayat Delegasi' },
        ]
    },
];

const ALL_PERMISSION_KEYS = PERMISSION_GROUPS.flatMap(g => g.items.map(i => i.key));

// Convert comma string from DB → Set
const permStringToSet = (str) => {
    if (!str || str.trim() === 'all') return new Set(str?.trim() === 'all' ? ALL_PERMISSION_KEYS : []);
    return new Set(str.split(',').map(s => s.trim()).filter(Boolean));
};

// Convert Set → comma string for DB
const permSetToString = (set) => {
    if (set.size === ALL_PERMISSION_KEYS.length) return 'all';
    return [...set].join(', ');
};

const Settings = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);
    const [activeTab, setActiveTab] = useState('users');
    const [modal, setModal] = useState({ open: false, mode: 'create', data: null });

    const [roles, setRoles] = useState([]);
    const [roleForm, setRoleForm] = useState({ name: '', code: '', description: '', permissions: new Set() });

    // User Form State
    const [formData, setFormData] = useState({
        name: '',
        username: '',
        email: '',
        role: 'user',
        department: '',
        password: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const userStr = sessionStorage.getItem('iwogate_user');
                let activeRole = 'user';
                let activeUserId = null;

                if (userStr) {
                    const localUser = JSON.parse(userStr);
                    setCurrentUser(localUser);
                    activeRole = localUser.role || 'user';
                    activeUserId = localUser.id || null;
                }

                const [allUsers, allDepts, allRoles] = await Promise.all([
                    getUsers(),
                    getDepartments(),
                    getRoles(),
                ]);

                setDepartments(allDepts.departments);

                if (activeRole === 'superuser') {
                    setUsers(allUsers.users);
                    setRoles(allRoles.roles);
                } else if (activeRole === 'admin') {
                    setUsers(allUsers.users.filter((u) => u.id === activeUserId || (u.role !== 'superuser' && u.role !== 'admin')));
                    setRoles(allRoles.roles.filter((r) => r.code !== 'superuser' && r.code !== 'admin'));
                } else {
                    setUsers(allUsers.users.filter((u) => u.id === activeUserId));
                    setRoles([]);
                }
            } catch (err) {
                console.error('Failed to load settings:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchInitialData();
    }, []);

    const resetForm = () => {
        setFormData({ name: '', username: '', email: '', role: 'user', department: '', password: '' });
        setRoleForm({ name: '', code: '', description: '', permissions: new Set() });
        setShowPassword(false);
    };

    const togglePermission = (key) => {
        setRoleForm(prev => {
            const next = new Set(prev.permissions);
            if (next.has(key)) { next.delete(key); } else { next.add(key); }
            return { ...prev, permissions: next };
        });
    };

    const toggleAllInGroup = (items) => {
        const keys = items.map(i => i.key);
        setRoleForm(prev => {
            const next = new Set(prev.permissions);
            const allChecked = keys.every(k => next.has(k));
            if (allChecked) { keys.forEach(k => next.delete(k)); }
            else { keys.forEach(k => next.add(k)); }
            return { ...prev, permissions: next };
        });
    };

    const toggleAllPermissions = () => {
        setRoleForm(prev => {
            if (prev.permissions.size === ALL_PERMISSION_KEYS.length) {
                return { ...prev, permissions: new Set() };
            }
            return { ...prev, permissions: new Set(ALL_PERMISSION_KEYS) };
        });
    };

    const openModal = async (mode, item = null) => {
        setModal({ open: true, mode, data: item });
        resetForm(); // Reset first

        // Always refresh departments & roles so newly added data appears in dropdowns
        if (activeTab === 'users') {
            try {
                const [freshDepts, freshRoles] = await Promise.all([
                    getDepartments(),
                    getRoles(),
                ]);
                setDepartments(freshDepts.departments);
                if (currentUser?.role === 'superuser') {
                    setRoles(freshRoles.roles);
                } else if (currentUser?.role === 'admin') {
                    setRoles(freshRoles.roles.filter(r => r.code !== 'superuser' && r.code !== 'admin'));
                }
            } catch (err) {
                console.error('Failed to refresh dropdowns:', err);
            }
        }

        if (mode === 'edit' && item) {
            if (activeTab === 'users') {
                setFormData({
                    name: item.name,
                    username: item.username || '',
                    email: item.email || '',
                    role: item.role,
                    department: item.department,
                    password: '',
                });
            } else {
                setRoleForm({
                    name: item.name,
                    code: item.code,
                    description: item.description || '',
                    permissions: permStringToSet(item.permissions || ''),
                });
            }
        }
    };

    const fetchRoles = async () => {
        try {
            const data = await getRoles();
            if (currentUser?.role === 'superuser') {
                setRoles(data.roles);
            } else if (currentUser?.role === 'admin') {
                setRoles(data.roles.filter(r => r.code !== 'superuser' && r.code !== 'admin'));
            }
        } catch (err) {
            console.error('Failed to load roles:', err);
        }
    };

    const fetchUsers = async () => {
        try {
            const [allUsers, allDepts] = await Promise.all([
                getUsers(),
                getDepartments(),
            ]);
            setDepartments(allDepts.departments);
            if (currentUser?.role === 'superuser') {
                setUsers(allUsers.users);
            } else if (currentUser?.role === 'admin') {
                setUsers(allUsers.users.filter(u => u.id === currentUser.id || (u.role !== 'superuser' && u.role !== 'admin')));
            } else {
                setUsers(allUsers.users.filter((u) => u.id === currentUser.id));
            }
        } catch (err) {
            console.error('Failed to load users:', err);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            if (activeTab === 'users') {
                const userPayload = {
                    name: formData.name,
                    username: formData.username,
                    email: formData.email,
                    role: formData.role,
                    department: formData.department,
                    password: formData.password,
                    avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name)}`,
                };

                if (modal.mode === 'create') {
                    await createUser(userPayload);
                } else {
                    await updateUser(modal.data.id, userPayload);
                }
                await fetchUsers();
            } else {
                const permStr = permSetToString(roleForm.permissions);
                const rolePayload = {
                    name: roleForm.name,
                    code: roleForm.code,
                    description: roleForm.description,
                    permissions: permStr,
                };
                if (modal.mode === 'create') {
                    await createRole(rolePayload);
                } else {
                    await updateRole(modal.data.id, rolePayload);
                }
                await fetchRoles();
            }

            setModal({ open: false, mode: 'create', data: null });
            resetForm();
            alert('Berhasil disimpan!');
        } catch (err) {
            console.error(err);
            alert('Error: ' + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Yakin ingin menghapus user ini?')) return;
        try {
            await deleteUser(id);
            await fetchUsers();
            alert('User berhasil dihapus.');
        } catch (err) {
            console.error('Delete Error:', err);
            if (err.message && err.message.includes('violates foreign key constraint')) {
                alert('Gagal menghapus User: User ini memiliki data Tugas terkait yang tidak bisa dihapus otomatis via constraint. Harap hapus tugas-tugas user ini terlebih dahulu.');
            } else {
                alert('Gagal menghapus user: ' + err.message);
            }
        }
    };

    const handleDeleteRole = async (id, code) => {
        if (code === 'superuser') {
            alert('Role Superuser tidak dapat dihapus!');
            return;
        }
        if (!confirm('Are you sure? This might affect users assigned to this role.')) return;
        try {
            await deleteRole(id);
            await fetchRoles();
        } catch (err) {
            console.error(err);
            alert('Failed to delete role.');
        }
    };

    if (loading) return <div className="flex justify-center h-screen items-center"><Loader2 className="animate-spin text-primary" /></div>;

    // Permissions
    const isSuperUser = currentUser?.role === 'superuser';
    const isAdmin = currentUser?.role === 'admin';
    const canEdit = isSuperUser || isAdmin;

    return (
        <div className="settings-page animate-fade-in pb-20">
            <header className="page-header simple-header">
                <button onClick={() => navigate(-1)} className="back-btn">
                    <ArrowLeft size={24} />
                </button>
                <h2>Pengaturan Pengguna & Role</h2>
            </header>

            <div className="p-4">
                <div className="current-user-card">
                    <div className="current-user-icon">
                        <User size={24} />
                    </div>
                    <div className="current-user-info">
                        <div className="current-user-header">
                            <span className="label">Login Sebagai</span>
                            <span className={`role-badge role-${currentUser?.role || 'user'}`}>{currentUser?.role}</span>
                        </div>
                        <h3 className="current-user-name">{currentUser?.name}</h3>
                        <p className="current-user-desc">
                            {isSuperUser ? "Akses penuh (Super Admin)" :
                                isAdmin ? "Akses Admin" : "Akses Terbatas"}
                        </p>
                    </div>
                </div>

                <div className="settings-tabs">
                    <button
                        className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
                        onClick={() => setActiveTab('users')}
                    >
                        Management User
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'roles' ? 'active' : ''}`}
                        onClick={() => setActiveTab('roles')}
                    >
                        Role & Permissions
                    </button>
                </div>

                {activeTab === 'users' ? (
                    <>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="section-title">Daftar Pengguna</h3>
                            {canEdit && (
                                <button
                                    onClick={() => openModal('create')}
                                    className="add-btn"
                                >
                                    <Plus size={18} /> Tambah User
                                </button>
                            )}
                        </div>

                        <div className="user-list">
                            {users.map(user => (
                                <div key={user.id} className="user-card">
                                    <div className="user-info">
                                        <img src={user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}`} className="user-avatar" alt={user.name} />
                                        <div className="user-details">
                                            <h4 className="user-name">{user.name}</h4>
                                            <div className="user-meta">
                                                <span className={`user-role-badge role-${user.role || 'user'}`}>{user.role}</span>
                                                <span className="dot">•</span>
                                                <span>{user.department}</span>
                                            </div>
                                            <div className="text-xs text-slate-400">@{user.username || '-'}</div>
                                        </div>
                                    </div>

                                    <div className="user-actions">
                                        {(isSuperUser || (isAdmin && user.role === 'user')) && (
                                            <>
                                                <button onClick={() => openModal('edit', user)} className="action-icon-btn" title="Edit User">
                                                    <Edit size={18} />
                                                </button>
                                                <button onClick={() => handleDelete(user.id)} className="action-icon-btn delete-btn" title="Hapus User">
                                                    <Trash2 size={18} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="roles-list animate-fade-in">
                        <div className="flex justify-end mb-4">
                            {canEdit && (
                                <button
                                    onClick={() => openModal('create')}
                                    className="add-btn"
                                >
                                    <Plus size={18} /> Tambah Role
                                </button>
                            )}
                        </div>
                        {roles.map(role => {
                            const permSet = permStringToSet(role.permissions || '');
                            const isAll = role.permissions?.trim() === 'all' || permSet.size === ALL_PERMISSION_KEYS.length;
                            return (
                                <div key={role.id} className="role-card relative group">
                                    <div className="role-header">
                                        <div className={`role-badge role-${role.code}`}>{role.name}</div>
                                        <span className="role-users-count">{users.filter(u => u.role === role.code).length} Users Assigned</span>
                                    </div>
                                    <p className="role-desc">{role.description}</p>
                                    <div className="perm-chips">
                                        {isAll ? (
                                            <span className="perm-chip perm-chip-all">🔓 Akses Penuh</span>
                                        ) : permSet.size === 0 ? (
                                            <span className="perm-chip perm-chip-none">🚫 Tidak ada akses</span>
                                        ) : (
                                            PERMISSION_GROUPS.flatMap(g =>
                                                g.items
                                                    .filter(item => permSet.has(item.key))
                                                    .map(item => (
                                                        <span key={item.key} className="perm-chip">
                                                            {item.label}
                                                        </span>
                                                    ))
                                            )
                                        )}
                                    </div>
                                    {canEdit && (
                                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => openModal('edit', role)} className="action-icon-btn bg-slate-100" title="Edit Role">
                                                <Edit size={16} />
                                            </button>
                                            <button onClick={() => handleDeleteRole(role.id, role.code)} className="action-icon-btn delete-btn bg-red-50" title="Hapus Role">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modal */}
            {modal.open && (
                <div className="modal-overlay">
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">
                                {activeTab === 'users'
                                    ? (modal.mode === 'create' ? 'Tambah User Baru' : 'Edit User')
                                    : (modal.mode === 'create' ? 'Tambah Role Baru' : 'Edit Role')
                                }
                            </h3>
                            <button onClick={() => setModal({ ...modal, open: false })} className="modal-close">
                                <span className="sr-only">Tutup</span>
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSave}>
                            <div className="modal-body">
                                {activeTab === 'users' ? (
                                    <>
                                        {/* User Form Fields */}
                                        <div className="input-group">
                                            <label className="input-label">Nama Lengkap</label>
                                            <input
                                                type="text"
                                                required
                                                className="input-field"
                                                value={formData.name}
                                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                placeholder="Nama Lengkap"
                                            />
                                        </div>
                                        <div className="input-group">
                                            <label className="input-label">Username</label>
                                            <input
                                                type="text"
                                                required
                                                className="input-field"
                                                value={formData.username}
                                                onChange={e => setFormData({ ...formData, username: e.target.value })}
                                                placeholder="username"
                                            />
                                        </div>
                                        <div className="input-group">
                                            <label className="input-label">Email</label>
                                            <input
                                                type="email"
                                                required
                                                className="input-field"
                                                value={formData.email}
                                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                                placeholder="email@example.com"
                                            />
                                        </div>

                                        <div className="flex gap-4">
                                            <div className="input-group flex-1">
                                                <label className="input-label">Role</label>
                                                <select
                                                    className="input-field"
                                                    value={formData.role}
                                                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                                                    required
                                                >
                                                    <option value="">-- Pilih Role --</option>
                                                    {roles.map(r => (
                                                        <option key={r.id} value={r.code}>{r.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="input-group flex-1">
                                                <label className="input-label">Divisi</label>
                                                <select
                                                    className="input-field"
                                                    value={formData.department}
                                                    onChange={e => setFormData({ ...formData, department: e.target.value })}
                                                    required
                                                >
                                                    <option value="">Pilih Divisi</option>
                                                    {departments.map(dept => (
                                                        <option key={dept.id} value={dept.name}>{dept.label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="input-group">
                                            <label className="input-label">
                                                Password {modal.mode === 'edit' && <span className="text-secondary font-normal text-xs">(Kosongkan jika tidak ubah)</span>}
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type={showPassword ? "text" : "password"}
                                                    className="input-field"
                                                    style={{ paddingRight: '2.5rem' }}
                                                    value={formData.password}
                                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                                    required={modal.mode === 'create'}
                                                    placeholder={modal.mode === 'edit' ? '******' : 'Minimal 6 karakter'}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                                >
                                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        {/* Role Form Fields */}
                                        <div className="input-group">
                                            <label className="input-label">Nama Role</label>
                                            <input
                                                type="text"
                                                required
                                                className="input-field"
                                                value={roleForm.name}
                                                onChange={e => setRoleForm({ ...roleForm, name: e.target.value })}
                                                placeholder="Contoh: Supervisor"
                                            />
                                        </div>
                                        <div className="input-group">
                                            <label className="input-label">Kode Role (Unik)</label>
                                            <input
                                                type="text"
                                                required
                                                className="input-field"
                                                value={roleForm.code}
                                                onChange={e => setRoleForm({ ...roleForm, code: e.target.value.toLowerCase() })}
                                                placeholder="contoh: supervisor"
                                            />
                                        </div>
                                        <div className="input-group">
                                            <label className="input-label">Deskripsi</label>
                                            <textarea
                                                className="input-field"
                                                rows="3"
                                                value={roleForm.description}
                                                onChange={e => setRoleForm({ ...roleForm, description: e.target.value })}
                                                placeholder="Jelaskan batasan role ini..."
                                            />
                                        </div>
                                        <div className="input-group">
                                            <div className="perm-header">
                                                <label className="input-label" style={{ margin: 0 }}>
                                                    <Shield size={14} style={{ display: 'inline', marginRight: '0.4rem', verticalAlign: 'middle' }} />
                                                    Permissions Akses
                                                </label>
                                                <button
                                                    type="button"
                                                    onClick={toggleAllPermissions}
                                                    className="perm-select-all-btn"
                                                >
                                                    {roleForm.permissions.size === ALL_PERMISSION_KEYS.length
                                                        ? '✕ Hapus Semua'
                                                        : '✓ Pilih Semua'
                                                    }
                                                </button>
                                            </div>
                                            <div className="perm-groups">
                                                {PERMISSION_GROUPS.map(group => {
                                                    const allGroupChecked = group.items.every(i => roleForm.permissions.has(i.key));
                                                    const someGroupChecked = group.items.some(i => roleForm.permissions.has(i.key));
                                                    return (
                                                        <div key={group.category} className="perm-group">
                                                            <div
                                                                className="perm-group-header"
                                                                onClick={() => toggleAllInGroup(group.items)}
                                                            >
                                                                <span className="perm-group-icon">{group.icon}</span>
                                                                <span className="perm-group-title">{group.category}</span>
                                                                <span className={`perm-group-check ${allGroupChecked ? 'checked' : someGroupChecked ? 'partial' : ''}`}>
                                                                    {allGroupChecked
                                                                        ? <CheckSquare size={16} />
                                                                        : someGroupChecked
                                                                            ? <CheckSquare size={16} style={{ opacity: 0.5 }} />
                                                                            : <Square size={16} />
                                                                    }
                                                                </span>
                                                            </div>
                                                            <div className="perm-items">
                                                                {group.items.map(item => (
                                                                    <label key={item.key} className="perm-item">
                                                                        <input
                                                                            type="checkbox"
                                                                            className="perm-checkbox"
                                                                            checked={roleForm.permissions.has(item.key)}
                                                                            onChange={() => togglePermission(item.key)}
                                                                        />
                                                                        <span className="perm-item-label">{item.label}</span>
                                                                        <span className="perm-item-key">{item.key}</span>
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="modal-footer">
                                <button
                                    type="button"
                                    onClick={() => setModal({ ...modal, open: false })}
                                    className="modal-btn cancel"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="modal-btn submit"
                                >
                                    {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : 'Simpan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Settings;
