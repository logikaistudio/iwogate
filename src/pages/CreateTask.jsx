import React, { useState, useEffect } from 'react';
import { Upload, X, ArrowLeft, Paperclip, Loader2, Plus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getUsers, createTasks, getDepartments } from '../lib/api.js';
import './CreateTask.css';

const TASK_OPTIONS = [
    'UMP', 'UDK/ Monitor', 'UDL', 'Proses', 'Pelajari', 
    'Sarankan', 'Koordinasikan', 'ACC', 'Tanggapi/ Saran', 'Bantu', 
    'Wakili', 'Ingatkan', 'Infokan', 'File', 'Hadir/ Tidak Hadir', 
    'Acarakan', 'Siapkan', 'Bahas/ Rapatkan', 'Tindak Lanjuti', 'Buat Jawaban'
];

const CreateTask = () => {
    const navigate = useNavigate();

    // Task Rows State: [{ id, title, assigneeDesc, deadline, selectedTasks }]
    const [taskRows, setTaskRows] = useState([
        { id: 1, title: '', selectedAssignees: [], deadline: '', selectedTasks: [] }
    ]);

    const [desc, setDesc] = useState('');
    const [refNo, setRefNo] = useState('');
    const [docDate, setDocDate] = useState('');
    const [sender, setSender] = useState('');
    const [files, setFiles] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    // Assignees List (Departments + Users)
    const [assignees, setAssignees] = useState([]);

    useEffect(() => {
        const userStr = sessionStorage.getItem('iwogate_user');
        const user = userStr ? JSON.parse(userStr) : null;
        setCurrentUser(user);

        const fetchAssignees = async () => {
            try {
                const [result, deptResult] = await Promise.all([getUsers(), getDepartments()]);
                const users = result.users.filter((u) => u.id !== (user?.id || 0));

                let filteredResult = users;
                if (user?.role === 'staff' || user?.role === 'staf') {
                    filteredResult = users.filter(
                        (u) => ['director', 'direktur', 'admin', 'superuser'].includes(u.role)
                    );
                }

                const userOptions = filteredResult.map((u) => ({
                    value: `user:${u.id}`,
                    label: `${u.name} (${u.role === 'director' ? 'Direktur' : u.department || u.role})`,
                    type: 'user',
                    dept: u.department,
                    id: u.id,
                }));

                // Build dept options dynamically from DB
                const deptOptions = deptResult.departments.map((dept) => ({
                    value: `dept:${dept.name}`,
                    label: dept.label,
                    type: 'dept',
                    dept: dept.name,
                }));

                if (user?.role === 'staff' || user?.role === 'staf') {
                    setAssignees([...userOptions]);
                } else {
                    setAssignees([...deptOptions, ...userOptions]);
                }
            } catch (err) {
                console.error('Failed to fetch assignees:', err);
            }
        };
        fetchAssignees();
    }, []);

    const handleFileChange = (e) => {
        if (e.target.files) {
            const rawFiles = Array.from(e.target.files);
            const validFiles = rawFiles.filter(file => {
                if (file.size > 5 * 1024 * 1024) {
                    alert(`File ${file.name} terlalu besar (>5MB).`);
                    return false;
                }
                return true;
            });
            setFiles([...files, ...validFiles]);
        }
    };

    const removeFile = (index) => {
        setFiles(files.filter((_, i) => i !== index));
    };

    const fileToDataURL = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const addTaskRow = () => {
        setTaskRows([...taskRows, { id: Date.now(), title: '', selectedAssignees: [], deadline: '', selectedTasks: [] }]);
    };

    const removeTaskRow = (id) => {
        if (taskRows.length > 1) {
            setTaskRows(taskRows.filter(r => r.id !== id));
        }
    };

    const updateTaskRow = (id, field, value) => {
        setTaskRows(taskRows.map(r => r.id === id ? { ...r, [field]: value } : r));
    };

    const toggleTaskOption = (rowId, option) => {
        setTaskRows(taskRows.map(r => {
            if (r.id === rowId) {
                const isSelected = r.selectedTasks.includes(option);
                const nextSelected = isSelected 
                    ? r.selectedTasks.filter(o => o !== option)
                    : [...r.selectedTasks, option];
                return { ...r, selectedTasks: nextSelected };
            }
            return r;
        }));
    };

    const toggleAssignee = (rowId, assigneeValue) => {
        setTaskRows(taskRows.map(r => {
            if (r.id === rowId) {
                const current = r.selectedAssignees || [];
                const isSelected = current.includes(assigneeValue);
                const next = isSelected 
                    ? current.filter(v => v !== assigneeValue)
                    : [...current, assigneeValue];
                return { ...r, selectedAssignees: next };
            }
            return r;
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Basic validation
        const invalidRow = taskRows.find(r => 
            ((r.selectedTasks || []).length === 0 && !r.title) || 
            (r.selectedAssignees || []).length === 0 || 
            !r.deadline
        );
        if (invalidRow) {
            alert("Mohon lengkapi semua baris tugas (Pilih Tugas/Isi Judul, Pilih Minimal 1 Penerima, Tenggat).");
            return;
        }

        setIsSubmitting(true);

        try {
            const attachmentData = [];
            if (files.length > 0) {
                for (const file of files) {
                    let fileType = 'doc';
                    if (file.type.includes('pdf')) fileType = 'pdf';
                    else if (file.type.includes('image')) fileType = 'img';

                    const sizeInMB = (file.size / (1024 * 1024)).toFixed(1);
                    let fileUrl = '#';

                    if (file.size < 5 * 1024 * 1024) {
                        try {
                            fileUrl = await fileToDataURL(file);
                        } catch (readErr) {
                            console.error('Failed to read file', readErr);
                        }
                    }

                    attachmentData.push({
                        name: file.name,
                        type: fileType,
                        size: sizeInMB + ' MB',
                        url: fileUrl,
                    });
                }
            }

            // Process multiple assignees per row
            const payloadTasks = [];
            taskRows.forEach((row) => {
                let finalTitle = (row.selectedTasks || []).join(', ');
                if (row.title) {
                    finalTitle = finalTitle ? `${finalTitle} - ${row.title}` : row.title;
                }

                row.selectedAssignees.forEach(assigneeValue => {
                    const assigneeOption = assignees.find((a) => a.value === assigneeValue);
                    let assignedToDept = 'General';
                    let assignedToUserId = null;

                    if (assigneeOption) {
                        assignedToDept = assigneeOption.dept;
                        if (assigneeOption.type === 'user') {
                            assignedToUserId = parseInt(assigneeOption.value.split(':')[1], 10);
                        }
                    }

                    payloadTasks.push({
                        title: finalTitle,
                        assigned_to_dept: assignedToDept,
                        assigned_to_user_id: assignedToUserId,
                        due_date: row.deadline,
                    });
                });
            });

            await createTasks({
                tasks: payloadTasks,
                desc,
                refNo,
                docDate,
                sender,
                attachments: attachmentData,
            });

            navigate('/history'); // Redirect to history list to see the bulk creation

        } catch (err) {
            console.error("Failed to create tasks:", err);
            alert("Gagal membuat tugas. Silakan coba lagi.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="create-page animate-fade-in" style={{ paddingBottom: '4rem' }}>
            <header className="page-header simple-header">
                <button onClick={() => navigate(-1)} className="back-btn">
                    <ArrowLeft size={24} />
                </button>
                <h2>Delegasi Multi-Tugas</h2>
            </header>

            <form className="create-form" onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="form-group">
                        <label>No. Surat / Diagenda</label>
                        <input
                            type="text"
                            placeholder="Contoh: 001/HR/2026"
                            value={refNo}
                            onChange={(e) => setRefNo(e.target.value)}
                            className="bg-white"
                        />
                    </div>
                    <div className="form-group">
                        <label>Tanggal Surat</label>
                        <input
                            type="date"
                            value={docDate}
                            onChange={(e) => setDocDate(e.target.value)}
                            className="bg-white"
                        />
                    </div>
                    <div className="form-group">
                        <label>Pengirim (Asal Surat)</label>
                        <input
                            type="text"
                            placeholder="Contoh: Kementerian Kesehatan"
                            value={sender}
                            onChange={(e) => setSender(e.target.value)}
                            className="bg-white"
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label>Deskripsi & Instruksi Umum (Opsional)</label>
                    <textarea
                        rows="3"
                        placeholder="Deskripsi ini akan diterapkan untuk semua tugas di bawah..."
                        value={desc}
                        onChange={(e) => setDesc(e.target.value)}
                        style={{ fontSize: '0.9rem' }}
                    ></textarea>
                </div>

                <div className="form-group">
                    <label>Daftar Tugas</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {taskRows.map((row, index) => (
                            <div key={row.id} className="task-row-card" style={{
                                background: '#f8fafc',
                                padding: '1rem',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border)',
                                position: 'relative'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--secondary)' }}>Tugas #{index + 1}</span>
                                    {taskRows.length > 1 && (
                                        <button type="button" onClick={() => removeTaskRow(row.id)} style={{ color: '#ef4444' }}>
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>

                                <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--secondary)', marginBottom: '0.25rem' }}>Pilih Tugas :</label>
                                    <div className="task-options-grid">
                                        {TASK_OPTIONS.map(opt => (
                                            <button
                                                key={opt}
                                                type="button"
                                                onClick={() => toggleTaskOption(row.id, opt)}
                                                className={`option-pill ${(row.selectedTasks || []).includes(opt) ? 'active' : ''}`}
                                            >
                                                {opt}
                                            </button>
                                        ))}
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Judul / Catatan Tambahan (Opsional jika sudah pilih tugas)"
                                        value={row.title}
                                        onChange={(e) => updateTaskRow(row.id, 'title', e.target.value)}
                                        style={{ background: 'white', marginTop: '0.5rem' }}
                                    />
                                </div>

                                 <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                                    <div style={{ flex: 1 }}>
                                        <div className="multi-assignee-select">
                                            <div className="selected-tags">
                                                {(row.selectedAssignees || []).length === 0 ? (
                                                    <span className="placeholder">Pilih Penerima...</span>
                                                ) : (
                                                    row.selectedAssignees.map(val => {
                                                        const opt = assignees.find(a => a.value === val);
                                                        return (
                                                            <div key={val} className="assignee-tag">
                                                                {opt?.label}
                                                                <button type="button" onClick={() => toggleAssignee(row.id, val)}><X size={12}/></button>
                                                            </div>
                                                        );
                                                    })
                                                )}
                                            </div>
                                            <div className="assignee-dropdown">
                                                <div className="dropdown-section">Satu Departemen</div>
                                                {assignees.filter(a => a.type === 'dept').map(a => (
                                                    <div key={a.value} className="dropdown-item" onClick={() => toggleAssignee(row.id, a.value)}>
                                                        <input type="checkbox" checked={row.selectedAssignees.includes(a.value)} readOnly />
                                                        <span>{a.label}</span>
                                                    </div>
                                                ))}
                                                <div className="dropdown-section">Staff Spesifik</div>
                                                {assignees.filter(a => a.type === 'user').map(a => (
                                                    <div key={a.value} className="dropdown-item" onClick={() => toggleAssignee(row.id, a.value)}>
                                                        <input type="checkbox" checked={row.selectedAssignees.includes(a.value)} readOnly />
                                                        <span>{a.label}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ width: '130px' }}>
                                        <input
                                            type="date"
                                            value={row.deadline}
                                            onChange={(e) => updateTaskRow(row.id, 'deadline', e.target.value)}
                                            required
                                            style={{ background: 'white', fontSize: '0.85rem' }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <button type="button" onClick={addTaskRow} className="btn-secondary" style={{
                    width: '100%',
                    padding: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    borderStyle: 'dashed'
                }}>
                    <Plus size={18} /> Tambah Baris Tugas
                </button>

                <div className="form-group" style={{ marginTop: '1rem' }}>
                    <label>Lampiran (Untuk Semua Tugas)</label>
                    <div className="upload-area" style={{ padding: '1rem' }}>
                        <input
                            type="file"
                            multiple
                            accept="image/*,.pdf"
                            id="file-upload"
                            onChange={handleFileChange}
                            hidden
                        />
                        <label htmlFor="file-upload" className="upload-label" style={{ flexDirection: 'row', gap: '1rem' }}>
                            <div className="upload-icon-wrapper" style={{ width: '32px', height: '32px', marginBottom: 0 }}>
                                <Upload className="text-primary" size={18} />
                            </div>
                            <div style={{ textAlign: 'left' }}>
                                <span className="upload-text" style={{ fontSize: '0.9rem', marginBottom: 0 }}>Upload File</span>
                                <small className="upload-hint" style={{ display: 'block' }}>PDF, JPG, PNG</small>
                            </div>
                        </label>
                    </div>
                </div>

                {files.length > 0 && (
                    <div className="file-list">
                        {files.map((file, idx) => (
                            <div key={idx} className="file-item">
                                <div className="file-info">
                                    <Paperclip size={16} className="text-muted" />
                                    <span className="file-name">{file.name}</span>
                                </div>
                                <button type="button" onClick={() => removeFile(idx)} className="remove-btn">
                                    <X size={18} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <button
                    className={`submit-btn ${isSubmitting ? 'loading' : ''}`}
                    disabled={isSubmitting}
                    style={{ position: 'fixed', bottom: '1rem', left: '1rem', right: '1rem', width: 'auto', zIndex: 50, shadow: 'var(--shadow-lg)' }}
                >
                    {isSubmitting ? (
                        <span className="flex items-center gap-2 justify-center">
                            <Loader2 className="animate-spin" size={20} /> Mengirim {taskRows.length} Tugas...
                        </span>
                    ) : `Kirim ${taskRows.length} Delegasi`}
                </button>
            </form>
        </div>
    );
};

export default CreateTask;
