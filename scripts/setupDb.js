import { sql } from '../server/lib/db.js';

async function setupDatabase() {
    console.log("Setting up database...");

    try {
        // 1. Roles Table
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
        // Seed Roles
        const roleCount = await sql`SELECT COUNT(*) FROM roles`;
        if (parseInt(roleCount[0].count) === 0) {
            await sql`INSERT INTO roles (name, code, description, permissions) VALUES 
                ('Superuser', 'superuser', 'Akses penuh ke seluruh sistem tanpa batasan.', 'all'),
                ('Admin', 'admin', 'Manajer tingkat departemen atau operasional.', 'view_task, create_task, edit_task, delete_task, manage_users'),
                ('User', 'user', 'Pengguna standar untuk pelaksana tugas.', 'view_task, update_status, view_profile')`;
            console.log("Seeded roles.");
        }

        // 2. Departments Table
        await sql`
            CREATE TABLE IF NOT EXISTS departments (
                id SERIAL PRIMARY KEY,
                name TEXT UNIQUE NOT NULL, -- e.g. IT, HRD
                label TEXT NOT NULL, -- e.g. Information Technology
                color TEXT,
                description TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `;
        // Seed Departments
        const deptCount = await sql`SELECT COUNT(*) FROM departments`;
        if (parseInt(deptCount[0].count) === 0) {
            await sql`INSERT INTO departments (name, label, color, description) VALUES
                ('IT', 'Information Technology', 'bg-blue-100 text-blue-800', 'Handles all tech related tasks'),
                ('HRD', 'Human Resources', 'bg-pink-100 text-pink-800', 'Employee management'),
                ('FIN', 'Finance', 'bg-green-100 text-green-800', 'Financial operations'),
                ('MKT', 'Marketing', 'bg-orange-100 text-orange-800', 'Promotions and sales'),
                ('OPS', 'Operations', 'bg-purple-100 text-purple-800', 'Daily operations')`;
            console.log("Seeded departments.");
        }

        // 3. Users Table
        await sql`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                username TEXT UNIQUE NOT NULL,
                role TEXT NOT NULL, -- linkage to roles.code ideally, but text is fine for simple app
                department TEXT,
                password TEXT, -- In real app, hash this!
                avatar_url TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `;
        // Seed Superadmin
        const userCount = await sql`SELECT COUNT(*) FROM users`;
        if (parseInt(userCount[0].count) === 0) {
            await sql`INSERT INTO users (name, username, role, department, password, avatar_url) VALUES 
                ('Super Admin', 'superadmin', 'superuser', 'IT', 'admin123', 'https://ui-avatars.com/api/?name=Super+Admin')`;
            console.log("Seeded superadmin user.");
        }

        // 4. Tasks Table
        await sql`
            CREATE TABLE IF NOT EXISTS tasks (
                id SERIAL PRIMARY KEY,
                title TEXT NOT NULL,
                priority TEXT DEFAULT 'Medium', -- Low, Medium, High
                status TEXT DEFAULT 'Pending', -- Pending, In Progress, Completed
                assigned_to TEXT, -- username
                assigned_to_dept TEXT, -- department name
                due_date DATE,
                description TEXT,
                created_by TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `;

        // 5. Notifications Table
        await sql`
            CREATE TABLE IF NOT EXISTS notifications (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                title TEXT NOT NULL,
                message TEXT,
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `;

        console.log("Database setup complete!");
    } catch (err) {
        console.error("Database setup failed:", err);
    }
}

setupDatabase();
