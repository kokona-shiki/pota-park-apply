import { Request, Response, NextFunction } from 'express';
import { checkUserPermission } from '../utils/auth.js';

export const requirePermission = (permission: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ code: 'UNAUTHORIZED', message: '未认证', data: null });
      }

      const hasPermission = await checkUserPermission(req.user.id, permission);

      if (!hasPermission) {
        return res.status(403).json({ code: 'FORBIDDEN', message: '权限不足', data: null });
      }

      next();
    } catch {
      return res.status(500).json({ code: 'SERVER_ERROR', message: '权限检查失败', data: null });
    }
  };
};