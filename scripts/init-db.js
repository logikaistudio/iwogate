
import { initializeDatabase } from '../server/lib/setup.js';

initializeDatabase()
    .then(() => {
        console.log('Done.');
        process.exit(0);
    })
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
