import express from 'express';
import cors from 'cors';
import { sql } from '../server/lib/db.js';
import { setupAuthRoutes } from '../server/routes/auth.js';
import { setupUserRoutes } from '../server/routes/users.js';
import { setupRoleRoutes } from '../server/routes/roles.js';
import { setupDepartmentRoutes } from '../server/routes/departments.js';
import { setupTaskRoutes } from '../server/routes/tasks.js';
import { initializeDatabase } from '../server/lib/setup.js';
import { requireAuth } from '../server/lib/auth.js';

const app = express();

app.use(cors({ origin: true }));
app.use(express.json({ limit: '10mb' }));

await initializeDatabase();

// Setup all routes
setupAuthRoutes(app);

// Protect all API routes after auth
app.use(requireAuth);

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


