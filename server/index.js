import express from 'express';
import cors from 'cors';
import { initializeDatabase } from './lib/setup.js';
import { requireAuth } from './lib/auth.js';
import { setupAuthRoutes } from './routes/auth.js';
import { setupUserRoutes } from './routes/users.js';
import { setupRoleRoutes } from './routes/roles.js';
import { setupDepartmentRoutes } from './routes/departments.js';
import { setupTaskRoutes } from './routes/tasks.js';
import { setupUploadRoutes } from './routes/uploads.js';
import { initWS } from './lib/ws-notify.js';

const app = express();
const port = process.env.PORT || 4000;

app.use(cors({ origin: true }));
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'API is healthy' });
});

// Setup all routes
setupAuthRoutes(app);

// Protect all API routes after auth
app.use(requireAuth);

setupUserRoutes(app);
setupRoleRoutes(app);
setupDepartmentRoutes(app);
setupTaskRoutes(app);
setupUploadRoutes(app);

// Initialize database and start server
await initializeDatabase();

const server = app.listen(port, () => {
  console.log(`API server ready at http://localhost:${port}`);
});

// Initialize WebSocket server for realtime notifications
try {
  initWS(server);
  console.log('WebSocket server initialized');
} catch (e) {
  console.error('Failed to initialize WebSocket server', e);
}
