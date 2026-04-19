import crypto from 'crypto';

const AUTH_SECRET = process.env.AUTH_SECRET || 'dev_secret_change_me';
const TOKEN_EXPIRATION_MS = 1000 * 60 * 60 * 24; // 24 jam

const base64url = (value) =>
  Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

const safeCompare = (a, b) => {
  const buffA = Buffer.from(a);
  const buffB = Buffer.from(b);
  if (buffA.length !== buffB.length) {
    return false;
  }
  return crypto.timingSafeEqual(buffA, buffB);
};

const sign = (payload) =>
  crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest('base64url');

export const createAuthToken = ({ id, role, department }) => {
  const payload = {
    id,
    role,
    department,
    exp: Date.now() + TOKEN_EXPIRATION_MS,
  };
  const encoded = base64url(JSON.stringify(payload));
  const signature = sign(encoded);
  return `${encoded}.${signature}`;
};

export const verifyAuthToken = (token) => {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, signature] = parts;
  const expected = sign(encoded);
  if (!safeCompare(signature, expected)) return null;

  let payload;
  try {
    payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  } catch (err) {
    return null;
  }

  if (!payload || typeof payload !== 'object' || !payload.exp || payload.exp < Date.now()) {
    return null;
  }

  return {
    id: payload.id,
    role: payload.role,
    department: payload.department,
  };
};

export const requireAuth = (req, res, next) => {
  const header = req.headers.authorization || '';
  const [type, token] = header.split(' ');
  if (type !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Authentication required.' });
  }
  const user = verifyAuthToken(token);
  if (!user) {
    return res.status(401).json({ message: 'Token tidak valid atau kedaluwarsa.' });
  }
  req.user = user;
  return next();
};
