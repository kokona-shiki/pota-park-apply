import { Request, Response, NextFunction } from 'express';
import { verifyToken, checkUserPermission, findUserById } from '../utils/auth.js';

// 扩展 Request 接口，添加 user 属性
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        hasPotaImportPermission?: boolean;
        hasReviewPermission?: boolean;
      };
    }
  }
}

export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ code: 'UNAUTHORIZED', message: '缺少访问令牌', data: null });
  }

  try {
    const decoded = verifyToken(token);

    // 检查用户是否被封禁
    const user = await findUserById(decoded.id);
    if (!user || !user.is_active) {
      return res
        .status(401)
        .json({ code: 'UNAUTHORIZED', message: '用户不存在或已被封禁', data: null });
    }

    req.user = decoded;

    // 检查用户权限并附加到req.user
    req.user.hasPotaImportPermission = await checkUserPermission(decoded.id, 'pota_import');
    req.user.hasReviewPermission = await checkUserPermission(decoded.id, 'review_application');

    next();
  } catch (_error) {
    // token 无效/过期：应视为"未认证"，返回 401 以便前端触发 refresh-token 并重试
    return res.status(401).json({ code: 'UNAUTHORIZED', message: '无效或过期的令牌', data: null });
  }
};