import express from 'express';
import cors from 'cors';
import { initializeDatabase } from './lib/setup.js';
import { setupAuthRoutes } from './routes/auth.js';
import { setupUserRoutes } from './routes/users.js';
import { setupRoleRoutes } from './routes/roles.js';
import { setupDepartmentRoutes } from './routes/departments.js';
import { setupTaskRoutes } from './routes/tasks.js';

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
setupUserRoutes(app);
setupRoleRoutes(app);
setupDepartmentRoutes(app);
setupTaskRoutes(app);

// Initialize database and start server
await initializeDatabase();

app.listen(port, () => {
  console.log(`API server ready at http://localhost:${port}`);
});
