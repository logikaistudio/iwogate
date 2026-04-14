import { sql } from './db.js';

export const updateSchema = async () => {
    try {
        console.log('Validating columns...');
        // Add outcome column
        await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS outcome TEXT`;
        // Add assigned_to_user_id column
        await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_to_user_id INTEGER REFERENCES users(id)`;
        return true;
    } catch (error) {
        console.error('Schema update failed:', error);
        return false;
    }
};
