import express from 'express';
import cors from 'cors';

// Temporary comment out to debug crash
// import { setupAuthRoutes } from '../server/routes/auth.js';
// import { setupUserRoutes } from '../server/routes/users.js';
// import { setupRoleRoutes } from '../server/routes/roles.js';
// import { setupDepartmentRoutes } from '../server/routes/departments.js';
// import { setupTaskRoutes } from '../server/routes/tasks.js';
// import { initializeDatabase } from '../server/lib/setup.js';
// import { sql } from '../server/lib/db.js';

const app = express();

app.use(cors({ origin: true }));
app.use(express.json({ limit: '10mb' }));

// Minimal health check
app.get(['/api/health', '/health'], (req, res) => {
  res.json({ 
    success: true, 
    message: 'Minimal API is healthy', 
    timestamp: new Date().toISOString()
  });
});

export default app;
