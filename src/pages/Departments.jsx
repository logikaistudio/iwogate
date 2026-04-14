import React, { useEffect, useState } from 'react';
import { getDepartments, getDepartmentStats, createDepartment, updateDepartment, deleteDepartment } from '../lib/api.js';
import { Loader2, Plus, Edit, Trash2, Building, GripVertical } from 'lucide-react';
import '../components/Modal.css';
import './Departments.css';

const Departments = () => {
    const [departments, setDepartments] = useState([]);
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);
    const [modal, setModal] = useState({ open: false, mode: 'create', data: null });
    const [formData, setFormData] = useState({ name: '', label: '', color: '#3b82f6', description: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const userStr = sessionStorage.getItem('iwogate_user');
        if (userStr) {
            setCurrentUser(JSON.parse(userStr));
        }
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [deptResponse, statsResponse] = await Promise.all([
                getDepartments(),
                getDepartmentStats(),
            ]);

            setDepartments(deptResponse.departments);
            setStats(statsResponse.stats || {});
        } catch (err) {
            console.error('Fetch function error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;
        setIsSubmitting(true);

        try {
            const desc = formData.description || '';

            if (modal.mode === 'create') {
                await createDepartment({
                    name: formData.name,
                    label: formData.label,
                    color: formData.color,
                    description: desc,
                });
            } else {
                if (!modal.data?.id) throw new Error('ID not found');
                await updateDepartment(modal.data.id, {
                    name: formData.name,
                    label: formData.label,
                    color: formData.color,
                    description: desc,
                });
            }
            await fetchData();
            setModal({ open: false, mode: 'create', data: null });
            resetForm();
            alert('Berhasil disimpan!');
        } catch (err) {
            console.error('Save Error:', err);
            alert('Gagal menyimpan: ' + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Yakin ingin menghapus departemen ini?')) return;
        try {
            await deleteDepartment(id);
            await fetchData();
        } catch (err) {
            console.error('Delete Error:', err);
            alert('Gagal menghapus department. Mungkin sedang digunakan oleh Tugas aktif.');
        }
    };

    const resetForm = () => {
        setFormData({ name: '', label: '', color: '#3b82f6', description: '' });
    };

    const openModal = (mode, dept = null) => {
        setModal({ open: true, mode, data: dept });
        if (mode === 'edit' && dept) {
            setFormData({
                name: dept.name,
                label: dept.label,
                color: dept.color,
                description: dept.description || ''
            });
        } else {
            resetForm();
        }
    };

    const canEdit = currentUser?.role === 'superuser' || currentUser?.role === 'admin';

    if (loading) return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin text-primary" size={32} /></div>;

    return (
        <div className="departments-page animate-fade-in">
            <header className="page-header">
                <div>
                    <h2 className="page-title">Departemen</h2>
                    <p className="page-subtitle">Kelola divisi dan pantau beban kerja</p>
                </div>
                {canEdit && (
                    <button
                        onClick={() => openModal('create')}
                        className="add-btn"
                    >
                        <Plus size={16} /> <span className="hidden sm:inline">Tambah Divisi</span>
                    </button>
                )}
            </header>

            <div className="dept-grid">
                {departments.map((dept) => (
                    <div key={dept.id} className="dept-card group">
                        <div className="dept-header">
                            <div
                                className="dept-icon"
                                style={{ background: `${dept.color}15`, color: dept.color }}
                            >
                                {dept.label.charAt(0)}
                            </div>
                            <div className="dept-info">
                                <h3 className="dept-name">{dept.label}</h3>
                                <span className="dept-code">{dept.name}</span>
                            </div>

                            {/* Actions positioned top-right */}
                            {canEdit && (
                                <div className="dept-actions opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); openModal('edit', dept); }}
                                        className="action-btn"
                                        title="Edit"
                                    >
                                        <Edit size={14} />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDelete(dept.id); }}
                                        className="action-btn delete"
                                        title="Hapus"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            )}
                        </div>

                        <p className="dept-desc">
                            {dept.description || "Tidak ada deskripsi."}
                        </p>

                        <div className="dept-footer">
                            <span className="workload-label">Total Tugas Aktif</span>
                            <span className={`workload-badge ${stats[dept.name] > 0 ? 'active' : ''}`}>
                                {stats[dept.name] || 0}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal */}
            {modal.open && (
                <div className="modal-overlay">
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">
                                {modal.mode === 'create' ? 'Tambah Divisi Baru' : 'Edit Divisi'}
                            </h3>
                            <button onClick={() => setModal({ ...modal, open: false })} className="modal-close">
                                <span className="sr-only">Tutup</span>
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSave}>
                            <div className="modal-body">
                                <div className="input-group">
                                    <label className="input-label">Nama Divisi</label>
                                    <input
                                        type="text"
                                        required
                                        className="input-field"
                                        value={formData.label}
                                        onChange={e => setFormData({ ...formData, label: e.target.value })}
                                        placeholder="Contoh: Keuangan"
                                    />
                                </div>

                                <div className="flex gap-4">
                                    <div className="input-group flex-1">
                                        <label className="input-label">Kode Unik</label>
                                        <input
                                            type="text"
                                            required
                                            className="input-field"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
                                            placeholder="Ex: HRD"
                                            maxLength={5}
                                        />
                                    </div>
                                    <div className="input-group" style={{ width: '80px' }}>
                                        <label className="input-label">Warna</label>
                                        <input
                                            type="color"
                                            className="input-field color-picker"
                                            value={formData.color}
                                            onChange={e => setFormData({ ...formData, color: e.target.value })}
                                            title="Pilih warna label"
                                        />
                                    </div>
                                </div>

                                <div className="input-group">
                                    <label className="input-label">Deskripsi</label>
                                    <textarea
                                        className="input-field"
                                        rows="3"
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Jelaskan peran dan tanggung jawab divisi ini..."
                                    />
                                </div>
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
                                    {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : 'Simpan Perubahan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Departments;
