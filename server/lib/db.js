import { neon } from '@neondatabase/serverless';

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_H8xuZER1Jaoi@ep-late-mouse-a15eyd85-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

export const sql = neon(connectionString);
