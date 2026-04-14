import { sql } from '../lib/db.js';

const sanitizeUser = (user) => {
  if (!user) return null;
  // eslint-disable-next-line no-unused-vars
  const { password, ...rest } = user;
  return rest;
};

export const setupUserRoutes = (app) => {
  app.get('/api/user/:id', async (req, res) => {
    try {
      const [user] = await sql`SELECT * FROM users WHERE id = ${req.params.id} LIMIT 1`;
      if (!user) return res.status(404).json({ message: 'User tidak ditemukan.' });
      return res.json({ user: sanitizeUser(user) });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Gagal memuat data user.' });
    }
  });

  app.get('/api/users', async (req, res) => {
    try {
      const users = await sql`SELECT * FROM users ORDER BY id ASC`;
      return res.json({ users: users.map(sanitizeUser) });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Gagal memuat daftar pengguna.' });
    }
  });

  app.post('/api/users', async (req, res) => {
    const { name, username, email, role, department, password, avatar_url } = req.body;
    if (!name || !username || !email || !role) {
      return res.status(400).json({ message: 'Nama, username, email, dan role wajib diisi.' });
    }

    try {
      const existing = await sql`SELECT id FROM users WHERE username = ${username} OR email = ${email}`;
      if (existing.length > 0) {
        return res.status(400).json({ message: 'Username atau email sudah digunakan.' });
      }
      const [newUser] = await sql`
        INSERT INTO users (name, username, email, password, role, department, avatar_url)
        VALUES (${name}, ${username}, ${email}, ${password || ''}, ${role}, ${department || null}, ${avatar_url || null})
        RETURNING *
      `;
      return res.json({ user: sanitizeUser(newUser) });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Gagal membuat pengguna.' });
    }
  });

  app.put('/api/users/:id', async (req, res) => {
    const { name, username, email, role, department, password, avatar_url } = req.body;
    if (!name || !username || !email || !role) {
      return res.status(400).json({ message: 'Nama, username, email, dan role wajib diisi.' });
    }

    try {
      const existing = await sql`
        SELECT id FROM users
        WHERE (username = ${username} OR email = ${email})
          AND id != ${req.params.id}
      `;
      if (existing.length > 0) {
        return res.status(400).json({ message: 'Username atau email sudah digunakan.' });
      }
      if (password) {
        await sql`
          UPDATE users
          SET name = ${name}, username = ${username}, email = ${email}, role = ${role}, department = ${department || null}, avatar_url = ${avatar_url || null}, password = ${password}
          WHERE id = ${req.params.id}
        `;
      } else {
        await sql`
          UPDATE users
          SET name = ${name}, username = ${username}, email = ${email}, role = ${role}, department = ${department || null}, avatar_url = ${avatar_url || null}
          WHERE id = ${req.params.id}
        `;
      }
      const [updated] = await sql`SELECT * FROM users WHERE id = ${req.params.id} LIMIT 1`;
      return res.json({ user: sanitizeUser(updated) });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Gagal memperbarui pengguna.' });
    }
  });

  app.delete('/api/users/:id', async (req, res) => {
    try {
      await sql`DELETE FROM users WHERE id = ${req.params.id}`;
      return res.json({ message: 'User berhasil dihapus.' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Gagal menghapus pengguna.' });
    }
  });
};