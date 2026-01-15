import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  createRefreshTokenForUser,
  generateAccessToken,
  findUserById,
  getUserPermissions,
  rotateRefreshToken,
  revokeAllRefreshTokensForUser,
  revokeRefreshToken,
} from '../utils/auth.js';
import { authenticateToken } from '../middleware/authenticateToken.js';
import * as userService from '../services/userService.js';
import { sendBizError, sendError, sendHttpError, sendOk } from '../utils/response.js';

const router = express.Router();

const REFRESH_COOKIE_NAME = 'pota_refresh_token';
const REFRESH_COOKIE_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;

const getCookie = (req, name) => {
  const cookieHeader = req?.headers?.cookie;
  if (!cookieHeader) return null;

  const parts = String(cookieHeader)
    .split(';')
    .map((s) => s.trim());

  for (const part of parts) {
    const [k, ...rest] = part.split('=');
    if (k === name) {
      return decodeURIComponent(rest.join('='));
    }
  }

  return null;
};

const setRefreshCookie = (req, res, refreshToken) => {
  // secure: 依赖 req.secure（已在 app.js 设置 trust proxy）
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: Boolean(req.secure),
    path: '/api',
    maxAge: REFRESH_COOKIE_MAX_AGE_MS,
  });
};

const clearRefreshCookie = (req, res) => {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: Boolean(req.secure),
    path: '/api',
  });
};

// 鉴权相关接口更严格的限流
const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { code: 'RATE_LIMITED', message: '请求过于频繁，请稍后再试', data: null },
});

// 用户注册（注册成功后需要重新登录，不自动签发 token）
router.post('/api/register', authLimiter, async (req, res) => {
  try {
    const { email, callsign, password } = req.body;

    if (!email || !callsign || !password) {
      return sendBizError(res, 'VALIDATION_ERROR', '邮箱、呼号和密码不能为空', null);
    }

    const user = await userService.registerUser({ email, callsign, password });

    return sendOk(res, { user }, '注册成功，请登录');
  } catch (error) {
    console.error('注册失败:', error);
    return sendError(res, error, { bizCode: 'REGISTER_FAILED', bizMessage: '注册失败' });
  }
});

// 用户登录
router.post('/api/login', authLimiter, async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return sendBizError(res, 'VALIDATION_ERROR', '用户名/邮箱和密码不能为空', null);
    }

    const user = await userService.loginUser(identifier, password);

    // accessToken：Authorization Header 传输（你指定前端存内存）
    const accessToken = generateAccessToken({
      id: user.id,
      email: user.email,
    });

    // refreshToken：随机串 + 落库；通过 HttpOnly Cookie 返回给浏览器
    const { refreshToken } = await createRefreshTokenForUser(user.id, {
      userAgent: req.get('user-agent') || null,
      ip: req.ip || null,
    });

    setRefreshCookie(req, res, refreshToken);

    // 获取用户权限
    const permissions = await getUserPermissions(user.id);
    const userWithPermissions = {
      ...user,
      permissions: permissions.map((p) => p.permission_code),
    };

    return sendOk(res, { accessToken, user: userWithPermissions }, '登录成功');
  } catch (error) {
    console.error('登录失败:', error);

    // 仅 is_active=false 给明确提示
    if (error?.message === '用户已被禁用') {
      return sendHttpError(res, 403, 'FORBIDDEN', '用户已被禁用', null);
    }

    // 其余统一口径（业务错误：HTTP 200）
    return sendBizError(res, 'INVALID_CREDENTIALS', '用户不存在或密码错误', null);
  }
});

