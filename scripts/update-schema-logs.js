
import { sql } from '../server/lib/db.js';

const updateSchemaLogs = async () => {
    console.log('Creating task_logs table...');
    try {
        // Create task_logs table
        await sql`
      CREATE TABLE IF NOT EXISTS task_logs (
        id SERIAL PRIMARY KEY,
        task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id),
        action TEXT NOT NULL, -- 'created', 'updated_status', 'delegated', 'comment'
        note TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;
        console.log('Created task_logs table.');

        // Add logging to existing tasks for continuity (optional, skipping for now to keep it simple)

    } catch (error) {
        console.error('Schema update failed:', error);
    }
};

updateSchemaLogs().then(() => process.exit(0));
