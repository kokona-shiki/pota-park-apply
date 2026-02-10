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
import { LoginRequestSchema, RegisterRequestSchema } from '../../shared/schemas/auth.js';
import { generateCaptcha, verifyCaptcha } from '../services/captchaService.js';
import * as emailVerificationService from '../services/emailVerificationService.js';

// 定义用户类型
type User = {
  id: number;
  email: string;
  callsign?: string;
  role: string;
  is_active: boolean;
  last_login?: Date | null;
  created_at: Date;
  updated_at: Date;
};

// 定义刷新令牌结果类型
type RefreshTokenResult = {
  status: 'valid' | 'invalid' | 'expired' | 'user_disabled' | 'replay';
  userId?: number;
  user?: User;
  refreshToken?: string;
  familyId?: string;
  absoluteExpiresAt?: Date;
};

const router = express.Router();

const REFRESH_COOKIE_NAME = 'pota_refresh_token';
const REFRESH_COOKIE_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;

const getCookie = (req: express.Request, name: string) => {
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

const setRefreshCookie = (req: express.Request, res: express.Response, refreshToken: string) => {
  // secure: 依赖 req.secure（已在 app.ts 设置 trust proxy）
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: Boolean(req.secure),
    path: '/api',
    maxAge: REFRESH_COOKIE_MAX_AGE_MS,
  });
};

const clearRefreshCookie = (res: express.Response) => {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: Boolean(res.req?.secure),
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

// 发送验证码限流（更严格）
const sendCodeLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { code: 'RATE_LIMITED', message: '发送验证码过于频繁，请稍后再试', data: null },
});

// 生成图形验证码
router.get('/api/captcha', (req, res) => {
  const captcha = generateCaptcha();
  res.type('svg');
  res.setHeader('X-Captcha-Id', captcha.id);
  res.send(captcha.svg);
});

// 发送邮箱验证码
router.post('/api/send-verification-email', sendCodeLimiter, async (req, res) => {
  try {
    const { email, captchaId, captchaCode } = req.body;

    if (!email || !captchaId || !captchaCode) {
      return sendBizError(res, 'VALIDATION_ERROR', '邮箱和验证码不能为空', null);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return sendBizError(res, 'INVALID_EMAIL', '邮箱格式不正确', null);
    }

    const isCaptchaValid = verifyCaptcha(captchaId, captchaCode);
    if (!isCaptchaValid) {
      return sendBizError(res, 'INVALID_CAPTCHA', '图形验证码错误或已过期', null);
    }

    const isCooldown = await emailVerificationService.checkSendCooldown(email);
    if (isCooldown) {
      const remaining = await emailVerificationService.getRemainingCooldown(email);
      return sendBizError(res, 'SEND_COOLDOWN', `请等待 ${remaining} 秒后再试`, null);
    }

    await emailVerificationService.createVerificationToken(email);

    return sendOk(res, null, '验证码已发送，请查收邮件');
  } catch (error) {
    console.error('发送验证码失败:', error);
    return sendError(res, error, { bizCode: 'SEND_CODE_FAILED', bizMessage: '发送验证码失败' });
  }
});

// 验证邮箱验证码
router.post('/api/verify-email-code', async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return sendBizError(res, 'VALIDATION_ERROR', '邮箱和验证码不能为空', null);
    }

    const isValid = await emailVerificationService.verifyEmailCode(email, code);

    if (!isValid) {
      await emailVerificationService.incrementAttempt(email);
      return sendBizError(res, 'INVALID_CODE', '验证码错误或已过期', null);
    }

    return sendOk(res, null, '邮箱验证成功');
  } catch (error) {
    console.error('验证邮箱失败:', error);
    return sendError(res, error, { bizCode: 'VERIFY_EMAIL_FAILED', bizMessage: '验证邮箱失败' });
  }
});

