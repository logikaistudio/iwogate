import express from 'express';
import cors from 'cors';
import { setupAuthRoutes } from '../server/routes/auth.js';
import { setupUserRoutes } from '../server/routes/users.js';
import { setupRoleRoutes } from '../server/routes/roles.js';
import { setupDepartmentRoutes } from '../server/routes/departments.js';
import { setupTaskRoutes } from '../server/routes/tasks.js';
import { initializeDatabase } from '../server/lib/setup.js';
import { sql } from '../server/lib/db.js';

const app = express();

app.use(cors({ origin: true }));
app.use(express.json({ limit: '10mb' }));

// Initialize database on startup so production serverless has required tables/data
await initializeDatabase();

// Setup all routes
setupAuthRoutes(app);
setupUserRoutes(app);
setupRoleRoutes(app);
setupDepartmentRoutes(app);
setupTaskRoutes(app);

// Manual init route
app.get('/api/admin/init-db', async (req, res) => {
  try {
    const result = await initializeDatabase();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

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
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV
  });
});

// Diagnostic 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not Found in Express', 
    requestedUrl: req.url,
    effectivePath: req.path
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global API Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

export default app;


