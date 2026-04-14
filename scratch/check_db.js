import { neon } from '@neondatabase/serverless';

const connectionString = 'postgresql://neondb_owner:npg_H8xuZER1Jaoi@ep-late-mouse-a15eyd85-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';
const sql = neon(connectionString);

async function checkDb() {
  try {
    const users = await sql`SELECT id, username, role FROM users`;
    console.log('Users in DB:', users);
  } catch (err) {
    console.error('DB Error:', err.message);
  }
}

checkDb();
