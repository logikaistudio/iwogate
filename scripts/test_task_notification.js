/*
Simple test script to verify task creation -> notification flow.
Usage:
  NODE_ENV=development AUTH_TOKEN=<token> node scripts/test_task_notification.js

Set AUTH_TOKEN to a valid bearer token (from login response) and ensure the API server is running on http://localhost:4000
*/

const API_BASE = process.env.API_BASE || 'http://localhost:4000';
const fetch = global.fetch || (await import('node-fetch')).default;

async function run() {
  const token = process.env.AUTH_TOKEN;
  if (!token) {
    console.error('Please set AUTH_TOKEN as env var');
    process.exit(1);
  }

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // Create a task assigned to self (use your user id)
  const createResp = await fetch(`${API_BASE}/api/tasks`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      tasks: [
        { title: 'TEST: Notif flow', assigned_to_dept: 'IT', assigned_to_user_id: null, due_date: '2026-12-31' }
      ],
      desc: 'Auto test',
    }),
  });
  const createBody = await createResp.json().catch(() => null);
  console.log('Create task response:', createResp.status, createBody);

  // Fetch notifications
  const noteResp = await fetch(`${API_BASE}/api/notifications`, { headers });
  const noteBody = await noteResp.json().catch(() => null);
  console.log('Notifications:', noteResp.status, noteBody);
}

run().catch(e => { console.error(e); process.exit(1); });