// 用户注册（注册成功后需要重新登录，不自动签发 token）
router.post('/api/register', authLimiter, async (req, res) => {
  try {
    const parsed = RegisterRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendBizError(res, 'VALIDATION_ERROR', '邮箱、呼号和密码不能为空', null);
    }
    const { email, callsign, password, verificationCode } = parsed.data;

    const isEmailVerified = await emailVerificationService.verifyEmailCode(email, verificationCode);
    if (!isEmailVerified) {
      await emailVerificationService.incrementAttempt(email);
      return sendBizError(res, 'EMAIL_NOT_VERIFIED', '邮箱验证码错误或已过期', null);
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
    const parsed = LoginRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendBizError(res, 'VALIDATION_ERROR', '用户名/邮箱和密码不能为空', null);
    }
    const { identifier, password } = parsed.data;

    const user = await userService.loginUser(identifier, password);

    // accessToken：Authorization Header 传输（你指定前端存内存）
    const accessToken = generateAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
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
  } catch (error: unknown) {
    console.error('登录失败:', error);

    // 仅 is_active=false 给明确提示
    if ((error as Error)?.message === '用户已被禁用') {
      return sendHttpError(res, 403, 'FORBIDDEN', '用户已被禁用', null);
    }

    // 其余统一口径（业务错误：HTTP 200）
    return sendBizError(res, 'INVALID_CREDENTIALS', '用户不存在或密码错误', null);
  }
});

// 处理刷新令牌结果
const handleRefreshTokenResult = async (req: express.Request, res: express.Response, result: RefreshTokenResult) => {
  if (result.status === 'invalid' || result.status === 'expired') {
    clearRefreshCookie(res);
    return sendHttpError(res, 401, 'UNAUTHORIZED', '无效或过期的刷新令牌', null);
  }

  if (result.status === 'user_disabled') {
    // 被封禁：吊销其所有 refresh token
    await revokeAllRefreshTokensForUser(result.userId);
    clearRefreshCookie(res);
    return sendHttpError(res, 403, 'FORBIDDEN', '用户已被禁用', null);
  }

  if (result.status === 'replay') {
    // 重放检测：吊销该用户所有 refresh token
    await revokeAllRefreshTokensForUser(result.userId);
    clearRefreshCookie(res);

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
      console.warn('写入 refresh token 重放审计失败:', (e as Error)?.message);
    }

    return sendHttpError(res, 403, 'SESSION_INVALID', '检测到异常登录状态，请重新登录', null);
  }

  // 处理成功的情况
  const user = result.user;
  const accessToken = generateAccessToken({
    id: user.id,
    email: user.email,
    role: user.role,
  });

  // rotation：刷新成功后，下发新的 refresh token（HttpOnly Cookie）
  setRefreshCookie(req, res, result.refreshToken);

  // 获取用户权限
  const permissions = await getUserPermissions(user.id);
  const userWithPermissions = {
    ...user,
    permissions: permissions.map((p: { permission_code: string }) => p.permission_code),
  };

  return sendOk(res, { accessToken, user: userWithPermissions }, 'ok');
};

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

    return await handleRefreshTokenResult(req, res, result as unknown as RefreshTokenResult);
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
        console.warn('吊销 refresh token 失败（忽略）:', (e as Error)?.message);
      }
    }

    clearRefreshCookie(res);
    return sendOk(res, null, 'ok');
  } catch (error) {
    console.error('退出登录失败:', error);
    // 即便失败，也清 cookie，避免前端卡住
    clearRefreshCookie(res);
    return sendOk(res, null, 'ok');
  }
});

// 获取当前用户信息
router.get('/api/user-info', authenticateToken, async (req, res) => {
  try {
    const user = await findUserById(req.user?.id);
    if (!user) {
      return sendBizError(res, 'NOT_FOUND', '用户不存在', null);
    }

    // 获取用户权限
    const permissions = await getUserPermissions(user.id);
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
    const permissions = await getUserPermissions(req.user?.id);
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
    const permissions = await getUserPermissions(req.user?.id);
    const hasPermission = permissions.some((p) => p.permission_code === permissionCode);
    return res.json({ hasPermission });
  } catch (error) {
    console.error('权限检查失败:', error);
    return res.status(500).json({ hasPermission: false });
  }
});

export default router;
