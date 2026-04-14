
import { sql } from '../server/lib/db.js';

const updateSchema = async () => {
    console.log('Updating schema...');
    try {
        // Add 'outcome' column to tasks if it doesn't exist
        await sql`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='outcome') THEN 
          ALTER TABLE tasks ADD COLUMN outcome TEXT; 
        END IF; 
      END $$;
    `;
        console.log('Added outcome column.');

        // Add 'assigned_to_user_id' if strictly needed for specific user assignment?
        // We already have assigned_to_dept. Let's add assigned_to_user_id for specific person delegation.
        await sql`
        DO $$ 
        BEGIN 
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='assigned_to_user_id') THEN 
            ALTER TABLE tasks ADD COLUMN assigned_to_user_id INTEGER REFERENCES users(id); 
            END IF; 
        END $$;
    `;
        console.log('Added assigned_to_user_id column.');

        // Fetch users for verification
        const users = await sql`SELECT * FROM users`;
        console.log('Current users:', users);

    } catch (error) {
        console.error('Schema update failed:', error);
    }
};

updateSchema().then(() => process.exit(0));
