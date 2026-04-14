import { sql } from '../lib/db.js';

const sanitizeUser = (user) => {
  if (!user) return null;
  // eslint-disable-next-line no-unused-vars
  const { password, ...rest } = user;
  return rest;
};

export const setupAuthRoutes = (app) => {
  app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Username dan password wajib diisi.' });
    }

    try {
      const users = await sql`SELECT * FROM users WHERE username = ${username} LIMIT 1`;
      if (users.length === 0) {
        return res.status(400).json({ message: 'Username tidak ditemukan.' });
      }
      const user = users[0];
      if (user.password !== password) {
        return res.status(400).json({ message: 'Password salah.' });
      }
      return res.json({ user: sanitizeUser(user) });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Gagal melakukan login.' });
    }
  });

  app.post('/api/password-reset', async (req, res) => {
    const { email, password, confirmPassword } = req.body;
    if (!email || !password || !confirmPassword) {
      return res.status(400).json({ message: 'Email dan password baru wajib diisi.' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Password dan konfirmasi tidak cocok.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password harus minimal 6 karakter.' });
    }

    try {
      const users = await sql`SELECT * FROM users WHERE email = ${email} LIMIT 1`;
      if (users.length === 0) {
        return res.status(400).json({ message: 'Email tidak terdaftar.' });
      }
      await sql`UPDATE users SET password = ${password} WHERE email = ${email}`;
      return res.json({ message: 'Password berhasil diubah. Silakan login kembali.' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Gagal mereset password.' });
    }
  });
};