import { verifyToken } from '../utils/auth.js';

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ code: 'UNAUTHORIZED', message: '缺少访问令牌', data: null });
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (_error) {
    // token 无效/过期：应视为“未认证”，返回 401 以便前端触发 refresh-token 并重试
    return res.status(401).json({ code: 'UNAUTHORIZED', message: '无效或过期的令牌', data: null });
  }
};
