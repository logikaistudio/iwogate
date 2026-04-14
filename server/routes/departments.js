import { sql } from '../lib/db.js';

export const setupDepartmentRoutes = (app) => {
  app.get('/api/departments', async (req, res) => {
    try {
      const departments = await sql`SELECT * FROM departments ORDER BY id ASC`;
      return res.json({ departments });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Gagal memuat departemen.' });
    }
  });

  app.get('/api/departments/stats', async (req, res) => {
    try {
      const tasks = await sql`SELECT assigned_to_dept, COUNT(*) AS count FROM tasks WHERE status IN ('Pending', 'In Progress') GROUP BY assigned_to_dept`;
      const stats = tasks.reduce((acc, item) => {
        acc[item.assigned_to_dept] = parseInt(item.count, 10);
        return acc;
      }, {});
      return res.json({ stats });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Gagal memuat statistik departemen.' });
    }
  });

  app.post('/api/departments', async (req, res) => {
    const { name, label, color, description } = req.body;
    if (!name || !label) {
      return res.status(400).json({ message: 'Nama dan label departemen wajib diisi.' });
    }
    try {
      const existing = await sql`SELECT id FROM departments WHERE name = ${name} LIMIT 1`;
      if (existing.length > 0) {
        return res.status(400).json({ message: 'Kode Departemen sudah terdaftar.' });
      }
      const [dept] = await sql`
        INSERT INTO departments (name, label, color, description)
        VALUES (${name}, ${label}, ${color || '#3b82f6'}, ${description || ''})
        RETURNING *
      `;
      return res.json({ department: dept });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Gagal membuat departemen.' });
    }
  });

  app.put('/api/departments/:id', async (req, res) => {
    const { name, label, color, description } = req.body;
    if (!name || !label) {
      return res.status(400).json({ message: 'Nama dan label departemen wajib diisi.' });
    }
    try {
      const existing = await sql`
        SELECT id FROM departments
        WHERE name = ${name} AND id != ${req.params.id}
        LIMIT 1
      `;
      if (existing.length > 0) {
        return res.status(400).json({ message: 'Kode Departemen sudah terdaftar.' });
      }
      await sql`
        UPDATE departments
        SET name = ${name}, label = ${label}, color = ${color || '#3b82f6'}, description = ${description || ''}
        WHERE id = ${req.params.id}
      `;
      const [dept] = await sql`SELECT * FROM departments WHERE id = ${req.params.id} LIMIT 1`;
      return res.json({ department: dept });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Gagal memperbarui departemen.' });
    }
  });

  app.delete('/api/departments/:id', async (req, res) => {
    try {
      await sql`DELETE FROM departments WHERE id = ${req.params.id}`;
      return res.json({ message: 'Departemen berhasil dihapus.' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Gagal menghapus departemen.' });
    }
  });
};