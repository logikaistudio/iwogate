import React, { useState, useEffect } from 'react';
import { Search, Plus, Loader2, ArrowRight } from 'lucide-react';
import TaskCard from '../components/TaskCard';
import { Link } from 'react-router-dom';
import { getTasks, deleteTask } from '../lib/api.js';
import './Dashboard.css';

const Dashboard = () => {
    const [activeTab, setActiveTab] = useState('incoming');
    const [searchQuery, setSearchQuery] = useState('');
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        const userStr = sessionStorage.getItem('iwogate_user');
        if (userStr) {
            setCurrentUser(JSON.parse(userStr));
        }

        const fetchTasks = async () => {
            try {
                const result = await getTasks({});
                const formattedTasks = result.tasks.map(task => ({
                    ...task,
                    assignedBy: task.type === 'outgoing' ? 'Saya' : (task.assigned_by_name ? `${task.assigned_by_name} (${task.assigned_by_dept})` : 'System'),
                    dueDate: task.due_date ? new Date(task.due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '-',
                }));
                setTasks(formattedTasks);
            } catch (err) {
                console.error('Failed to fetch tasks:', err);
                setError('Gagal memuat data. Periksa koneksi internet Anda.');
            } finally {
                setLoading(false);
            }
        };

        fetchTasks();
    }, []);

    const handleDelete = async (taskId) => {
        if (!confirm('Hapus tugas ini? Data akan hilang permanen.')) return;
        try {
            await deleteTask(taskId);
            setTasks(prev => prev.filter(t => t.id !== taskId));
            alert('Tugas berhasil dihapus.');
        } catch (err) {
            console.error('Delete failed:', err);
            alert('Gagal menghapus tugas.');
        }
    };

    const filteredTasks = tasks.filter(task =>
        task.type === activeTab &&
        (task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            task.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const pendingCount = tasks.filter(t => t.type === 'incoming' && t.status === 'Pending').length;

    if (loading) {
        return (
            <div className="dashboard-page flex justify-center items-center h-screen">
                <Loader2 className="animate-spin text-primary" size={32} />
            </div>
        );
    }

    if (error) {
        return (
            <div className="dashboard-page flex flex-col justify-center items-center h-screen gap-4">
                <p className="text-red-500">{error}</p>
                <button onClick={() => window.location.reload()} className="btn btn-primary">Coba Lagi</button>
            </div>
        );
    }

    return (
        <div className="dashboard-page">
            <header className="page-header">
                <h2>Halo, {currentUser?.name || 'User'}</h2>
                <p className="subtitle">
                    {pendingCount > 0
                        ? `Anda memiliki ${pendingCount} tugas masuk yang perlu perhatian.`
                        : 'Semua tugas telah selesai, kerja bagus!'}
                </p>
            </header>

            <div className="search-container">
                <Search className="search-icon" size={20} />
                <input
                    type="text"
                    placeholder="Cari tugas, surat, atau disposisi..."
                    className="search-input"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            <div className="tabs-container">
                <button
                    className={`tab-btn ${activeTab === 'incoming' ? 'active' : ''}`}
                    onClick={() => setActiveTab('incoming')}
                >
                    Tugas Masuk
                </button>
                <button
                    className={`tab-btn ${activeTab === 'outgoing' ? 'active' : ''}`}
                    onClick={() => setActiveTab('outgoing')}
                >
                    Delegasi Keluar
                </button>
            </div>

            <div className="flex justify-end px-4 mb-2">
                <Link to="/history" className="text-sm text-primary font-medium flex items-center gap-1">
                    Lihat Semua Riwayat <ArrowRight size={16} />
                </Link>
            </div>

            <div className="task-list animate-fade-in">
                {filteredTasks.length > 0 ? (
                    filteredTasks.map(task => (
                        <TaskCard
                            key={task.id}
                            task={task}
                            currentUser={currentUser}
                            onDelete={handleDelete}
                        />
                    ))
                ) : (
                    <div className="empty-state">
                        <div className="empty-icon">📂</div>
                        <p>Tidak ada tugas ditemukan pada tab ini.</p>
                    </div>
                )}
            </div>

            <Link to="/create" className="fab" aria-label="Buat Tugas Baru">
                <Plus size={28} />
            </Link>
        </div>
    );
};

export default Dashboard;
