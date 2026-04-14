import { sql } from './db.js';

export const initializeDatabase = async () => {
  console.log('Initializing database...');
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        code TEXT NOT NULL UNIQUE,
        description TEXT,
        permissions TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS departments (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        label TEXT NOT NULL,
        color TEXT,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        username TEXT UNIQUE,
        email TEXT UNIQUE,
        password TEXT,
        role TEXT NOT NULL,
        department TEXT,
        avatar_url TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        assigned_by_user_id INTEGER REFERENCES users(id),
        assigned_to_user_id INTEGER REFERENCES users(id),
        assigned_to_dept TEXT NOT NULL,
        status TEXT DEFAULT 'Pending',
        due_date DATE,
        reference_no TEXT,
        document_date DATE,
        sender_info TEXT,
        outcome TEXT,
        type TEXT DEFAULT 'incoming',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS attachments (
        id SERIAL PRIMARY KEY,
        task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
        file_name TEXT NOT NULL,
        file_type TEXT NOT NULL,
        file_size TEXT NOT NULL,
        file_url TEXT
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS task_logs (
        id SERIAL PRIMARY KEY,
        task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id),
        action TEXT NOT NULL,
        note TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;

    const roleCount = await sql`SELECT count(*) FROM roles`;
    if (parseInt(roleCount[0].count, 10) === 0) {
      await sql`
        INSERT INTO roles (name, code, description, permissions)
        VALUES
          ('Superuser', 'superuser', 'Akses penuh ke seluruh sistem tanpa batasan.', 'all'),
          ('Admin', 'admin', 'Manajer tingkat departemen atau operasional.', 'view_task, create_task, edit_task, delete_task, manage_users'),
          ('User', 'user', 'Pengguna standar untuk pelaksana tugas.', 'view_task, update_status, view_profile')
      `;
    }

    const deptCount = await sql`SELECT count(*) FROM departments`;
    if (parseInt(deptCount[0].count, 10) === 0) {
      await sql`
        INSERT INTO departments (name, label, color, description)
        VALUES
          ('Management', 'Manajemen', '#64748b', 'Eksekutif dan strategi'),
          ('Finance', 'Keuangan', '#3b82f6', 'Mengelola keuangan perusahaan'),
          ('Marketing', 'Pemasaran', '#f97316', 'Promosi dan branding'),
          ('IT', 'Teknologi Informasi', '#8b5cf6', 'Sistem dan infrastruktur IT'),
          ('HR', 'SDM', '#10b981', 'Pengelolaan sumber daya manusia'),
          ('Ops', 'Operasional', '#ef4444', 'Operasional sehari-hari')
      `;
    }

    const userCount = await sql`SELECT count(*) FROM users`;
    if (parseInt(userCount[0].count, 10) === 0) {
      await sql`
        INSERT INTO users (name, username, email, password, role, department, avatar_url)
        VALUES
          ('Super Administrator', 'superadmin', 'superadmin@example.com', 'password123', 'superuser', 'Management', 'https://ui-avatars.com/api/?name=Super+Admin'),
          ('Administrator', 'admin', 'admin@example.com', 'iwogate123', 'admin', 'IT', 'https://ui-avatars.com/api/?name=Administrator'),
          ('Budi Santoso', 'budi', 'budi.santoso@example.com', 'budi123', 'user', 'Finance', 'https://ui-avatars.com/api/?name=Budi+Santoso'),
          ('Siti Aminah', 'siti', 'siti.aminah@example.com', 'siti123', 'user', 'Marketing', 'https://ui-avatars.com/api/?name=Siti+Aminah')
      `;
    }

    const taskCount = await sql`SELECT count(*) FROM tasks`;
    if (parseInt(taskCount[0].count, 10) === 0) {
      const [superadmin] = await sql`SELECT id FROM users WHERE username = 'superadmin' LIMIT 1`;
      const [admin] = await sql`SELECT id FROM users WHERE username = 'admin' LIMIT 1`;
      const [budi] = await sql`SELECT id FROM users WHERE username = 'budi' LIMIT 1`;
      await sql`
        INSERT INTO tasks (title, description, assigned_by_user_id, assigned_to_user_id, assigned_to_dept, status, due_date, type, reference_no, document_date, sender_info)
        VALUES
          ('Tinjau Laporan Keuangan Q1', 'Mohon tinjau laporan keuangan kuartal pertama sebelum rapat direksi.', ${budi?.id || null}, ${superadmin?.id || null}, 'Management', 'Pending', '2026-02-16', 'incoming', '001/FIN/2026', '2026-02-10', 'Biro Keuangan'),
          ('Perbaikan Sistem Login', 'Terdapat bug pada sistem login user baru. Segera perbaiki untuk menghindari komplain customer.', ${superadmin?.id || null}, ${admin?.id || null}, 'IT', 'In Progress', '2026-02-20', 'outgoing', '002/IT/2026', '2026-02-15', 'Divisi IT')
      `;
    }

    console.log('Database initialized successfully');
    return { success: true, message: 'Database initialized successfully' };
  } catch (error) {
    console.error('Database initialization failed:', error);
    return { success: false, message: error.message };
  }
};
