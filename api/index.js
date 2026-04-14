import express from 'express';
import cors from 'cors';
import { sql } from '../server/lib/db.js';
import { setupAuthRoutes } from '../server/routes/auth.js';

const app = express();

app.use(cors({ origin: true }));
app.use(express.json({ limit: '10mb' }));

// Setup Auth routes
setupAuthRoutes(app);

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

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global API Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

export default app;


