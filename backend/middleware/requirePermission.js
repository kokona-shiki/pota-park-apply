import { checkUserPermission } from '../utils/auth.js';

export const requirePermission = (permission) => {
  return async (req, res, next) => {
    try {
      const hasPermission = await checkUserPermission(req.user.id, permission);

      if (!hasPermission) {
        return res.status(403).json({ code: 'FORBIDDEN', message: '权限不足', data: null });
      }

      next();
    } catch (_error) {
      return res.status(500).json({ code: 'SERVER_ERROR', message: '权限检查失败', data: null });
    }
  };
};
