-- Migration: add notifications table and helpful indexes

BEGIN;

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to_user ON tasks (assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to_dept ON tasks (assigned_to_dept);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id);

COMMIT;
