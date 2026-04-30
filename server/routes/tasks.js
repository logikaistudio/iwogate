import { sql } from '../lib/db.js';
import { triggerNotification } from '../lib/pusher.js';

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
      const user = req.user;

      // Pagination
      const limit = Math.min(parseInt(req.query.limit || '100', 10) || 100, 1000);
      const offset = parseInt(req.query.offset || '0', 10) || 0;

      // Build base filters from query params
      const typeFilter = req.query.type || null;
      const statusFilter = req.query.status || null;
      const search = req.query.search ? `%${req.query.search.toLowerCase()}%` : null;

      // Privileged users see all tasks (but can still apply filters)
      if (isPrivilegedUser(user.role)) {
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
          WHERE (${typeFilter ? sql`${typeFilter}` : sql`TRUE`} IS TRUE) 
            AND (${statusFilter ? sql`${statusFilter}` : sql`TRUE`} IS TRUE)
            ${search ? sql`AND (LOWER(t.title) LIKE ${search} OR LOWER(t.description) LIKE ${search} OR LOWER(COALESCE(au.name, au.department, '')) LIKE ${search})` : sql``}
          ORDER BY t.created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
        return res.json({ tasks: tasks.map(formatTask) });
      }

      // Non-privileged: restrict by assigned_by, assigned_to, or assigned_to_dept
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
        WHERE (
          t.assigned_by_user_id = ${user.id}
          OR t.assigned_to_user_id = ${user.id}
          OR (t.assigned_to_user_id IS NULL AND t.assigned_to_dept = ${user.department})
        )
        ${typeFilter ? sql`AND t.type = ${typeFilter}` : sql``}
        ${statusFilter ? sql`AND t.status = ${statusFilter}` : sql``}
        ${search ? sql`AND (LOWER(t.title) LIKE ${search} OR LOWER(t.description) LIKE ${search} OR LOWER(COALESCE(au.name, au.department, '')) LIKE ${search})` : sql``}
        ORDER BY t.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      return res.json({ tasks: tasks.map(formatTask) });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Gagal memuat tugas.' });
    }
  });

  app.get('/api/tasks/:id', async (req, res) => {
    try {
      const user = req.user;
      const task = await loadTask(req.params.id);
      if (!task) return res.status(404).json({ message: 'Tugas tidak ditemukan.' });
      if (!canAccessTask(task, user.id, user.role, user.department)) {
        return res.status(403).json({ message: 'Akses ditolak untuk tugas ini.' });
      }
      return res.json({ task });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Gagal memuat detail tugas.' });
    }
  });

  app.post('/api/tasks', async (req, res) => {
    const { tasks, desc, refNo, docDate, sender, attachments } = req.body;
    const user = req.user;
    if (!Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({ message: 'Daftar tugas tidak boleh kosong.' });
    }

    try {
      const created = [];
      for (const row of tasks) {
        if (!row.title || !row.assigned_to_dept || !row.due_date) {
          continue;
        }
        // Validate assigned_to_user_id if provided
        if (row.assigned_to_user_id) {
          const [targetUser] = await sql`SELECT id FROM users WHERE id = ${row.assigned_to_user_id} LIMIT 1`;
          if (!targetUser) {
            return res.status(400).json({ message: `Penerima delegasi tidak ditemukan (id: ${row.assigned_to_user_id})` });
          }
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
            ${user.id},
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
        // create notification for assigned user if present
        if (newTask && newTask.assigned_to_user_id) {
          const message = `Anda menerima tugas: ${newTask.title}`;
          const [notif] = await sql`
            INSERT INTO notifications (task_id, user_id, message)
            VALUES (${newTask.id}, ${newTask.assigned_to_user_id}, ${message}) RETURNING *
          `;
          try { await triggerNotification(newTask.assigned_to_user_id, notif); } catch (e) { /* ignore */ }
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
      const task = await loadTask(req.params.id);
      if (!task) return res.status(404).json({ message: 'Tugas tidak ditemukan.' });
      const user = req.user;
      if (!isPrivilegedUser(user.role)) {
        return res.status(403).json({ message: 'Akses ditolak.' });
      }
      await sql`DELETE FROM tasks WHERE id = ${req.params.id}`;
      return res.json({ message: 'Tugas berhasil dihapus.' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Gagal menghapus tugas.' });
    }
  });

  // Notifications endpoints
  app.get('/api/notifications', async (req, res) => {
    try {
      const user = req.user;
      const notes = await sql`
        SELECT n.*, u.name AS from_user_name
        FROM notifications n
        LEFT JOIN users u ON n.user_id = u.id
        WHERE n.user_id = ${user.id}
        ORDER BY n.created_at DESC
        LIMIT 200
      `;
      return res.json({ notifications: notes });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Gagal memuat notifikasi.' });
    }
  });

  app.post('/api/notifications/:id/read', async (req, res) => {
    try {
      const user = req.user;
      await sql`UPDATE notifications SET is_read = true WHERE id = ${req.params.id} AND user_id = ${user.id}`;
      return res.json({ message: 'Notification marked as read' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Gagal menandai notifikasi.' });
    }
  });

  app.post('/api/tasks/:id/action', async (req, res) => {
    const { type, reason, targetUserId } = req.body;
    if (!type) {
      return res.status(400).json({ message: 'Tipe aksi tidak ditentukan.' });
    }

    try {
      const user = req.user;
      const task = await loadTask(req.params.id);
      if (!task) return res.status(404).json({ message: 'Tugas tidak ditemukan.' });
      if (!canAccessTask(task, user.id, user.role, user.department)) {
        return res.status(403).json({ message: 'Akses ditolak.' });
      }

      if (type === 'delegate') {
        const [target] = await sql`SELECT * FROM users WHERE id = ${targetUserId} LIMIT 1`;
        if (!target) {
          return res.status(400).json({ message: 'Penerima delegasi tidak ditemukan.' });
        }
        await sql`
          UPDATE tasks
          SET assigned_to_user_id = ${targetUserId}, assigned_to_dept = ${target.department}, assigned_by_user_id = ${user.id}
          WHERE id = ${req.params.id}
        `;
        const [logRow] = await sql`
          INSERT INTO task_logs (task_id, user_id, action, note)
          VALUES (${req.params.id}, ${user.id}, 'delegated', ${`Mendelegasikan ke ${target.name}. Catatan: ${reason || ''}`}) RETURNING *
        `;
        // create notification for the new assignee
        const [notifRow] = await sql`
          INSERT INTO notifications (task_id, user_id, message)
          VALUES (${req.params.id}, ${targetUserId}, ${`Tugas telah didelegasikan kepada Anda oleh ${user.id}`}) RETURNING *
        `;
        try { await triggerNotification(targetUserId, notifRow); } catch (e) { /* ignore */ }
        return res.json({ message: 'Tugas berhasil didelegasikan.' });
      }

      const status = type === 'reject' ? 'Rejected' : 'Completed';
      const action = type === 'reject' ? 'rejected' : 'completed';
      await sql`
        UPDATE tasks
        SET status = ${status}, outcome = ${reason || null}
        WHERE id = ${req.params.id}
      `;
      const [logRow2] = await sql`
        INSERT INTO task_logs (task_id, user_id, action, note)
        VALUES (${req.params.id}, ${user.id}, ${action}, ${reason || null}) RETURNING *
      `;
      // notify task owner/assignee of status change
      const [taskAfter] = await sql`SELECT * FROM tasks WHERE id = ${req.params.id} LIMIT 1`;
      if (taskAfter) {
        const notifyUser = taskAfter.assigned_to_user_id || taskAfter.assigned_by_user_id;
        if (notifyUser) {
          const [notifRow2] = await sql`
            INSERT INTO notifications (task_id, user_id, message)
            VALUES (${req.params.id}, ${notifyUser}, ${`Status tugas berubah menjadi ${status}`}) RETURNING *
          `;
          try { await triggerNotification(notifyUser, notifRow2); } catch (e) { /* ignore */ }
        }
      }
      return res.json({ message: 'Tugas berhasil diperbarui.' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Gagal memproses aksi tugas.' });
    }
  });

  // Forward / Teruskan surat (secretary -> boss) with optional summary attachments
  app.post('/api/tasks/:id/forward', async (req, res) => {
    try {
      const user = req.user;
      const { assigned_to_user_id, notes, attachments } = req.body;
      if (!assigned_to_user_id) return res.status(400).json({ message: 'assigned_to_user_id required' });

      const task = await loadTask(req.params.id);
      if (!task) return res.status(404).json({ message: 'Tugas tidak ditemukan.' });

      // allow if user is the assigned_by or has secretary role
      const roleRaw = (user.role || '').toLowerCase();
      const normalizedRole = roleRaw === 'staf' ? 'staff' : roleRaw;
      const allowedToForward = user.id === task.assigned_by_user_id || normalizedRole === 'secretary' || normalizedRole === 'staff';
      if (!allowedToForward) return res.status(403).json({ message: 'Tidak diizinkan meneruskan tugas.' });

      const [target] = await sql`SELECT * FROM users WHERE id = ${assigned_to_user_id} LIMIT 1`;
      if (!target) return res.status(400).json({ message: 'Penerima tidak ditemukan.' });

      // Update task assignment
      await sql`
        UPDATE tasks
        SET assigned_to_user_id = ${assigned_to_user_id}, assigned_to_dept = ${target.department}, assigned_by_user_id = ${user.id}, status = 'Forwarded'
        WHERE id = ${req.params.id}
      `;

      // Insert attachments (summaries) if provided
      if (Array.isArray(attachments) && attachments.length > 0) {
        for (const att of attachments) {
          await sql`
            INSERT INTO attachments (task_id, file_name, file_type, file_size, file_url, storage_key, is_summary, uploaded_by)
            VALUES (${req.params.id}, ${att.name}, ${att.type || null}, ${att.size || null}, ${att.url}, ${att.storage_key || null}, ${att.is_summary ? true : false}, ${user.id})
          `;
        }
      }

      // log the forward action
      const [logRow] = await sql`
        INSERT INTO task_logs (task_id, user_id, action, note)
        VALUES (${req.params.id}, ${user.id}, 'forwarded', ${notes || null}) RETURNING *
      `;

      // create notification for the assignee
      const message = `Anda menerima surat/penugasan: ${task.title}`;
      const [notif] = await sql`
        INSERT INTO notifications (task_id, user_id, message)
        VALUES (${req.params.id}, ${assigned_to_user_id}, ${message}) RETURNING *
      `;
      try { await triggerNotification(assigned_to_user_id, notif); } catch (e) { /* ignore */ }

      return res.json({ message: 'Tugas berhasil diteruskan.' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Gagal meneruskan tugas.' });
    }
  });
};