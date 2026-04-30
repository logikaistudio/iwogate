import React, { useState, useEffect } from 'react';
import { Search, Plus, Loader2, ArrowRight, Bell, X } from 'lucide-react';
import TaskCard from '../components/TaskCard';
import { Link } from 'react-router-dom';
import { getTasks, deleteTask, getNotifications, markNotificationRead } from '../lib/api.js';
import './Dashboard.css';

const Dashboard = () => {
    const [activeTab, setActiveTab] = useState('incoming');
    const [searchQuery, setSearchQuery] = useState('');
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [offset, setOffset] = useState(0);
    const [limit] = useState(20);
    const [loadingMore, setLoadingMore] = useState(false);

    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [notifOpen, setNotifOpen] = useState(false);

    const [currentUser, setCurrentUser] = useState(null);

    const fetchTasks = async ({ reset = true, off = 0 } = {}) => {
        const userStr = sessionStorage.getItem('iwogate_user');
        const user = userStr ? JSON.parse(userStr) : null;
        if (!user) {
            setLoading(false);
            return;
        }

        try {
            const result = await getTasks({
                userId: user.id,
                userRole: user.role,
                userDept: user.department,
                limit,
                offset: off,
            });
            const formattedTasks = result.tasks.map(task => ({
                ...task,
                assignedBy: task.type === 'outgoing' ? 'Saya' : (task.assigned_by_name ? `${task.assigned_by_name} (${task.assigned_by_dept})` : 'System'),
                dueDate: task.due_date ? new Date(task.due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '-',
            }));
            if (reset) setTasks(formattedTasks);
            else setTasks(prev => [...prev, ...formattedTasks]);
            setOffset(off + formattedTasks.length);
        } catch (err) {
            console.error('Failed to fetch tasks:', err);
            setError('Gagal memuat data. Periksa koneksi internet Anda.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
            const userStr = sessionStorage.getItem('iwogate_user');
        const user = userStr ? JSON.parse(userStr) : null;
        if (user) {
            setCurrentUser(user);
        }
        fetchTasks();
        // initial notifications fetch and polling
        let mounted = true;
        const fetchNotifs = async () => {
            try {
                const res = await getNotifications();
                if (!mounted) return;
                setNotifications(res.notifications || []);
                setUnreadCount((res.notifications || []).filter(n => !n.is_read).length);
            } catch (e) {
                console.error('Failed to fetch notifications', e);
            }
        };
        fetchNotifs();
        const pollId = setInterval(fetchNotifs, 15000);

        return () => {
            mounted = false;
            clearInterval(pollId);
        };
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

    const loadMore = async () => {
        setLoadingMore(true);
        const userStr = sessionStorage.getItem('iwogate_user');
        const user = userStr ? JSON.parse(userStr) : null;
        try {
            await fetchTasks({ reset: false, off: offset });
        } catch (e) {
            console.error('Load more failed', e);
        } finally {
            setLoadingMore(false);
        }
    };

    const openNotifications = () => {
        setNotifOpen(!notifOpen);
    };

    const markRead = async (id) => {
        try {
            await markNotificationRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (e) {
            console.error('Failed to mark read', e);
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div>
                        <h2>Halo, {currentUser?.name || 'User'}</h2>
                        <p className="subtitle">
                            {pendingCount > 0
                                ? `Anda memiliki ${pendingCount} tugas masuk yang perlu perhatian.`
                                : 'Semua tugas telah selesai, kerja bagus!'}
                        </p>
                    </div>
                    <div style={{ marginLeft: 'auto', position: 'relative' }}>
                        <button className="notif-btn" onClick={openNotifications} aria-label="Notifikasi">
                            <Bell />
                            {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
                        </button>
                        {notifOpen && (
                            <div className="notif-panel">
                                <div className="notif-panel-header">
                                    <strong>Notifikasi</strong>
                                    <button onClick={() => setNotifOpen(false)}><X /></button>
                                </div>
                                <div className="notif-list">
                                    {notifications.length === 0 ? (
                                        <div className="p-4">Tidak ada notifikasi</div>
                                    ) : (
                                        notifications.map(n => (
                                            <div key={n.id} className={`notif-item ${n.is_read ? 'read' : 'unread'}`}>
                                                <div className="notif-message">{n.message}</div>
                                                <div className="notif-meta">
                                                    <small>{new Date(n.created_at).toLocaleString()}</small>
                                                    {!n.is_read && <button onClick={() => markRead(n.id)}>Tandai terbaca</button>}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
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

            {tasks.length >= limit && (
                <div className="load-more-wrap">
                    <button onClick={loadMore} className="btn-secondary" disabled={loadingMore}>
                        {loadingMore ? 'Memuat...' : 'Muat Lagi'}
                    </button>
                </div>
            )}

            <Link to="/create" className="fab" aria-label="Buat Tugas Baru">
                <Plus size={28} />
            </Link>
        </div>
    );
};

export default Dashboard;
