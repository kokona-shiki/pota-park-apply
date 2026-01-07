import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  createRefreshTokenForUser,
  generateAccessToken,
  findUserById,
  getUserPermissions,
  rotateRefreshToken,
  revokeAllRefreshTokensForUser,
  revokeRefreshToken
} from '../utils/auth.js';
import { authenticateToken } from '../middleware/authenticateToken.js';
import * as userService from '../services/userService.js';

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
    maxAge: REFRESH_COOKIE_MAX_AGE_MS
  });
};

const clearRefreshCookie = (req, res) => {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: Boolean(req.secure),
    path: '/api'
  });
};

// 鉴权相关接口更严格的限流
const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '请求过于频繁，请稍后再试' }
});

// 用户注册（注册成功后需要重新登录，不自动签发 token）
router.post('/api/register', authLimiter, async (req, res) => {
  try {
    const { email, callsign, password } = req.body;

    if (!email || !callsign || !password) {
      return res.status(400).json({ error: '邮箱、呼号和密码不能为空' });
    }

    const user = await userService.registerUser({ email, callsign, password });

    res.json({
      success: true,
      message: '注册成功，请登录',
      user
    });
  } catch (error) {
    console.error('注册失败:', error);
    res.status(400).json({ error: error.message });
  }
});

// 用户登录
router.post('/api/login', authLimiter, async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ error: '用户名/邮箱和密码不能为空' });
    }

    const user = await userService.loginUser(identifier, password);

    // accessToken：Authorization Header 传输（你指定前端存内存）
    const accessToken = generateAccessToken({
      id: user.id,
      email: user.email,
      role: user.role
    });

    // refreshToken：随机串 + 落库；通过 HttpOnly Cookie 返回给浏览器
    const { refreshToken } = await createRefreshTokenForUser(user.id, {
      userAgent: req.get('user-agent') || null,
      ip: req.ip || null
    });

    setRefreshCookie(req, res, refreshToken);

    res.json({
      success: true,
      message: '登录成功',
      accessToken,
      user
    });
  } catch (error) {
    console.error('登录失败:', error);

    // 仅 is_active=false 给明确提示，其余统一口径
    if (error.message === '用户已被禁用') {
      return res.status(403).json({ error: '用户已被禁用' });
    }

    res.status(400).json({ error: '用户不存在或密码错误' });
  }
});

// 刷新 token（refreshToken 重放检测 + rotation）
router.post('/api/refresh-token', authLimiter, async (req, res) => {
  try {
    const refreshToken = getCookie(req, REFRESH_COOKIE_NAME) || req.get('X-Refresh-Token');

    if (!refreshToken) {
      return res.status(401).json({ error: '缺少刷新令牌' });
    }

    const result = await rotateRefreshToken(refreshToken, {
      userAgent: req.get('user-agent') || null,
      ip: req.ip || null
    });

    if (result.status === 'invalid' || result.status === 'expired') {
      clearRefreshCookie(req, res);
      return res.status(401).json({ error: '无效或过期的刷新令牌' });
    }

    if (result.status === 'user_disabled') {
      // 被封禁：吊销其所有 refresh token（强制登出只能做到“无法续期”，accessToken 仍会自然过期）
      await revokeAllRefreshTokensForUser(result.userId);
      clearRefreshCookie(req, res);
      return res.status(403).json({ error: '用户已被禁用' });
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
          metadata: { familyId: result.familyId }
        });
      } catch (e) {
        console.warn('写入 refresh token 重放审计失败:', e?.message);
      }

      return res.status(403).json({ error: '检测到异常登录状态，请重新登录' });
    }

    // ok
    const user = result.user;
    const accessToken = generateAccessToken({
      id: user.id,
      email: user.email,
      role: user.role
    });

    // rotation：刷新成功后，下发新的 refresh token（HttpOnly Cookie）
    setRefreshCookie(req, res, result.refreshToken);

    res.json({
      success: true,
      accessToken,
      user
    });
  } catch (error) {
    console.error('刷新 token 失败:', error);
    res.status(500).json({ error: '刷新 token 失败' });
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
    res.json({ success: true });
  } catch (error) {
    console.error('退出登录失败:', error);
    // 即便失败，也清 cookie，避免前端卡住
    clearRefreshCookie(req, res);
    res.json({ success: true });
  }
});

// 获取当前用户信息
router.get('/api/user-info', authenticateToken, async (req, res) => {
  try {
    const user = await findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    res.json({ user });
  } catch (error) {
    console.error('获取用户信息失败:', error);
    res.status(500).json({ error: '获取用户信息失败' });
  }
});

// 获取用户权限
router.get('/api/user-permissions', authenticateToken, async (req, res) => {
  try {
    const permissions = await getUserPermissions(req.user.id);
    res.json({ permissions });
  } catch (error) {
    console.error('获取用户权限失败:', error);
    res.status(500).json({ error: '获取用户权限失败' });
  }
});

export default router;
