import { sql } from '../lib/db.js';

const formatTask = (task) => ({
  ...task,
  assigned_by_name: task.assigned_by_name || null,
  assigned_by_dept: task.assigned_by_dept || null,
  assigned_to_name: task.assigned_to_name || null,
  assigned_to_dept: task.assigned_to_dept || null,
});

const parseIntSafe = (value) => {
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const isPrivilegedUser = (role) => ['superuser', 'admin'].includes((role || '').toLowerCase());

const canAccessTask = (task, userId, userRole, userDept) => {
  if (isPrivilegedUser(userRole)) {
    return true;
  }
  if (!userId) {
    return false;
  }
  if (task.assigned_by_user_id === userId) {
    return true;
  }
  if (task.assigned_to_user_id === userId) {
    return true;
  }
  if (!task.assigned_to_user_id && task.assigned_to_dept && userDept && task.assigned_to_dept === userDept) {
    return true;
  }
  return false;
};

const loadTasks = async () => {
  const tasks = await sql`
    SELECT
      t.*,
      u.name AS assigned_by_name,
      u.department AS assigned_by_dept,
      au.name AS assigned_to_name,
      au.department AS assigned_to_dept
    FROM tasks t
    LEFT JOIN users u ON t.assigned_by_user_id = u.id
    LEFT JOIN users au ON t.assigned_to_user_id = au.id
    ORDER BY t.created_at DESC
  `;
  return tasks.map(formatTask);
};

const loadTask = async (id) => {
  const [task] = await sql`
    SELECT
      t.*,
      u.name AS assigned_by_name,
      u.department AS assigned_by_dept,
      au.name AS assigned_to_name,
      au.department AS assigned_to_dept
    FROM tasks t
    LEFT JOIN users u ON t.assigned_by_user_id = u.id
    LEFT JOIN users au ON t.assigned_to_user_id = au.id
    WHERE t.id = ${id}
    LIMIT 1
  `;
  if (!task) return null;
  const attachments = await sql`SELECT * FROM attachments WHERE task_id = ${id}`;
  const logs = await sql`
    SELECT tl.*, u.name AS user_name
    FROM task_logs tl
    LEFT JOIN users u ON tl.user_id = u.id
    WHERE tl.task_id = ${id}
    ORDER BY tl.created_at DESC
  `;
  return {
    ...formatTask(task),
    attachments,
    logs: logs.map((log) => ({ ...log, date: log.created_at })),
  };
};

export const setupTaskRoutes = (app) => {
  app.get('/api/tasks', async (req, res) => {
    try {
      const userId = parseIntSafe(req.query.userId);
      const userRole = req.query.userRole;
      const userDept = req.query.userDept;
      const allTasks = await loadTasks();
      let filtered = allTasks;

      if (!isPrivilegedUser(userRole)) {
        filtered = filtered.filter((task) => canAccessTask(task, userId, userRole, userDept));
      }

      if (req.query.type) {
        filtered = filtered.filter((task) => task.type === req.query.type);
      }
      if (req.query.status) {
        filtered = filtered.filter((task) => task.status === req.query.status);
      }
      if (req.query.search) {
        const search = req.query.search.toLowerCase();
        filtered = filtered.filter(
          (task) =>
            task.title.toLowerCase().includes(search) ||
            task.description.toLowerCase().includes(search) ||
            (task.assigned_to_name || task.assigned_to_dept || '')
              .toLowerCase()
              .includes(search)
        );
      }
      return res.json({ tasks: filtered });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Gagal memuat tugas.' });
    }
  });

  app.get('/api/tasks/:id', async (req, res) => {
    try {
      const userId = parseIntSafe(req.query.userId);
      const userRole = req.query.userRole;
      const userDept = req.query.userDept;
      const task = await loadTask(req.params.id);
      if (!task) return res.status(404).json({ message: 'Tugas tidak ditemukan.' });
      if (!canAccessTask(task, userId, userRole, userDept)) {
        return res.status(403).json({ message: 'Akses ditolak untuk tugas ini.' });
      }
      return res.json({ task });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Gagal memuat detail tugas.' });
    }
  });

  app.post('/api/tasks', async (req, res) => {
    const { tasks, desc, refNo, docDate, sender, attachments, assignedById } = req.body;
    if (!Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({ message: 'Daftar tugas tidak boleh kosong.' });
    }

    try {
      const created = [];
      for (const row of tasks) {
        if (!row.title || !row.assigned_to_dept || !row.due_date) {
          continue;
        }
        const [newTask] = await sql`
          INSERT INTO tasks (
            title,
            description,
            assigned_by_user_id,
            assigned_to_dept,
            assigned_to_user_id,
            status,
            due_date,
            type,
            reference_no,
            document_date,
            sender_info
          ) VALUES (
            ${row.title},
            ${desc || ''},
            ${assignedById || null},
            ${row.assigned_to_dept},
            ${row.assigned_to_user_id || null},
            'Pending',
            ${row.due_date},
            'outgoing',
            ${refNo || null},
            ${docDate || null},
            ${sender || null}
          ) RETURNING *
        `;

        if (newTask && Array.isArray(attachments) && attachments.length > 0) {
          for (const att of attachments) {
            await sql`
              INSERT INTO attachments (task_id, file_name, file_type, file_size, file_url)
              VALUES (${newTask.id}, ${att.name}, ${att.type}, ${att.size}, ${att.url})
            `;
          }
        }
        created.push(newTask);
      }
      return res.json({ tasks: created });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Gagal membuat tugas.' });
    }
  });

  app.delete('/api/tasks/:id', async (req, res) => {
    try {
      await sql`DELETE FROM tasks WHERE id = ${req.params.id}`;
      return res.json({ message: 'Tugas berhasil dihapus.' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Gagal menghapus tugas.' });
    }
  });

  app.post('/api/tasks/:id/action', async (req, res) => {
    const { type, reason, targetUserId } = req.body;
    if (!type) {
      return res.status(400).json({ message: 'Tipe aksi tidak ditentukan.' });
    }

    try {
      const currentUserId = req.body.currentUserId || null;
      if (type === 'delegate') {
        const [target] = await sql`SELECT * FROM users WHERE id = ${targetUserId} LIMIT 1`;
        if (!target) {
          return res.status(400).json({ message: 'Penerima delegasi tidak ditemukan.' });
        }
        await sql`
          UPDATE tasks
          SET assigned_to_user_id = ${targetUserId}, assigned_to_dept = ${target.department}, assigned_by_user_id = ${currentUserId}
          WHERE id = ${req.params.id}
        `;
        await sql`
          INSERT INTO task_logs (task_id, user_id, action, note)
          VALUES (${req.params.id}, ${currentUserId}, 'delegated', ${`Mendelegasikan ke ${target.name}. Catatan: ${reason || ''}`})
        `;
        return res.json({ message: 'Tugas berhasil didelegasikan.' });
      }

      const status = type === 'reject' ? 'Rejected' : 'Completed';
      const action = type === 'reject' ? 'rejected' : 'completed';
      await sql`
        UPDATE tasks
        SET status = ${status}, outcome = ${reason || null}
        WHERE id = ${req.params.id}
      `;
      await sql`
        INSERT INTO task_logs (task_id, user_id, action, note)
        VALUES (${req.params.id}, ${currentUserId}, ${action}, ${reason || null})
      `;
      return res.json({ message: 'Tugas berhasil diperbarui.' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Gagal memproses aksi tugas.' });
    }
  });
};