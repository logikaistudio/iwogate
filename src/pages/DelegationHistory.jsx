import React, { useEffect, useState } from 'react';
import { getTasks, deleteTask } from '../lib/api.js';
import { Loader2, ArrowLeft, Filter, Calendar, User, Eye, CheckCircle, Clock, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const DelegationHistory = () => {
    const navigate = useNavigate();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        const userStr = sessionStorage.getItem('iwogate_user');
        if (userStr) {
            setCurrentUser(JSON.parse(userStr));
        }

        const fetchTasks = async () => {
            try {
                const result = await getTasks({ type: 'outgoing' });
                setTasks(result.tasks.map((task) => ({
                    ...task,
                    displayDate: task.created_at ? new Date(task.created_at).toLocaleDateString() : '-',
                    assignee: task.assigned_to_name ? `${task.assigned_to_name} (${task.assigned_to_dept})` : task.assigned_to_dept,
                })));
            } catch (err) {
                console.error('Failed to fetch history:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchTasks();
    }, []);

    const handleDelete = async (id, e) => {
        e.stopPropagation();
        if (!confirm('Hapus delegasi ini dari riwayat? Data tugas akan hilang permanen.')) return;
        try {
            await deleteTask(id);
            setTasks(prev => prev.filter((t) => t.id !== id));
            alert('Berhasil dihapus.');
        } catch (err) {
            console.error('Delete failed:', err);
            alert('Gagal menghapus.');
        }
    };

    const filteredTasks = tasks.filter(task => {
        const matchesSearch = task.title.toLowerCase().includes(search.toLowerCase()) ||
            task.assignee.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const canDelete = currentUser?.role === 'admin' || currentUser?.role === 'superuser';

    return (
        <div className="history-page animate-fade-in" style={{ paddingBottom: '2rem' }}>
            <header className="page-header simple-header" style={{ marginBottom: '1rem' }}>
                <button onClick={() => navigate(-1)} className="back-btn">
                    <ArrowLeft size={24} />
                </button>
                <h2>Riwayat Delegasi</h2>
            </header>

            <div className="filters" style={{
                display: 'flex',
                gap: '0.5rem',
                marginBottom: '1rem',
                overflowX: 'auto',
                paddingBottom: '0.5rem'
            }}>
                <div style={{ position: 'relative', flex: 1 }}>
                    <Filter size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: '#64748b' }} />
                    <input
                        type="text"
                        placeholder="Cari tugas atau nama..."
                        style={{ paddingLeft: '2.2rem' }}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{ width: 'auto' }}
                >
                    <option value="all">Semua Status</option>
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Selesai</option>
                    <option value="Rejected">Ditolak</option>
                </select>
            </div>

            {loading ? (
                <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>
            ) : (
                <div className="table-container" style={{ width: '100%', overflowX: 'auto', background: 'white', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', WebkitOverflowScrolling: 'touch' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                                <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', color: 'var(--secondary)' }}>Tanggal</th>
                                <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', color: 'var(--secondary)' }}>Judul Tugas</th>
                                <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', color: 'var(--secondary)' }}>Penerima</th>
                                <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.875rem', color: 'var(--secondary)' }}>Status</th>
                                <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.875rem', color: 'var(--secondary)' }}>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTasks.length > 0 ? (
                                filteredTasks.map(task => (
                                    <tr key={task.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Calendar size={14} className="text-muted" />
                                                {task.displayDate}
                                            </div>
                                        </td>
                                        <td style={{ padding: '0.75rem', fontWeight: '500' }}>{task.title}</td>
                                        <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <User size={14} className="text-muted" />
                                                {task.assignee}
                                            </div>
                                        </td>
                                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                            <span className={`status-badge status-${task.status.toLowerCase().replace(' ', '')}`} style={{ fontSize: '0.7rem' }}>
                                                {task.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                            <div className="flex justify-center gap-2">
                                                <button
                                                    onClick={() => navigate(`/task/${task.id}`)}
                                                    style={{ color: 'var(--primary)', padding: '0.25rem' }}
                                                    title="Lihat Detail"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                                {canDelete && (
                                                    <button
                                                        onClick={(e) => handleDelete(task.id, e)}
                                                        className="text-red-500 hover:text-red-700 p-1"
                                                        title="Hapus"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--secondary)' }}>
                                        Tidak ada data yang ditemukan.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default DelegationHistory;
