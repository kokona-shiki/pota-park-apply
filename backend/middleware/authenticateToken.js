import { verifyToken } from '../utils/auth.js';

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: '缺少访问令牌' });
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (_error) {
    return res.status(403).json({ error: '无效或过期的令牌' });
  }
};
