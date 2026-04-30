import { WebSocketServer } from 'ws';
import { verifyAuthToken } from './auth.js';

let wss;
// Map userId -> Set of ws connections
const clients = new Map();

export const initWS = (server) => {
  if (wss) return wss;
  wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url, `http://${request.headers.host}`);
    if (url.pathname !== '/ws') {
      socket.destroy();
      return;
    }

    const token = url.searchParams.get('token');
    const user = verifyAuthToken(token);
    if (!user) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request, user);
    });
  });

  wss.on('connection', (ws, req, user) => {
    const uid = user.id;
    if (!clients.has(uid)) clients.set(uid, new Set());
    clients.get(uid).add(ws);

    ws.on('close', () => {
      const set = clients.get(uid);
      if (set) {
        set.delete(ws);
        if (set.size === 0) clients.delete(uid);
      }
    });

    ws.on('message', (msg) => {
      // For now, ignore client messages or implement ack handling
      try {
        const data = JSON.parse(msg.toString());
        // option to handle pings/acks later
      } catch (e) {
        // ignore non-json
      }
    });
  });

  return wss;
};

export const sendNotification = async (userId, payload) => {
  const set = clients.get(userId);
  if (!set) return false;
  const data = JSON.stringify({ type: 'notification', payload });
  for (const ws of set) {
    try {
      ws.send(data);
    } catch (e) {
      // ignore send errors
    }
  }
  return true;
};