// 刷新 token（refreshToken 重放检测 + rotation）
router.post('/api/refresh-token', authLimiter, async (req, res) => {
  try {
    if (process.env.NODE_ENV !== 'production') {
      const tabId = req.get('X-Tab-Id') || null;
      console.log('[refresh-token]', { tabId, ip: req.ip });
    }

    const refreshToken = getCookie(req, REFRESH_COOKIE_NAME) || req.get('X-Refresh-Token');

    if (!refreshToken) {
      return sendHttpError(res, 401, 'UNAUTHORIZED', '缺少刷新令牌', null);
    }

    const result = await rotateRefreshToken(refreshToken, {
      userAgent: req.get('user-agent') || null,
      ip: req.ip || null,
    });

    if (result.status === 'invalid' || result.status === 'expired') {
      clearRefreshCookie(req, res);
      return sendHttpError(res, 401, 'UNAUTHORIZED', '无效或过期的刷新令牌', null);
    }

    if (result.status === 'user_disabled') {
      // 被封禁：吊销其所有 refresh token（强制登出只能做到“无法续期”，accessToken 仍会自然过期）
      await revokeAllRefreshTokensForUser(result.userId);
      clearRefreshCookie(req, res);
      return sendHttpError(res, 403, 'FORBIDDEN', '用户已被禁用', null);
    }

    if (result.status === 'replay') {
      // 重放检测：吊销该用户所有 refresh token
      await revokeAllRefreshTokensForUser(result.userId);
      clearRefreshCookie(req, res);

      // 记录审计日志（不强依赖；失败不影响主流程）
      try {
        await userService.logUserAdminAudit({
          action: 'refresh_token_reuse_detected',
          operatorId: null,
          targetUserId: result.userId,
          reason: null,
          metadata: { familyId: result.familyId },
        });
      } catch (e) {
        console.warn('写入 refresh token 重放审计失败:', e?.message);
      }

      return sendHttpError(res, 403, 'SESSION_INVALID', '检测到异常登录状态，请重新登录', null);
    }

    // ok
    const user = result.user;
    const accessToken = generateAccessToken({
      id: user.id,
      email: user.email,
    });

    // rotation：刷新成功后，下发新的 refresh token（HttpOnly Cookie）
    setRefreshCookie(req, res, result.refreshToken);

    // 获取用户权限
    const permissions = await getUserPermissions(user.id);
    const userWithPermissions = {
      ...user,
      permissions: permissions.map((p) => p.permission_code),
    };

    return sendOk(res, { accessToken, user: userWithPermissions }, 'ok');
  } catch (error) {
    console.error('刷新 token 失败:', error);
    return sendError(res, error, { httpMessage: '刷新 token 失败' });
  }
});

// 用户退出登录：清除 refresh cookie，并尽可能吊销该 refresh token
router.post('/api/logout', async (req, res) => {
  try {
    const refreshToken = getCookie(req, REFRESH_COOKIE_NAME) || req.get('X-Refresh-Token');
    if (refreshToken) {
      try {
        await revokeRefreshToken(refreshToken);
      } catch (e) {
        console.warn('吊销 refresh token 失败（忽略）:', e?.message);
      }
    }

    clearRefreshCookie(req, res);
    return sendOk(res, null, 'ok');
  } catch (error) {
    console.error('退出登录失败:', error);
    // 即便失败，也清 cookie，避免前端卡住
    clearRefreshCookie(req, res);
    return sendOk(res, null, 'ok');
  }
});

// 获取当前用户信息
router.get('/api/user-info', authenticateToken, async (req, res) => {
  try {
    const user = await findUserById(req.user.id);
    if (!user) {
      return sendBizError(res, 'NOT_FOUND', '用户不存在', null);
    }

    // 获取用户权限
    const permissions = await getUserPermissions(req.user.id);
    const userWithPermissions = {
      ...user,
      permissions: permissions.map((p) => p.permission_code),
    };

    return sendOk(res, { user: userWithPermissions }, 'ok');
  } catch (error) {
    console.error('获取用户信息失败:', error);
    return sendError(res, error, { httpMessage: '获取用户信息失败' });
  }
});

// 获取用户权限
router.get('/api/user-permissions', authenticateToken, async (req, res) => {
  try {
    const permissions = await getUserPermissions(req.user.id);
    return sendOk(res, { permissions }, 'ok');
  } catch (error) {
    console.error('获取用户权限失败:', error);
    return sendError(res, error, { httpMessage: '获取用户权限失败' });
  }
});

// 检查特定权限
router.get('/api/check-permission/:permissionCode', authenticateToken, async (req, res) => {
  try {
    const permissionCode = req.params.permissionCode;
    const permissions = await getUserPermissions(req.user.id);
    const hasPermission = permissions.some(p => p.permission_code === permissionCode);
    return res.json({ hasPermission });
  } catch (error) {
    console.error('权限检查失败:', error);
    return res.status(500).json({ hasPermission: false });
  }
});

export default router;
