import express from 'express';
import cors from 'cors';
import { sql } from '../server/lib/db.js';

const app = express();

app.use(cors({ origin: true }));
app.use(express.json({ limit: '10mb' }));

// Health check with DB ping
app.get(['/api/health', '/health'], async (req, res) => {
  let dbStatus = 'unknown';
  try {
    await sql`SELECT 1`;
    dbStatus = 'connected';
  } catch (err) {
    dbStatus = 'error: ' + err.message;
  }

  res.json({ 
    success: true, 
    message: 'API is healthy', 
    dbStatus,
    timestamp: new Date().toISOString()
  });
});

export default app;

