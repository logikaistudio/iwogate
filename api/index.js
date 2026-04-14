import express from 'express';
import cors from 'cors';
import { setupAuthRoutes } from '../server/routes/auth.js';
import { setupUserRoutes } from '../server/routes/users.js';
import { setupRoleRoutes } from '../server/routes/roles.js';
import { setupDepartmentRoutes } from '../server/routes/departments.js';
import { setupTaskRoutes } from '../server/routes/tasks.js';
import { initializeDatabase } from '../server/lib/setup.js';

const app = express();

app.use(cors({ origin: true }));
app.use(express.json({ limit: '10mb' }));

// Initialize DB middleware (idempotent)
let dbInitialized = false;
app.use(async (req, res, next) => {
  if (!dbInitialized) {
    try {
      console.log('Initializing database on Vercel...');
      await initializeDatabase();
      dbInitialized = true;
    } catch (err) {
      console.error('DB Init Error:', err);
    }
  }
  next();
});

// Setup all routes
setupAuthRoutes(app);
setupUserRoutes(app);
setupRoleRoutes(app);
setupDepartmentRoutes(app);
setupTaskRoutes(app);

// Health check with DB status
app.get(['/api/health', '/health'], async (req, res) => {
  res.json({ 
    success: true, 
    message: 'API is healthy', 
    dbInitialized,
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

