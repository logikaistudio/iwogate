import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, User, Download, CheckCircle, XCircle, FileText, Loader2, ArrowRightCircle, Trash2 } from 'lucide-react';
import { getTask, deleteTask, taskAction, getUsers } from '../lib/api.js';
import './TaskDetail.css';

const TaskDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [task, setTask] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [updating, setUpdating] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    // Action Modal State
    const [modal, setModal] = useState({ open: false, type: '', title: '' });
    const [reason, setReason] = useState(''); // Rejection reason or completion note

    // Delegation State
    const [users, setUsers] = useState([]);
    const [selectedDelegate, setSelectedDelegate] = useState('');

    useEffect(() => {
        const userStr = sessionStorage.getItem('iwogate_user');
        if (userStr) {
            setCurrentUser(JSON.parse(userStr));
        }

        const fetchData = async () => {
            try {
                const response = await getTask(id);
                const taskData = response.task;
                if (!taskData) {
                    setError('Tugas tidak ditemukan.');
                    return;
                }

                setTask({
                    ...taskData,
                    assignedBy: taskData.type === 'outgoing' ? 'Saya' : `${taskData.assigned_by_name} (${taskData.assigned_by_dept})`,
                    assignedTo: taskData.assigned_to_user_id ? taskData.assigned_to_name : taskData.assigned_to_dept,
                    dueDate: taskData.due_date ? new Date(taskData.due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-',
                    attachments: taskData.attachments.map(att => ({ ...att, url: att.file_url })),
                    logs: taskData.logs.map(l => ({ ...l, date: new Date(l.created_at).toLocaleString('id-ID') })),
                });

                const usersResponse = await getUsers();
                setUsers(usersResponse.users.filter((u) => u.id !== (parseInt(userStr ? JSON.parse(userStr).id : 0, 10) || 0)));
            } catch (err) {
                console.error(err);
                setError('Gagal memuat data.');
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchData();
    }, [id]);

    const handleDelete = async () => {
        if (!confirm('PERINGATAN: Apakah Anda yakin ingin menghapus tugas ini secara permanen? Aksi ini tidak dapat dibatalkan.')) return;
        try {
            setUpdating(true);
            await deleteTask(id);
            alert('Tugas berhasil dihapus.');
            navigate('/');
        } catch (err) {
            console.error('Delete failed:', err);
            alert('Gagal menghapus tugas: ' + err.message);
        } finally {
            setUpdating(false);
        }
    };

    const openModal = (type) => {
        setModal({
            open: true,
            type,
            title: type === 'reject' ? 'Tolak Tugas' : (type === 'delegate' ? 'Redelegasi / Teruskan Tugas' : 'Selesaikan Tugas')
        });
        setReason('');
        setSelectedDelegate('');
    };

    const handleActionSubmit = async () => {
        if (modal.type === 'reject' && !reason.trim()) {
            alert('Harap isi alasan penolakan.');
            return;
        }
        if (modal.type === 'delegate' && !selectedDelegate) {
            alert('Harap pilih penerima delegasi.');
            return;
        }

        setUpdating(true);
        try {
            const currentUserId = currentUser?.id || 1;
            await taskAction(id, {
                type: modal.type,
                reason,
                targetUserId: selectedDelegate,
                currentUserId,
            });
            alert(modal.type === 'delegate' ? 'Tugas berhasil didelegasikan.' : 'Tugas berhasil diperbarui.');
            navigate('/');
        } catch (err) {
            console.error(err);
            alert('Gagal memproses aksi.');
        } finally {
            setUpdating(false);
            setModal({ open: false, type: '', title: '' });
        }
    };

    if (loading) return <div className="detail-page flex justify-center items-center h-screen"><Loader2 className="animate-spin text-primary" size={32} /></div>;
    if (error) return <div className="detail-page p-4 text-center text-red-500">{error} <br /><button onClick={() => navigate('/')} className="mt-4 underline">Kembali</button></div>;
    if (!task) return null;

    const canDelete = currentUser?.role === 'admin' || currentUser?.role === 'superuser';

    return (
        <div className="detail-page animate-fade-in relative">
            <header className="page-header simple-header flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <button onClick={() => navigate(-1)} className="back-btn">
                        <ArrowLeft size={24} />
                    </button>
                    <h2>Detail Tugas</h2>
                </div>
                {canDelete && (
                    <button
                        onClick={handleDelete}
                        className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-50 transition-colors"
                        title="Hapus Tugas (Admin Only)"
                    >
                        <Trash2 size={24} />
                    </button>
                )}
            </header>

            <div className="task-detail-card mb-6">
                <div className="detail-top">
                    <span className={`status-badge status-${task.status.toLowerCase().replace(' ', '')}`}>
                        {task.status}
                    </span>
                    <span className="due-date">
                        <Calendar size={16} /> {task.dueDate}
                    </span>
                </div>

                <h1 className="detail-title">{task.title}</h1>

                <div className="detail-meta-box">
                    <div className="meta-row">
                        <span className="meta-label">Dari:</span>
                        <div className="meta-value"><User size={16} /> {task.assignedBy}</div>
                    </div>
                    <div className="meta-row">
                        <span className="meta-label">Kepada:</span>
                        <div className="meta-value"><User size={16} /> {task.assignedTo}</div>
                    </div>
                </div>

                <div className="detail-section">
                    <h3>Deskripsi</h3>
                    <p className="detail-desc">{task.description}</p>
                </div>

                {task.attachments.length > 0 && (
                    <div className="detail-section">
                        <h3>Lampiran ({task.attachments.length})</h3>
                        <div className="attachment-list">
                            {task.attachments.map((file, idx) => (
                                <div key={idx} className="attachment-item">
                                    <div className={`file-type-icon ${file.file_type}`}>
                                        <FileText size={20} />
                                    </div>
                                    <div className="file-details">
                                        <span className="file-name">{file.file_name}</span>
                                        <span className="file-size">{file.file_size}</span>
                                    </div>
                                    <a href={file.url} download={file.file_name} className="download-btn" target="_blank" rel="noopener noreferrer">
                                        <Download size={20} />
                                    </a>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* History Logs */}
            {task.logs && task.logs.length > 0 && (
                <div className="task-detail-card mb-20 log-container">
                    <h3 className="font-bold mb-4 text-lg">Riwayat Aktivitas</h3>
                    <div className="flex flex-col gap-4">
                        {task.logs.map((log, idx) => (
                            <div key={idx} className="log-item">
                                <p className="log-header">
                                    {log.action.toUpperCase()} <span className="log-date">• {log.date}</span>
                                </p>
                                <p className="log-user">Oleh: {log.user_name || 'System'}</p>
                                {log.note && <p className="log-note">"{log.note}"</p>}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Action Bar */}
            {!modal.open && task.status !== 'Completed' && task.status !== 'Rejected' && (
                <div className="action-bar saved-safe-area flex">
                    <button onClick={() => openModal('reject')} className="action-btn btn-reject text-sm">
                        <XCircle size={18} /> Tolak
                    </button>
                    <button onClick={() => openModal('delegate')} className="action-btn btn-delegate text-white text-sm">
                        <ArrowRightCircle size={18} /> Redelegasi
                    </button>
                    <button onClick={() => openModal('complete')} className="action-btn btn-approve text-sm">
                        <CheckCircle size={18} /> Selesai
                    </button>
                </div>
            )}

            {/* Action Modal Overlay */}
            {modal.open && (
                <div className="fixed inset-0 bg-black/50 z-[1100] flex items-end sm:items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white w-full max-w-md rounded-xl p-6 shadow-2xl mb-4 sm:mb-0">
                        <h3 className="text-lg font-bold mb-4">{modal.title}</h3>

                        {modal.type === 'delegate' ? (
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-1">Pilih Penerima</label>
                                <select
                                    className="w-full p-2 border rounded-lg"
                                    value={selectedDelegate}
                                    onChange={(e) => setSelectedDelegate(e.target.value)}
                                >
                                    <option value="">-- Pilih Staff --</option>
                                    {users.map(u => (
                                        <option key={u.id} value={u.id}>{u.name} ({u.department})</option>
                                    ))}
                                </select>
                            </div>
                        ) : null}

                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-1">
                                {modal.type === 'reject' ? 'Alasan Penolakan (Wajib)' : 'Catatan / Deskripsi (Opsional)'}
                            </label>
                            <textarea
                                className="w-full p-3 border rounded-lg h-24"
                                placeholder={modal.type === 'reject' ? "Contoh: Tidak sesuai dengan tupoksi..." : "Tulis catatan..."}
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                            ></textarea>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setModal({ ...modal, open: false })}
                                className="flex-1 py-2 rounded-lg border border-slate-300 font-medium hover:bg-slate-50 transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleActionSubmit}
                                disabled={updating}
                                className={`flex-1 py-2 rounded-lg font-medium text-white flex justify-center items-center gap-2
                                    ${modal.type === 'reject' ? 'bg-red-600 hover:bg-red-700' : 'bg-primary hover:bg-blue-700'}
                                    transition-colors
                                `}
                            >
                                {updating && <Loader2 className="animate-spin" size={16} />}
                                Konfirmasi
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TaskDetail;
