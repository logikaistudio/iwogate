import express from 'express';
import cors from 'cors';
import { initializeDatabase } from '../server/lib/setup.js';
import { setupAuthRoutes } from '../server/routes/auth.js';
import { setupUserRoutes } from '../server/routes/users.js';
import { setupRoleRoutes } from '../server/routes/roles.js';
import { setupDepartmentRoutes } from '../server/routes/departments.js';
import { setupTaskRoutes } from '../server/routes/tasks.js';

const app = express();

app.use(cors({ origin: true }));
app.use(express.json({ limit: '10mb' }));

// Setup all routes
setupAuthRoutes(app);
setupUserRoutes(app);
setupRoleRoutes(app);
setupDepartmentRoutes(app);
setupTaskRoutes(app);

// Initialize database (idempotent)
// On Vercel, we don't want to block the top-level import, 
// so we'll init in a middleware or just ensure it's called once.
let isDbInitialized = false;
app.use(async (req, res, next) => {
  if (!isDbInitialized) {
    try {
      await initializeDatabase();
      isDbInitialized = true;
    } catch (e) {
      console.error('DB Init Error in middleware:', e);
    }
  }
  next();
});

// Health check
app.get(['/api/health', '/health'], (req, res) => {
  res.json({ success: true, message: 'API is healthy', timestamp: new Date().toISOString() });
});

// Diagnostic 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not Found in Express', 
    requestedUrl: req.url,
    effectivePath: req.path
  });
});

export default app;
