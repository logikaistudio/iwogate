import { sql } from '../lib/db.js';

export const setupRoleRoutes = (app) => {
  app.get('/api/roles', async (req, res) => {
    try {
      const roles = await sql`SELECT * FROM roles ORDER BY id ASC`;
      return res.json({ roles });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Gagal memuat roles.' });
    }
  });

  app.post('/api/roles', async (req, res) => {
    const { name, code, description, permissions } = req.body;
    if (!name || !code) {
      return res.status(400).json({ message: 'Nama dan kode role wajib diisi.' });
    }

    try {
      const existing = await sql`SELECT id FROM roles WHERE code = ${code} LIMIT 1`;
      if (existing.length > 0) {
        return res.status(400).json({ message: 'Kode role sudah digunakan.' });
      }
      const [newRole] = await sql`
        INSERT INTO roles (name, code, description, permissions)
        VALUES (${name}, ${code}, ${description || ''}, ${permissions || ''})
        RETURNING *
      `;
      return res.json({ role: newRole });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Gagal membuat role.' });
    }
  });

  app.put('/api/roles/:id', async (req, res) => {
    const { name, code, description, permissions } = req.body;
    if (!name || !code) {
      return res.status(400).json({ message: 'Nama dan kode role wajib diisi.' });
    }

    try {
      const existing = await sql`
        SELECT id FROM roles
        WHERE code = ${code} AND id != ${req.params.id}
        LIMIT 1
      `;
      if (existing.length > 0) {
        return res.status(400).json({ message: 'Kode role sudah digunakan.' });
      }
      await sql`
        UPDATE roles
        SET name = ${name}, code = ${code}, description = ${description || ''}, permissions = ${permissions || ''}
        WHERE id = ${req.params.id}
      `;
      const [updated] = await sql`SELECT * FROM roles WHERE id = ${req.params.id} LIMIT 1`;
      return res.json({ role: updated });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Gagal memperbarui role.' });
    }
  });

  app.delete('/api/roles/:id', async (req, res) => {
    try {
      await sql`DELETE FROM roles WHERE id = ${req.params.id}`;
      return res.json({ message: 'Role berhasil dihapus.' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Gagal menghapus role.' });
    }
  });
};