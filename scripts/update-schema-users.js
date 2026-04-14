
import { sql } from '../server/lib/db.js';

const updateSchemaUsers = async () => {
    console.log('Updating users schema...');
    try {
        // Add username and password columns
        await sql`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='username') THEN 
          ALTER TABLE users ADD COLUMN username TEXT UNIQUE; 
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='password') THEN 
          ALTER TABLE users ADD COLUMN password TEXT; 
        END IF;
      END $$;
    `;
        console.log('Added username and password columns.');

        // Seed Superuser
        // superadmin / password123
        const superUserCheck = await sql`SELECT * FROM users WHERE username = 'superadmin'`;
        if (superUserCheck.length === 0) {
            await sql`
            INSERT INTO users (name, role, department, avatar_url, username, password)
            VALUES ('Super Administrator', 'superuser', 'Management', 'https://ui-avatars.com/api/?name=Super+Admin', 'superadmin', 'password123')
        `;
            console.log('Seeded superadmin.');
        } else {
            // Ensure password is correct if exists
            await sql`UPDATE users SET password = 'password123', role = 'superuser' WHERE username = 'superadmin'`;
        }

        // Seed Admin
        // admin / iwogate123
        const adminUserCheck = await sql`SELECT * FROM users WHERE username = 'admin'`;
        if (adminUserCheck.length === 0) {
            await sql`
            INSERT INTO users (name, role, department, avatar_url, username, password)
            VALUES ('Administrator', 'admin', 'IT', 'https://ui-avatars.com/api/?name=Administrator', 'admin', 'iwogate123')
        `;
            console.log('Seeded admin.');
        } else {
            await sql`UPDATE users SET password = 'iwogate123', role = 'admin' WHERE username = 'admin'`;
        }

        console.log('User schema update complete.');

    } catch (error) {
        console.error('Schema update failed:', error);
    }
};

updateSchemaUsers().then(() => process.exit(0));
