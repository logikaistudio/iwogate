/**
 * Migration script: Ensures all tables and columns are up-to-date in NeonDB.
 * Safe to run multiple times (idempotent).
 */
import { neon } from '@neondatabase/serverless';

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_H8xuZER1Jaoi@ep-late-mouse-a15eyd85-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

const sql = neon(connectionString);

async function migrate() {
  console.log('🚀 Starting DB migration...\n');

  // 1. roles table
  await sql`
    CREATE TABLE IF NOT EXISTS roles (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      description TEXT,
      permissions TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
  console.log('✅  Table: roles ready');

  // 2. departments table
  await sql`
    CREATE TABLE IF NOT EXISTS departments (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      label TEXT NOT NULL,
      color TEXT DEFAULT '#3b82f6',
      description TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
  console.log('✅  Table: departments ready');

  // 3. users table
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      username TEXT UNIQUE,
      email TEXT UNIQUE,
      password TEXT,
      role TEXT NOT NULL DEFAULT 'user',
      department TEXT,
      avatar_url TEXT,
      reset_token TEXT,
      reset_token_expiry TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
  console.log('✅  Table: users ready');

  // Ensure reset_token columns exist if users table was already created before
  try {
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token TEXT`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMP`;
    console.log('✅  Columns reset_token & reset_token_expiry ensured on users');
  } catch (e) {
    console.log('   (reset_token columns already exist or error:', e.message, ')');
  }

  // 4. tasks table
  await sql`
    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      assigned_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      assigned_to_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      assigned_to_dept TEXT NOT NULL,
      status TEXT DEFAULT 'Pending',
      due_date DATE,
      reference_no TEXT,
      document_date DATE,
      sender_info TEXT,
      outcome TEXT,
      type TEXT DEFAULT 'incoming',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
  console.log('✅  Table: tasks ready');

  // 5. attachments table
  await sql`
    CREATE TABLE IF NOT EXISTS attachments (
      id SERIAL PRIMARY KEY,
      task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
      file_name TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_size TEXT NOT NULL,
      file_url TEXT
    )
  `;
  console.log('✅  Table: attachments ready');

  // 6. task_logs table
  await sql`
    CREATE TABLE IF NOT EXISTS task_logs (
      id SERIAL PRIMARY KEY,
      task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      action TEXT NOT NULL,
      note TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
  console.log('✅  Table: task_logs ready');

  // --- Seed default roles ---
  const roleCount = await sql`SELECT count(*) as count FROM roles`;
  if (parseInt(roleCount[0].count, 10) === 0) {
    await sql`
      INSERT INTO roles (name, code, description, permissions) VALUES
        ('Superuser', 'superuser', 'Akses penuh ke seluruh sistem tanpa batasan.', 'all'),
        ('Admin', 'admin', 'Manajer tingkat departemen atau operasional.', 'view_task, create_task, edit_task, delete_task, manage_users'),
        ('User', 'user', 'Pengguna standar untuk pelaksana tugas.', 'view_task, update_status, view_profile')
    `;
    console.log('✅  Seeded: default roles');
  } else {
    console.log(`ℹ️   Roles already seeded (${roleCount[0].count} roles exist)`);
  }

  // --- Seed default departments ---
  const deptCount = await sql`SELECT count(*) as count FROM departments`;
  if (parseInt(deptCount[0].count, 10) === 0) {
    await sql`
      INSERT INTO departments (name, label, color, description) VALUES
        ('Management', 'Manajemen', '#64748b', 'Eksekutif dan strategi'),
        ('Finance', 'Keuangan', '#3b82f6', 'Mengelola keuangan'),
        ('Marketing', 'Pemasaran', '#f97316', 'Promosi dan branding'),
        ('IT', 'Teknologi Informasi', '#8b5cf6', 'Sistem dan infrastruktur IT'),
        ('HR', 'SDM', '#10b981', 'Pengelolaan sumber daya manusia'),
        ('Ops', 'Operasional', '#ef4444', 'Operasional sehari-hari')
    `;
    console.log('✅  Seeded: default departments');
  } else {
    console.log(`ℹ️   Departments already seeded (${deptCount[0].count} departments exist)`);
  }

  // --- Seed default superadmin user ---
  const userCount = await sql`SELECT count(*) as count FROM users`;
  if (parseInt(userCount[0].count, 10) === 0) {
    await sql`
      INSERT INTO users (name, username, email, password, role, department, avatar_url) VALUES
        ('Super Administrator', 'superadmin', 'superadmin@iwogate.com', 'password123', 'superuser', 'Management', 'https://ui-avatars.com/api/?name=Super+Admin'),
        ('Administrator', 'admin', 'admin@iwogate.com', 'iwogate123', 'admin', 'IT', 'https://ui-avatars.com/api/?name=Administrator')
    `;
    console.log('✅  Seeded: default users');
  } else {
    console.log(`ℹ️   Users already seeded (${userCount[0].count} users exist)`);
  }

  // --- Show final table counts ---
  const counts = await sql`
    SELECT 
      (SELECT count(*) FROM roles) as roles,
      (SELECT count(*) FROM departments) as departments,
      (SELECT count(*) FROM users) as users,
      (SELECT count(*) FROM tasks) as tasks
  `;
  console.log('\n📊 Current DB Summary:');
  console.log(`   Roles      : ${counts[0].roles}`);
  console.log(`   Departments: ${counts[0].departments}`);
  console.log(`   Users      : ${counts[0].users}`);
  console.log(`   Tasks      : ${counts[0].tasks}`);

  console.log('\n✅ Migration completed successfully!');
}

migrate().then(() => process.exit(0)).catch(err => {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
});
