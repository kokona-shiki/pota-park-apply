import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  createRefreshTokenForUser,
  generateAccessToken,
  findUserById,
  getUserPermissions,
  rotateRefreshToken,
  revokeAllRefreshTokensForUser
} from '../utils/auth.js';
import { authenticateToken } from '../middleware/authenticateToken.js';
import * as userService from '../services/userService.js';

const router = express.Router();

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

    // refreshToken：随机串 + 落库；请求时走 X-Refresh-Token Header
    const { refreshToken } = await createRefreshTokenForUser(user.id, {
      userAgent: req.get('user-agent') || null,
      ip: req.ip || null
    });

    res.json({
      success: true,
      message: '登录成功',
      accessToken,
      refreshToken,
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
    const refreshToken = req.get('X-Refresh-Token');

    if (!refreshToken) {
      return res.status(401).json({ error: '缺少刷新令牌' });
    }

    const result = await rotateRefreshToken(refreshToken, {
      userAgent: req.get('user-agent') || null,
      ip: req.ip || null
    });

    if (result.status === 'invalid' || result.status === 'expired') {
      return res.status(401).json({ error: '无效或过期的刷新令牌' });
    }

    if (result.status === 'user_disabled') {
      // 被封禁：吊销其所有 refresh token（强制登出只能做到“无法续期”，accessToken 仍会自然过期）
      await revokeAllRefreshTokensForUser(result.userId);
      return res.status(403).json({ error: '用户已被禁用' });
    }

    if (result.status === 'replay') {
      // 重放检测：吊销该用户所有 refresh token
      await revokeAllRefreshTokensForUser(result.userId);

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

    res.json({
      success: true,
      accessToken,
      refreshToken: result.refreshToken,
      user
    });
  } catch (error) {
    console.error('刷新 token 失败:', error);
    res.status(500).json({ error: '刷新 token 失败' });
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
