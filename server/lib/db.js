import { neon } from '@neondatabase/serverless';

const getConnectionString = () => {
  const url = process.env.DATABASE_URL ||
    'postgresql://neondb_owner:npg_H8xuZER1Jaoi@ep-late-mouse-a15eyd85-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';
  return url;
};

// Lazy initialization of the neon client
let _sql;
export const sql = (...args) => {
  if (!_sql) {
    const connStr = getConnectionString();
    if (!connStr) {
      throw new Error('Database connection string is missing');
    }
    _sql = neon(connStr);
  }
  return _sql(...args);
};

