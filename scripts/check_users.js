import { sql } from '../server/lib/db.js';

async function checkUsers() {
    try {
        const users = await sql`SELECT id, name, role, department FROM users`;
        console.log(JSON.stringify(users, null, 2));
    } catch (err) {
        console.error(err);
    }
    process.exit(0);
}
checkUsers();
