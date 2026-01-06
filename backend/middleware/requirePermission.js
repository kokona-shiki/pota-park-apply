import { checkUserPermission } from '../utils/auth.js';

export const requirePermission = (permission) => {
  return async (req, res, next) => {
    try {
      const hasPermission = await checkUserPermission(req.user.id, permission);

      if (!hasPermission) {
        return res.status(403).json({ error: '权限不足' });
      }

      next();
    } catch (_error) {
      return res.status(500).json({ error: '权限检查失败' });
    }
  };
};
